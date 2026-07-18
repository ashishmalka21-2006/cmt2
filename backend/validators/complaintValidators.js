const { body, validationResult } = require('express-validator');

// Validation runner middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

const createComplaintValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5 })
    .withMessage('Title must be at least 5 characters long'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['Technical', 'Billing', 'Service', 'Other'])
    .withMessage('Invalid category. Choose Technical, Billing, Service, or Other'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority. Choose Low, Medium, or High'),
  validate,
];

const updateComplaintValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Title must be at least 5 characters long'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),
  body('category')
    .optional()
    .trim()
    .isIn(['Technical', 'Billing', 'Service', 'Other'])
    .withMessage('Invalid category. Choose Technical, Billing, Service, or Other'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority. Choose Low, Medium, or High'),
  body('status')
    .optional()
    .isIn(['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'])
    .withMessage('Invalid status code'),
  validate,
];

module.exports = {
  createComplaintValidator,
  updateComplaintValidator,
};
