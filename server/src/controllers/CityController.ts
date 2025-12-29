import express from "express";

class CityController {
    async getCities(req: express.Request, res: express.Response) {
        res.send("List of cities");
    }
}

export default new CityController();