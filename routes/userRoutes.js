const express = require("express");
const router = express.Router();
const User = require("../models/User");

// ✅ Get All Users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

// ✅ Get User by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

// ✅ Create New User
router.post("/", async (req, res) => {
  try {
    const { username, name, password, role } = req.body;
    if (!username || !name || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newUser = new User({ username, name, password, role });
    await newUser.save();
    res.status(201).json({ message: "User created successfully", newUser });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

// ✅ Delete User
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

module.exports = router;
