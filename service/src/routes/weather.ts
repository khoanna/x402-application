import express from "express";
import { weatherController } from "../controllers/WeatherController.ts";

const router = express.Router();

// [GET] /weather/current
router.get("/current/:id", weatherController.getCurrentWeather);

// [GET] /weather/forecast
router.get("/forecast/:id", weatherController.getForecastWeather);

export default router;
