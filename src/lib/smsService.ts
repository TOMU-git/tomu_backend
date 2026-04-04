import { Injectable, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { config } from "../common/config";
import { CustomAxiosResponse } from "../common/interfaces/interface";
import { getCountryCode, isUzbekistanNumber, formatPhoneNumber } from "../common/config/phone-countries";
import { ISmsLogService } from "src/modules/sms-log/interfaces/sms-log.service";

@Injectable()
export class SmsService {
  private readonly apiUrl = config.smsApiUrl;
  private token: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject("ISmsLogService") private readonly smsLogService: ISmsLogService,
  ) { }

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

  async sendSMS(phoneNumber: string, message: string, type: string = "otp"): Promise<void> {
    await this.ensureAuthenticated();

    const isLocal = isUzbekistanNumber(phoneNumber);
    const endpoint = isLocal
      ? '/message/sms/send'
      : '/message/sms/send-global';

    try {
      let payload: any;

      if (isLocal) {
        payload = {
          mobile_phone: phoneNumber,
          message: message,
          from: "4546"
        };
      } else {
        const countryCode = getCountryCode(phoneNumber);

        if (!countryCode) {
          await this.smsLogService.log({
            phone: phoneNumber,
            type,
            status: "failed",
            errorMessage: "Unsupported country code",
            isLocal,
          });
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
          unicode: "1"
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

      const result = response.data;
      const messageId = result?.data?.id || result?.id;
      const eskizStatus = result?.data?.status || result?.status;

      if (eskizStatus === "failed") {
        console.error("[SMS Service] Eskiz rejected SMS:", JSON.stringify(result));
        await this.smsLogService.log({
          phone: phoneNumber,
          type,
          status: "failed",
          eskizMessageId: String(messageId ?? ""),
          errorMessage: `Eskiz status: ${eskizStatus}`,
          isLocal,
        });
        throw new HttpException("SMS delivery failed", HttpStatus.BAD_GATEWAY);
      }

      await this.smsLogService.log({
        phone: phoneNumber,
        type,
        status: "sent",
        eskizMessageId: String(messageId ?? ""),
        isLocal,
      });

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[SMS Service] Error sending SMS:', error.message);

      if (error.response && error.response.status === 401) {
        await this.smsLogService.log({
          phone: phoneNumber,
          type,
          status: "auth-error",
          errorMessage: "Token expired, re-authenticating",
          isLocal,
        });
        await this.authenticate();
        await this.sendSMS(phoneNumber, message, type);
      } else {
        await this.smsLogService.log({
          phone: phoneNumber,
          type,
          status: "failed",
          errorMessage: error.message,
          isLocal,
        });
        throw new HttpException(
          "Error sending SMS",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
