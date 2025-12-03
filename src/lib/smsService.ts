import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { config } from "../common/config";
import { CustomAxiosResponse } from "../common/interfaces/interface";
import { ResData } from "./resData";
import { getCountryCode, isUzbekistanNumber, formatPhoneNumber } from "../common/config/phone-countries";

@Injectable()
export class SmsService {
  private readonly apiUrl = config.smsApiUrl;
  private token: string;

  constructor(private readonly configService: ConfigService) { }

  private async authenticate(): Promise<void> {
    try {
      const email = this.configService.get<string>("SMS_EMAIL");
      const password = this.configService.get<string>("SMS_PASSWORD");

      const response: CustomAxiosResponse = await axios.post(
        `${this.apiUrl}/auth/login`,
        { email, password },
      );

      this.token = response.data.data.token;
    } catch (error) {
      console.error('[SMS Service] Authentication error:', error.message);
      throw new HttpException(
        "Error authenticating with Eskiz",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    await this.ensureAuthenticated();

    // Telefon raqamini tekshirish - O'zbekistonmi yoki global
    const isLocal = isUzbekistanNumber(phoneNumber);
    const endpoint = isLocal
      ? '/message/sms/send'           // Mahalliy O'zbekiston
      : '/message/sms/send-global';   // Global (xorijiy)

    try {
      let payload: any;

      if (isLocal) {
        // O'zbekiston uchun - eski API
        payload = {
          mobile_phone: phoneNumber,
          message: message,
          from: "4546"
        };
      } else {
        // Xorijiy raqamlar uchun - global API
        const countryCode = getCountryCode(phoneNumber);

        if (!countryCode) {
          throw new HttpException(
            'Unsupported country code',
            HttpStatus.BAD_REQUEST
          );
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        payload = {
          mobile_phone: formattedPhone,
          message: message,
          country_code: countryCode,
          unicode: "1"  // Kirill harflar uchun
        };
      }

      const response: CustomAxiosResponse = await axios.post(
        `${this.apiUrl}${endpoint}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

    } catch (error) {
      console.error('[SMS Service] Error sending SMS:', error.message);
      if (error.response && error.response.status === 401) {
        await this.authenticate();
        await this.sendSMS(phoneNumber, message);
      } else {
        throw new HttpException(
          "Error sending SMS",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
