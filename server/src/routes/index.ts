import express from "express";
import cityRouter from "./city.ts";
import weatherRouter from "./weather.ts";

export default function route(app: express.Express) {
  app.use("/city", cityRouter);
  app.use("/weather", weatherRouter);
}