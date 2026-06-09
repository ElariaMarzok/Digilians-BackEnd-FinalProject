import { Router } from 'express'
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
} from '../controllers/booking.controller.js'
import authMiddleware from '../middlewares/auth.middlewares.js'

const router = Router()

// الطالب
router.post('/', authMiddleware, createBooking)
router.get('/my/:studentId', authMiddleware, getMyBookings)

// الأدمن - بدون middleware مؤقتاً
router.get('/all', getAllBookings)
router.patch('/:id/status', updateBookingStatus)

export default router