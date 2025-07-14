import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Search validation rules - updated to support both old and new formats
export const validateSearchQuery = [
  // Either 'q' OR 'song' must be provided
  query('q')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Query must be between 1 and 500 characters')
    .trim()
    .escape(),
  query('song')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Song title must be between 1 and 500 characters')
    .trim()
    .escape(),
  query('artist')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Artist name must be between 1 and 200 characters')
    .trim()
    .escape(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  // Custom validation to ensure either 'q' or 'song' is provided
  (req: Request, res: Response, next: NextFunction) => {
    const { q, song } = req.query;
    if (!q && !song) {
      return res.status(400).json({
        error: 'Either "q" or "song" parameter is required'
      });
    }
    next();
  },
  handleValidationErrors
];

// User registration validation
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .trim(),
  body('display_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Display name must be less than 100 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// User login validation
export const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors
];

// Favorites validation
export const validateFavorite = [
  body('type')
    .isIn(['song', 'artist', 'album', 'person'])
    .withMessage('Type must be one of: song, artist, album, person'),
  body('itemId')
    .isLength({ min: 1, max: 255 })
    .withMessage('Item ID must be between 1 and 255 characters')
    .trim(),
  body('itemData')
    .isObject()
    .withMessage('Item data must be an object'),
  handleValidationErrors
];

// Song ID validation
export const validateSongId = [
  param('id')
    .isLength({ min: 1, max: 255 })
    .withMessage('Song ID must be between 1 and 255 characters')
    .trim()
    .escape(),
  handleValidationErrors
];