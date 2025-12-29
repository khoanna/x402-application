import express from "express";

const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL ?? "http://localhost:4000";

class CityController {
    async getCities(req: express.Request, res: express.Response) {
        try {
            const response = await fetch(`${SERVICE_BASE_URL}/city/list`);
            const data = await response.json();
            res.status(response.status).json(data);
        } catch (error) {
            console.error("Failed to fetch city list", error);
            res.status(500).json({ success: false, message: "Failed to fetch city list" });
        }
    }
}

export default new CityController();