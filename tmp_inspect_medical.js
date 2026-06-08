import connectDB from './config/db.js';
import MedicalRecord from './models/MedicalRecord.js';

const uri = 'mongodb://127.0.0.1:27017/digilians';

const main = async () => {
  await connectDB(uri);
  const records = await MedicalRecord.find({}).sort({ createdAt: 1 });
  console.log('count', records.length);
  records.forEach((r) => {
    console.log(JSON.stringify({
      id: r._id.toString(),
      user: r.user?.toString(),
      name: r.studentName,
      email: r.studentEmail,
      military: r.militaryId,
      date: r.date,
      createdAt: r.createdAt,
    }));
  });
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
