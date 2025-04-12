const express = require("express");
const Classroom = require("../models/Classroom");

const router = express.Router();

// ✅ Get all classrooms
router.get("/", async (req, res) => {
    try {
        const classrooms = await Classroom.find().populate("teacher students");
        res.json(classrooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ✅ Create a new classroom
router.post("/", async (req, res) => {
    const { name, subject, teacher, students } = req.body;

    const newClassroom = new Classroom({
        name,
        subject,
        teacher,
        students
    });

    try {
        const savedClassroom = await newClassroom.save();
        res.status(201).json(savedClassroom);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ✅ Delete a classroom
router.delete("/:id", async (req, res) => {
    try {
        await Classroom.findByIdAndDelete(req.params.id);
        res.json({ message: "Classroom deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
