import Booking from '../models/Booking.js'
import { successResponse, errorResponse } from '../utils/response.js'

// الطالب - إنشاء حجز جديد
export const createBooking = async (req, res) => {
  try {
    const { studentId, studentName, division, boardingStation, alightingStation } = req.body

    if (!studentId || !studentName || !division || !boardingStation || !alightingStation) {
      return errorResponse(res, 400, 'جميع الحقول مطلوبة')
    }

    const booking = await Booking.create({
      studentId,
      studentName,
      division,
      boardingStation,
      alightingStation,
    })

   return res.status(201).json({ success: true, message: 'تم إرسال طلب الحجز بنجاح', data: booking })
  } catch (err) {
    return errorResponse(res, 500, err.message || 'Server error')
  }
}

// الطالب - جلب حجوزاته السابقة
export const getMyBookings = async (req, res) => {
  try {
    const { studentId } = req.params
    const bookings = await Booking.find({ studentId }).sort({ createdAt: -1 })
   return res.status(200).json({ success: true, message: 'تم جلب الحجوزات', data: bookings })
  } catch (err) {
    return errorResponse(res, 500, err.message || 'Server error')
  }
}

// الأدمن - جلب كل الحجوزات
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 })
    return res.status(200).json({ success: true, message: 'تم جلب كل الحجوزات', data: bookings })
  } catch (err) {
    return errorResponse(res, 500, err.message || 'Server error')
  }
}

// الأدمن - تأكيد أو رفض الحجز
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['confirmed', 'rejected'].includes(status)) {
      return errorResponse(res, 400, 'الحالة غير صحيحة')
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )

    if (!booking) {
      return errorResponse(res, 404, 'الحجز غير موجود')
    }

    return successResponse(res, 200, 'تم تحديث حالة الحجز', booking)
  } catch (err) {
    return errorResponse(res, 500, err.message || 'Server error')
  }
}