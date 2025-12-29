import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const PORT = 4000;
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

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
