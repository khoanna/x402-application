import express from "express";
import cityRouter from "./city.ts";

export default function route(app: express.Express) {
  // [/city]
  app.use("/city", cityRouter);
}