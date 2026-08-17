const { body } = require('express-validator');

/**
 * The limits here are cost control as much as validation: every field that
 * reaches the AI service reaches a paid model, so the API caps the size of a
 * question, a thread, and a draft before any of it becomes tokens.
 */

const report = [
  body('question')
    .isString()
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Ask a question between 3 and 1000 characters'),
  body('topK').optional().isInt({ min: 1, max: 20 }).withMessage('topK must be between 1 and 20').toInt(),
  body('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be between 1 and 365').toInt(),
  body('includeAnalytics').optional().isBoolean().withMessage('includeAnalytics must be a boolean').toBoolean(),
  body('history').optional().isArray({ max: 6 }).withMessage('history holds at most 6 previous turns'),
  body('history.*.question').optional().isString().trim().isLength({ max: 2000 }),
  body('history.*.answer').optional().isString().trim().isLength({ max: 8000 }),
];

const TASKS = ['summary', 'seo', 'topics', 'improve'];

const assist = [
  body('task').isIn(TASKS).withMessage(`task must be one of: ${TASKS.join(', ')}`),
  body('title').optional().isString().trim().isLength({ max: 300 }),
  body('content')
    .optional()
    .isString()
    .isLength({ max: 60000 })
    .withMessage('Content is too long to analyse (max 60000 characters)'),
  body('postId').optional().matches(/^[a-f\d]{24}$/i).withMessage('postId must be a valid id'),
  // Every task except `topics` reads the draft in front of the author.
  body('content')
    .if(body('task').not().equals('topics'))
    .isString()
    .trim()
    .isLength({ min: 40 })
    .withMessage('Write at least 40 characters before asking for a suggestion'),
];

const reindex = [body('force').optional().isBoolean().withMessage('force must be a boolean').toBoolean()];

module.exports = { report, assist, reindex, TASKS };
