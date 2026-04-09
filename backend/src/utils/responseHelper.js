const success = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

const error = (res, message, statusCode = 400, errors = null) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });

const paginate = (res, data, total, page, limit) =>
  res.status(200).json({
    success: true,
    message: 'Success',
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });

module.exports = {
  success,
  error,
  paginate,
};
