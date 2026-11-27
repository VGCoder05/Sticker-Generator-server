export function errorHandler(error, _req, res, _next) {
  console.error(error);
  const status = error.status || (error.code === 11000 ? 409 : error.name === 'ValidationError' ? 400 : error.name === 'MulterError' ? 400 : 500);
  const message = error.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum allowed size is 15 MB.' : error.code === 11000 ? 'A product with this product code already exists. Review the product code and try again.' : error.message || 'Server error';
  res.status(status).json({ success: false, message });
}
