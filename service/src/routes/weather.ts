import express from "express";
import { weatherController } from "../controllers/WeatherController.ts";

const router = express.Router();

// [GET] /weather/current?id=
router.get("/current", weatherController.getCurrentWeather);

// [GET] /weather/forecast?id=
router.get("/forecast", weatherController.getForecastWeather);

export default router;
