const express = require("express");
const router = express.Router();
const Student = require("../models/studentModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey123"; // ✅ fallback if not in .env

// ✅ Student Login Route
router.post("/login", async (req, res) => {
  try {
    const { rollNo, password } = req.body;

    // ✅ Student find karo
    const student = await Student.findOne({ rollNo });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // ✅ Password compare
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid Credentials" });

    // ✅ JWT Token generate with useful student info
    const token = jwt.sign(
      {
        id: student._id,
        rollNo: student.rollNo,
        name: student.name,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        course: student.course,
        duration: student.duration,
        totalFees: student.totalFees,
        feesPaid: student.feesPaid,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
