import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.BUYER_PRIVATE_KEY) {
  throw new Error(
    "❌ BUYER_PRIVATE_KEY environment variable is required.\n" +
    "Please set it in your .env file. You can copy .env.example to .env and add your private key."
  );
}

const signer = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
registerExactEvmScheme(client, { signer });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

export default async function payFetch(url: string) {
  try {
    // console.log(`\n💳 payFetch: Fetching ${url} with payment handling`);
    const response = await fetchWithPayment(url, {
      method: "GET",
    });
    
    if (response.ok) {
      // Debug: Log response headers for inspection
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      
      if (Object.keys(headers).length > 0) {
        console.log("📋 Response Headers:", headers);
      }
      
      const httpClient = new x402HTTPClient(client);
      try {
        const paymentResponse = httpClient.getPaymentSettleResponse((name) => response.headers.get(name));
        console.log("💰 Payment settled:", paymentResponse);
      } catch (headerError) {
        console.log(headerError);
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error in payFetch:", error);
    throw error;
  }
}
