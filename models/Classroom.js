const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
    name: String,
    subject: String,
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Classroom', ClassroomSchema);
