import express from "express";
import { mockWeatherData } from "../data/mock.ts";

class CityController {
  // GET /city/list
  async getListCity(req: express.Request, res: express.Response) {
    try {
      const cities = mockWeatherData.map((item) => ({
        id: item.id,
        ...item.location,
      }));

      res.status(200).json({
        success: true,
        count: cities.length,
        data: cities,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
}

export default new CityController();