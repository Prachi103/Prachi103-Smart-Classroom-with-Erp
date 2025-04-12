// utils/token.js
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey"; // secure in .env

function generateAuthToken(student) {
  return jwt.sign(
    {
      id: student._id,
      rollNo: student.rollNo,
      name: student.name,
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
}

module.exports = generateAuthToken;
