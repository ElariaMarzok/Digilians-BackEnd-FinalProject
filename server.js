import dotenv from "dotenv";
dotenv.config();

import express from "express";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(express.json());


app.use("/api/auth", authRouter);


app.get("/", (req, res) => {
    res.json({ message: "Digilians API", status: "running", version: "1.0.0" });
});


app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

connectDB(MONGO_URI).then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
});