import { encode } from "base-64";
import { config } from "src/common/config";

export const buildPaymeApi = (
  userId: number,
  orderId: number,
  price: number,
  callBackurl: string
) => {
  const amountBigInt = BigInt(price) * BigInt(100);
  const amountString = amountBigInt.toString();
  const accountString = `m=${config.paymeMerchantId
    };ac.user_id=${userId};ac.order_id=${orderId};a=${amountString};c=${callBackurl}`;
  const account = encode(accountString);
  const finalUrl = `https://checkout.paycom.uz/${account}`;

  // Log qo'shish - muammoni topish uchun
  console.log("=== PAYME URL GENERATION DEBUG ===");
  console.log("Input price:", price, "(type:", typeof price, ")");
  console.log("Amount (BigInt):", amountBigInt.toString());
  console.log("Amount string:", amountString);
  console.log("Account string (before encode):", accountString);
  console.log("Account (encoded):", account);
  console.log("Final URL:", finalUrl);
  console.log("===================================");

  return finalUrl;
};
