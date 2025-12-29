import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import route from "./routes/index.ts";

dotenv.config();

const PORT = 3001;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

route(app);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
