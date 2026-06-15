import dotenv from "dotenv";
dotenv.config({ override: true });

import path from 'path';
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
// import medicalRouter from "./routes/medical.routes.js";

import authRouter from "./routes/auth.routes.js";
import profileRouter from "./routes/profile.routes.js";
import statementRouter from "./routes/statement.routes.js";
import holidayRouter from "./routes/holiday.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import medicalRouter from "./routes/medical.routes.js";
<<<<<<< HEAD

import paymentRoutes from './routes/paymentRoutes.js';

import punishmentRouter from "./routes/punishment.routes.js";


=======


import paymentRoutes from './routes/paymentRoutes.js';




import punishmentRouter from "./routes/punishment.routes.js";
import excuseRouter from "./routes/excuse.routes.js";
import relativesRouter from "./routes/relative.routes.js";
import messagesRouter from "./routes/message.routes.js";





>>>>>>> 2458ad59ce28552df113dbdd9939645efa9dfdf0
console.log("medicalRouter type", typeof medicalRouter);
console.log("medicalRouter keys", Object.keys(medicalRouter));
console.log("excuseRouter type", typeof excuseRouter);
console.log("excuseRouter keys", excuseRouter ? Object.keys(excuseRouter) : []);



const app = express();

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       const isLocalhost =
//         !origin ||
//         /^http:\/\/localhost:\d+$/.test(origin) ||
//         /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

//       if (isLocalhost) {
//         callback(null, true);
//         return;
//       }

//       callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//   }),
// );

app.use(cors({origin: '*'}));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/statement", statementRouter);
<<<<<<< HEAD
// <<<<<<< HEAD

// =======
// <<<<<<< HEAD
app.use("/api/booking", bookingRouter);
// =======
// >>>>>>> 124c00fc845d2123488a4c6277e596be149a125d
=======
app.use("/api/booking", bookingRouter);
>>>>>>> 2458ad59ce28552df113dbdd9939645efa9dfdf0
app.use("/api/medical", medicalRouter);
app.use("/api/punishments", punishmentRouter);
app.use("/api/excuses", excuseRouter);
console.log("Mounted medical router at /api/medical");
<<<<<<< HEAD
// >>>>>>> 66c2e72d5e784da99439e865a47dddf9c82ace62
=======
console.log("Mounted excuse router at /api/excuses");


app.use("/api/holiday", holidayRouter);
console.log("Mounted holiday router at /api/holiday");

app.use("/api/relatives", relativesRouter);
console.log("Mounted relatives router at /api/relatives");
app.use("/api/relatives", relativesRouter);
console.log("Mounted relatives router at /api/relatives");

>>>>>>> 2458ad59ce28552df113dbdd9939645efa9dfdf0

app.use('/api/payments', paymentRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// المسار الرئيسي للتأكد من عمل الـ API

app.get("/", (req, res) => {
  res.json({
    message: "Digilians API",
    status: "running",
    version: "1.0.0",
  });
});

// Debug: list registered routes (safe endpoint)
app.get('/_debug/routes', (req, res) => {
  try {
    if (!app._router || !app._router.stack) return res.json({ routes: [] });
    const routes = [];
    app._router.stack.forEach((mw) => {
      if (mw.route && mw.route.path) routes.push(mw.route.path);
      else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
        mw.handle.stack.forEach((r) => r.route && routes.push(r.route.path));
      }
    });
    return res.json({ routes });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// التعامل مع المسارات غير الموجودة (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

const PORT = process.env.PORT || 3000;
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
console.log(`ðŸ"Œ Connecting to ${connectionTarget}`);

connectDB(MONGO_URI).then(() => {

  const listRoutes = () => {
    try {
      if (!app._router || !app._router.stack) {
        console.log('No routes registered yet');
        return;
      }

      const routes = [];
      app._router.stack.forEach((mw) => {
        if (mw.route && mw.route.path) routes.push(mw.route.path);
        else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
          mw.handle.stack.forEach((r) => r.route && routes.push(r.route.path));
        }
      });
      console.log('Registered routes:', routes);
    } catch (err) {
      console.error('Error listing routes', err);
    }
  };

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);

    console.log(`âœ… Server running on http://localhost:${PORT}`);
    listRoutes();
  });
});