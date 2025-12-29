import express from 'express';
import cityController from '../controllers/CityController.ts';

const router = express.Router();

// [GET] /city/list
router.get('/list', cityController.getListCity);

export default router;