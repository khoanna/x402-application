import express from "express";
import cityController  from "../controllers/CityController.ts";
const router = express.Router();


router.get("/list", cityController.getCities);
export default router;