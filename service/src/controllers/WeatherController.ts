import express from "express";
import { mockWeatherData } from "../data/mock.ts";

class WeatherController {
  
  // GET /weather/current/:id
  async getCurrentWeather(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const cityData = mockWeatherData.find((item) => item.id === id);

    if (!cityData) {
      res.status(404).json({ success: false, message: "City not found" });
      return;
    }

    res.status(200).json({
      success: true,
      city: cityData.location.city,
      country: cityData.location.country,
      current: cityData.current,
    });
  }

  // GET /weather/forecast/:id
  async getForecastWeather(req: express.Request, res: express.Response) {
    const { id } = req.params;
    const cityData = mockWeatherData.find((item) => item.id === id);

    if (!cityData) {
      res.status(404).json({ success: false, message: "City not found" });
      return;
    }

    res.status(200).json({
      success: true,
      city: cityData.location.city,
      country: cityData.location.country,
      forecast: cityData.forecast,
    });
  }
}

export const weatherController = new WeatherController();