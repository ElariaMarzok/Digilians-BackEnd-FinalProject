import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRouter from "./routes/auth.routes.js";
import profileRouter from "./routes/profile.routes.js";
import statementRouter from "./routes/statement.routes.js";
import medicalRouter from "./routes/medical.routes.js";
import holidayRouter from "./routes/holiday.routes.js";

console.log("medicalRouter type", typeof medicalRouter);
console.log("medicalRouter keys", Object.keys(medicalRouter));

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalhost =
        !origin ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      if (isLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/statement", statementRouter);
app.use("/api/medical", medicalRouter);
console.log("Mounted medical router at /api/medical");

app.use("/api/holiday", holidayRouter);
console.log("Mounted holiday router at /api/holiday");

app.get("/", (req, res) => {
  res.json({
    message: "Digilians API",
    status: "running",
    version: "1.0.0",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

const PORT = process.env.PORT || 5000;
const envMongoUri = process.env.MONGO_URI;
const isDefaultPlaceholder =
  envMongoUri && envMongoUri.includes("USERNAME:PASSWORD");

const ensureDigiliansDb = (uri) => {
  if (!uri || uri.includes("127.0.0.1") || uri.includes("localhost")) {
    return uri;
  }

  if (/\/[^/?]+(\?|$)/.test(uri)) {
    return uri;
  }

  const separator = uri.includes("?") ? "&" : "?";
  return uri.endsWith("/")
    ? `${uri}digilians`
    : `${uri}/digilians`;
};

const MONGO_URI = ensureDigiliansDb(
  envMongoUri && !isDefaultPlaceholder
    ? envMongoUri
    : "mongodb://127.0.0.1:27017/digilians",
);

if (!envMongoUri || isDefaultPlaceholder) {
  console.warn(
    "Warning: MONGO_URI is not configured or still using the placeholder. Falling back to local MongoDB at mongodb://127.0.0.1:27017/digilians",
  );
}

const connectionTarget = MONGO_URI.includes("127.0.0.1")
  ? "local MongoDB"
  : "remote MongoDB";
console.log(`📌 Connecting to ${connectionTarget}`);

connectDB(MONGO_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
});
