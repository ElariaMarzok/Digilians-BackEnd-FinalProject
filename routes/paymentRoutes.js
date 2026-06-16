import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMiddleware, { adminOnlyMiddleware } from '../middlewares/auth.middlewares.js';
import {
  getMyPayments,
  uploadPaymentReceipt,
  uploadPaymentReceiptBase64,
  getAllPaymentsForAdmin,
  verifyStudentPayment
} from '../controllers/paymentController.js';

const router = express.Router();

// 📂 التأكد من أن مجلد الحفظ موجود عشان السيرفر ما يضربش
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const dir = isVercel 
  ? path.join('/tmp', 'uploads', 'receipts') 
  : path.join(process.cwd(), 'uploads', 'receipts');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  }
});

// 🔍 تحسين الـ fileFilter ليكون أكثر مرونة مع صيغ الملفات
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('مسموح فقط برفع الصور (JPG, PNG) أو ملفات PDF'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 📌 مسارات الطالب
router.get('/my-payments', authMiddleware, getMyPayments);
router.post('/upload-receipt-base64', authMiddleware, uploadPaymentReceiptBase64);

// 📌 مسار رفع الإيصال مع صيد أخطاء Multer الذكي لعدم حدوث 404 أو تعليق السيرفر
router.post('/upload-receipt', authMiddleware, (req, res, next) => {
  upload.single('receipt')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // خطأ من المُلتر نفسه (مثلاً حجم الملف أكبر من 5 ميجا)
      return res.status(400).json({ success: false, message: `خطأ في رفع الملف: ${err.message}` });
    } else if (err) {
      // خطأ من الـ fileFilter (صيغة غير مدعومة)
      return res.status(400).json({ success: false, message: err.message });
    }
    // لو كله تمام كمل للـ Controller
    next();
  });
}, uploadPaymentReceipt);

// 📌 مسارات الأدمن
router.get('/admin/all-payments', authMiddleware, adminOnlyMiddleware, getAllPaymentsForAdmin);
router.post('/admin/verify-payment', authMiddleware, adminOnlyMiddleware, verifyStudentPayment);

export default router;