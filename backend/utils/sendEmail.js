const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const isEmailConfigured =
    process.env.EMAIL_USERNAME &&
    process.env.EMAIL_USERNAME !== 'placeholder@gmail.com' &&
    process.env.EMAIL_PASSWORD &&
    process.env.EMAIL_PASSWORD !== 'placeholderpass';

  if (!isEmailConfigured) {
    console.log('\n=================== MOCK EMAIL SENT ===================');
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text || options.html}`);
    console.log('=======================================================\n');
    return { mock: true, message: 'Email logged to console since config is missing' };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `"ResolveHub Support" <${process.env.EMAIL_USERNAME}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  // Send email
  return await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
