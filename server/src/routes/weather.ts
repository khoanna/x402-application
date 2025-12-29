import express from "express";
import weatherController from "../controllers/WeatherController.ts";

const router = express.Router();

router.get("/current", weatherController.getCurrent);
router.get("/forecast", weatherController.getForecast);

export default router;
