import express from "express";
import cityRouter from "./city.ts";
import weatherRouter from "./weather.ts";
import sessionRouter from "./session.ts";

export default function route(app: express.Express) {
  app.use("/city", cityRouter);
  app.use("/weather", weatherRouter);
  app.use("/session", sessionRouter);
}