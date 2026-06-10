import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    division: { type: String, required: true },
    boardingStation: { type: String, required: true },
    alightingStation: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

export default mongoose.model('Booking', bookingSchema)