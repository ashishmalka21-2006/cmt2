const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  console.log("JWT_SECRET:", process.env.JWT_SECRET);

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = generateToken;