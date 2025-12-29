import express from "express";
import chatController  from "../controllers/ChatController.ts";
const router = express.Router();

// [GET] /chat/list
router.get("/list", chatController.getChats);

export default router;