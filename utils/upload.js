import multer from "multer";
import path from "path";
import fs from "fs";

const requestsDir = path.join(process.cwd(), "uploads", "requests");
fs.mkdirSync(requestsDir, { recursive: true });

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
