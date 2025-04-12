const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rollNo: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  totalFees: {
    type: Number,
    required: true
  },
  feesPaid: {
    type: Number,
    default: 0
  }
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
