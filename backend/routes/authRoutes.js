const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidators');

router.post('/register', registerValidator, registerUser);
router.get('/verify-email', verifyEmail);
router.post('/login', loginValidator, loginUser);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);

module.exports = router;
