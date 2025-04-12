const express = require("express");
const router = express.Router();
const Student = require('../models/studentModel');

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "mySuperSecretKey123";

/**
 * -----------------------------------
 *  POST /login
 *  Student Login (Plain Password)
 * -----------------------------------
 */
router.post("/login", async (req, res) => {
  try {
    const { rollNo, password } = req.body;

    if (!rollNo || !password) {
      return res.status(400).json({
        error: "Both roll number and password are required",
        field: !rollNo ? "rollNo" : "password"
      });
    }

    const student = await Student.findOne({ 
      rollNo: rollNo.trim().toUpperCase()
    });

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
        suggestion: "Please check your roll number"
      });
    }

    if (student.password !== password.trim()) {
      return res.status(401).json({
        error: "Invalid credentials",
        suggestion: "Please check your password"
      });
    }

    const studentData = {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      course: student.course,
      duration: student.duration,
      totalFees: student.totalFees,
      feesPaid: student.feesPaid,
      remainingFees: student.totalFees - student.feesPaid
    };

    const token = jwt.sign(studentData, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Login successful",
      student: studentData,
      token
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * -----------------------------------
 *  GET /
 *  Get All Students
 * -----------------------------------
 */
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const students = await Student.find()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rollNo: 1 });

    const count = await Student.countDocuments();

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      students
    });

  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: "Server error while fetching students" });
  }
});

/**
 * -----------------------------------
 *  POST /add
 *  Add a New Student (No hashing)
 * -----------------------------------
 */
router.post("/add", async (req, res) => {
  try {
    const { name, rollNo, password, course, duration, totalFees, feesPaid } = req.body;

    if (feesPaid > totalFees) {
      return res.status(400).json({
        error: "Fees paid cannot exceed total fees"
      });
    }

    const existingStudent = await Student.findOne({ rollNo });
    if (existingStudent) {
      return res.status(409).json({
        error: "Duplicate roll number",
        suggestion: "Please use a different roll number"
      });
    }

    const newStudent = new Student({
      name: name.trim(),
      rollNo: rollNo.trim().toUpperCase(),
      password: password.trim(), // plain password
      course: course.trim(),
      duration,
      totalFees,
      feesPaid
    });

    await newStudent.save();

    const studentResponse = newStudent.toObject();
    delete studentResponse.password;

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      student: studentResponse
    });

  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ error: "Server error while adding student" });
  }
});

/**
 * -----------------------------------
 *  GET /:rollNo
 *  Get Student by Roll Number
 * -----------------------------------
 */
router.get("/:rollNo", async (req, res) => {
  try {
    const student = await Student.findOne({
      rollNo: req.params.rollNo.trim().toUpperCase()
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);

  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ error: "Server error while fetching student" });
  }
});

/**
 * -----------------------------------
 *  PUT /update/:rollNo
 *  Update Student (no password/rollNo change)
 * -----------------------------------
 */
router.put("/update/:rollNo", async (req, res) => {
  try {
    const updates = req.body;

    if (updates.password || updates.rollNo) {
      return res.status(403).json({
        error: "Password and roll number cannot be updated"
      });
    }

    const student = await Student.findOneAndUpdate(
      { rollNo: req.params.rollNo.trim().toUpperCase() },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      student
    });

  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Server error while updating student" });
  }
});

/**
 * -----------------------------------
 *  DELETE /delete/:rollNo
 *  Delete Student
 * -----------------------------------
 */
router.delete("/delete/:rollNo", async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({
      rollNo: req.params.rollNo.trim().toUpperCase()
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      success: true,
      message: "Student deleted successfully"
    });

  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ error: "Server error while deleting student" });
  }
});

/**
 * -----------------------------------
 *  PUT /updateFees/:rollNo
 *  Student Fees Update After Payment
 * -----------------------------------
 */
router.put("/updateFees/:rollNo", async (req, res) => {
  try {
    const rollNo = req.params.rollNo.trim().toUpperCase();
    const { paymentAmount } = req.body;

    if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    const student = await Student.findOne({ rollNo });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Calculate new fees paid amount
    const newFeesPaid = student.feesPaid + Number(paymentAmount);
    
    // Ensure fees paid doesn't exceed total fees
    if (newFeesPaid > student.totalFees) {
      return res.status(400).json({ 
        error: "Payment amount exceeds remaining fees",
        remainingFees: student.totalFees - student.feesPaid
      });
    }

    // Update fees paid
    student.feesPaid = newFeesPaid;
    await student.save();

    const updatedStudent = {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      course: student.course,
      duration: student.duration,
      totalFees: student.totalFees,
      feesPaid: student.feesPaid,
      remainingFees: student.totalFees - student.feesPaid
    };

    res.json({
      success: true,
      message: "Fees updated successfully",
      student: updatedStudent
    });

  } catch (err) {
    console.error("Error updating fees:", err);
    res.status(500).json({ error: "Failed to update student fees" });
  }
});

module.exports = router;
