const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      return next(new Error('User already exists with this email'));
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const isDev = process.env.NODE_ENV === 'development';

    // Create user (isVerified starts as true in development, false in production)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'User',
      isVerified: isDev,
      verificationToken: isDev ? undefined : verificationToken,
      verificationTokenExpire: isDev ? undefined : verificationTokenExpire,
    });

    if (!isDev) {
      // Verification URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

      // Email Message
      const emailMessage = {
        to: user.email,
        subject: 'Verify your ResolveHub Account',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Welcome to ResolveHub!</h2>
            <p>Hi ${user.name},</p>
            <p>Thank you for registering. Please verify your email address to complete your account setup and log in.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="font-size: 0.9em; color: #64748b;">Or copy and paste this link in your browser:</p>
            <p style="font-size: 0.9em; word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">This link will expire in 24 hours.</p>
          </div>
        `,
      };

      // Send the verification email
      await sendEmail(emailMessage);
    } else {
      console.log(`Auto-verified registered user in development: ${user.email}`);
    }

    res.status(201).json({
      success: true,
      message: isDev
        ? 'Registration successful! Your account is active and you can now log in.'
        : 'Registration successful! Please check your email to verify your account.',
      isVerified: user.isVerified,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email token
// @route   GET /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  const { token } = req.query;

  try {
    if (!token) {
      res.status(400);
      return next(new Error('Verification token is required'));
    }

    // Find user with token and check expiry
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      return next(new Error('Invalid or expired verification token'));
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    // Ensure email is verified
    if (!user.isVerified) {
      res.status(400);
      return next(new Error('Please verify your email address to log in'));
    }

    res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger forgot password flow
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Return 200 success response either way for security (prevent email enumeration)
      return res.status(200).json({
        success: true,
        message: 'If a user with that email is registered, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpire = Date.now() + 60 * 60 * 1000; // 1 hour

    // Save tokens to user schema
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetTokenExpire;
    await user.save();

    // Reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Email Message
    const emailMessage = {
      to: user.email,
      subject: 'ResolveHub Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset for your ResolveHub account. Please click the button below to set a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 0.9em; color: #64748b;">Or copy and paste this link in your browser:</p>
          <p style="font-size: 0.9em; word-break: break-all; color: #3b82f6;">${resetUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">This link will expire in 1 hour. If you did not request this reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    await sendEmail(emailMessage);

    res.status(200).json({
      success: true,
      message: 'If a user with that email is registered, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset user password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    if (!token) {
      res.status(400);
      return next(new Error('Reset token is required'));
    }

    // Find user with active token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      return next(new Error('Invalid or expired password reset token'));
    }

    // Set new password (triggers encryption in pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
};
