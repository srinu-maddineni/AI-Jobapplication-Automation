const multer = require('multer');

// Central error handler for multer and general backend errors.
const errorMiddleware = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  if (err.message && err.message.includes('Only PDF and DOCX files are allowed')) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = errorMiddleware;
