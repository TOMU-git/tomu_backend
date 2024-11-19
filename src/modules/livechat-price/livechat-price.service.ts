import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { UpdateLivechatPriceDto } from "./dto/update-livechat-price.dto";
import { LivechatPriceEntity } from "./entities/livechat-price.entity";
import { ResData } from "src/lib/resData";
import { ILiveChatPriceRepository } from "./interfaces/livechat-price-repository.interface";
import { ILiveChatPriceService } from "./interfaces/livechat-price-service.interface";

@Injectable()
export class LivechatPriceService implements ILiveChatPriceService {
  constructor(
    @Inject("ILiveChatPriceRepository")
    private readonly liveChatRepository: ILiveChatPriceRepository,
  ) { }
  
  async findAll(): Promise<ResData<LivechatPriceEntity[]>> {
    const foundLiveChatPrice = await this.liveChatRepository.findAll();
    return new ResData<LivechatPriceEntity[]>("Found live chat price", 200, foundLiveChatPrice);
  }

  async findOneById(id: number): Promise<ResData<LivechatPriceEntity>> {
    const foundPrice = await this.liveChatRepository.getOneById(id);
    if (!foundPrice) {
      throw new HttpException(
        "Live chat price not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return new ResData<LivechatPriceEntity>("Live chat price", 200, foundPrice);
  }
  async update(
    id: number,
    updateLivechatPriceDto: UpdateLivechatPriceDto,
  ): Promise<ResData<LivechatPriceEntity>> {
    const { data: foundLiveChatPrice } = await this.findOneById(id);
    foundLiveChatPrice.price = updateLivechatPriceDto.price;
    const updatedPrice =
      await this.liveChatRepository.update(foundLiveChatPrice);
    return new ResData<LivechatPriceEntity>(
      "Live chat price updated successfully",
      200,
      updatedPrice,
    );
  }
}
