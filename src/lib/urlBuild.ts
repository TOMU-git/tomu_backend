import { encode } from "base-64";
import { config } from "src/common/config";

export const buildPaymeApi = (
  userId: number,
  orderId: number,
  price: number,
  callBackurl: string
) => {
  const account = encode(
    `m=${
      config.paymeMerchantId
    };ac.user_id=${userId};ac.order_id=${orderId};a=${BigInt(price) * BigInt(100)};c=${callBackurl}`,
  );

  return `https://checkout.paycom.uz/${account}`;
};
