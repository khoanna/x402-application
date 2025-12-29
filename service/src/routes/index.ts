import express from "express";
import chatRouter from "./chat.ts";

export default function route(app: express.Express) {
  // [/chat]
  app.use("/chat", chatRouter);
}