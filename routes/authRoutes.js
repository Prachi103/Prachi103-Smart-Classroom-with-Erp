const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

require("dotenv").config(); // ✅ Load .env

// ✅ Register Route
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // ✅ Validate input
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // ✅ Check if user already exists (case-insensitive)
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create User
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
        });

        res.status(201).json({ message: "User Registered Successfully", user });
    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and Password are required" });
        }

        // ✅ Find User (case-insensitive search)
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        // ✅ Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "2h" });

        res.json({ message: "Login Successful", token, user });
    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

module.exports = router;

