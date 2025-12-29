import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { paymentMiddleware } from "@x402/express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import route from "./routes/index.ts";

dotenv.config();

const PORT = 5000;
const app = express();
const RECEIVER_ADDRESS = privateKeyToAccount(process.env.RECEIVER_PRIVATE_KEY! as Hex).address;
const NETWORK = "eip155:11155111";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "http://localhost:3636",
});
const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(
  paymentMiddleware(
    {
      "GET /weather/current": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: NETWORK,
            payTo: RECEIVER_ADDRESS,
          },
        ],
        description: "Get real-time weather snapshot for a specific city",
        mimeType: "application/json",
      },
      "GET /weather/forecast": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.005",
            network: NETWORK,
            payTo: RECEIVER_ADDRESS,
          },
        ],
        description: "Get 3-day predictive weather forecast for a specific city",
        mimeType: "application/json",
      },
    },
    server
  )
);

route(app);

app.listen(PORT, () => {
  console.log(`Service app listening on port ${PORT}`);
});