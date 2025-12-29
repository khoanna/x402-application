import express from "express";

class ChatController {
    async getChats(req: express.Request, res: express.Response) {
        res.send("List of chats");
    }
}

export default new ChatController();