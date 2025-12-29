import express from "express";
import payFetch from "../services/payFetch.ts";

const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL ?? "http://localhost:4000";

class WeatherController {
  async getCurrent(req: express.Request, res: express.Response) {
    try {
      const { id } = req.query;
      const data = await payFetch(`${SERVICE_BASE_URL}/weather/current?id=${id}`);
      res.status(200).json(data);
    } catch (error) {
      console.error("Failed to fetch current weather", error);
      res.status(500).json({ success: false, message: "Failed to fetch current weather" });
    }
  }

  async getForecast(req: express.Request, res: express.Response) {
    try {
      const { id } = req.query;
      const data = await payFetch(`${SERVICE_BASE_URL}/weather/forecast?id=${id}`);
      res.status(200).json(data);
    } catch (error) {
      console.error("Failed to fetch forecast", error);
      res.status(500).json({ success: false, message: "Failed to fetch forecast" });
    }
  }
}

export default new WeatherController();
