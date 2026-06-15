import multer from "multer";
import path from "path";
import fs from "fs";

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const requestsDir = isVercel 
  ? path.join("/tmp", "uploads", "requests")
  : path.join(process.cwd(), "uploads", "requests");

if (!fs.existsSync(requestsDir)) {
  fs.mkdirSync(requestsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, requestsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

export default upload;
