const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Classroom = require('./models/Classroom');
const Attendance = require('./models/Attendance');

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ MongoDB Connected. Inserting Dummy Data...');

    // 🔹 Users Insert
    const teacher = await User.create({ name: 'Mr. Sharma', email: 'sharma@school.com', password: '123456', role: 'teacher' });
    const student1 = await User.create({ name: 'Rahul', email: 'rahul@school.com', password: '123456', role: 'student' });
    const student2 = await User.create({ name: 'Priya', email: 'priya@school.com', password: '123456', role: 'student' });

    // 🔹 Classroom Insert
    const classroom = await Classroom.create({ name: 'Math Class', subject: 'Mathematics', teacher: teacher._id, students: [student1._id, student2._id] });

    // 🔹 Attendance Insert
    await Attendance.create({ student: student1._id, classroom: classroom._id, status: 'Present' });
    await Attendance.create({ student: student2._id, classroom: classroom._id, status: 'Absent' });

    console.log('✅ Dummy Data Inserted Successfully!');
    mongoose.connection.close();
}).catch(err => console.log('❌ Error:', err));

