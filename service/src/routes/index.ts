import express from "express";
import cityRouter from "./city.ts";
import weatherRouter from "./weather.ts";

export default function route(app: express.Express) {
    // [/city]
    app.use("/city", cityRouter);

    // [/weather]
    app.use("/weather", weatherRouter);
}