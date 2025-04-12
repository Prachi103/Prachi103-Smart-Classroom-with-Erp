const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Student = require('../models/studentModel');

const razorpay = new Razorpay({
    key_id: 'rzp_test_Ratlhmks8SmIok',
    key_secret: '2wKCPaPFuAAUpATx658jmCTC'
});

// Create Razorpay Order
router.post('/create-order', async (req, res) => {
    try {
        const { rollNo, amount } = req.body;

        const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                studentName: student.name,
                rollNo: student.rollNo,
                course: student.course
            }
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify Payment
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rollNo, amount } = req.body;

        // Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', '2wKCPaPFuAAUpATx658jmCTC')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Update student fees
            const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
            if (!student) {
                return res.status(404).json({ error: "Student not found" });
            }

            student.feesPaid += Number(amount);
            if (student.feesPaid > student.totalFees) {
                student.feesPaid = student.totalFees;
            }
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
                message: "Payment verified successfully",
                student: updatedStudent
            });
        } else {
            res.status(400).json({ error: "Invalid payment signature" });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

module.exports = router; 