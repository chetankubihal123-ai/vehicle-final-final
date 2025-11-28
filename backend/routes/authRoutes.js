const express = require('express');
const router = express.Router();
const { register, verifyOTP, login, sendLoginOTP, verifyLoginOTP } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', require('../controllers/authController').resendOTP);
router.post('/login', login);
router.post('/send-login-otp', sendLoginOTP);
router.post('/verify-login-otp', verifyLoginOTP);
router.get('/me', require('../middleware/authMiddleware')(['admin', 'fleet_owner', 'driver']), require('../controllers/authController').getMe);

module.exports = router;
