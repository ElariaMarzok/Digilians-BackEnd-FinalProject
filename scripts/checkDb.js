import mongoose from 'mongoose';
import StudentPayment from '../models/StudentPayment.js';

await mongoose.connect('mongodb://127.0.0.1:27017/digilians');

const all = await StudentPayment.find().lean();
console.log('Total StudentPayment records:', all.length);
if (all.length > 0) {
  all.forEach((rec, i) => {
    console.log('Record', i+1, '- user:', rec.user, 'militaryId:', rec.militaryId);
    if (rec.months) {
      rec.months.forEach((m, j) => {
        console.log('  Month', j+1, ':', m.monthName, 'receiptUrl:', m.receiptUrl, 'status:', m.status);
      });
    }
  });
} else {
  console.log('No records found!');
}

await mongoose.disconnect();
process.exit(0);
