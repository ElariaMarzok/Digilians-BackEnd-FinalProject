import mongoose from "mongoose";

// Import models
import HolidayRequest from "./models/HolidayRequest.js";
import PermitStudentDirectory from "./models/PermitStudentDirectory.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/digilians";

async function debug() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Get all holiday requests
    const requests = await HolidayRequest.find().limit(3).populate('student');
    console.log('\n=== Holiday Requests ===');
    console.log('Total found:', requests.length);

    requests.forEach((req, i) => {
      console.log(`\n--- Request ${i + 1} ---`);
      console.log('_id:', req._id);
      console.log('user:', req.user);
      console.log('student (raw):', req.student);
      console.log('student (populated):', req.student);
      console.log('status:', req.status);
      console.log('reason:', req.reason);
    });

    // Check if student field has data
    if (requests.length > 0) {
      const first = requests[0];
      console.log('\n=== First Request Details ===');
      console.log('student field type:', typeof first.student);
      console.log('student field is object:', typeof first.student === 'object');
      if (first.student && typeof first.student === 'object') {
        console.log('student._id:', first.student._id);
        console.log('student.name:', first.student.name);
        console.log('student.email:', first.student.email);
        console.log('student.militaryId:', first.student.militaryId);
      }
    }

    // Check student directory
    const students = await PermitStudentDirectory.find().limit(2);
    console.log('\n=== Student Directory ===');
    console.log('Total in directory:', students.length);
    students.forEach((s, i) => {
      console.log(`\nStudent ${i + 1}:`);
      console.log('  _id:', s._id);
      console.log('  name:', s.name);
      console.log('  militaryId:', s.militaryId);
      console.log('  email:', s.email);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debug();
