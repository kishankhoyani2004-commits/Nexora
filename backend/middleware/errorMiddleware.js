export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error("Centralized Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
    path: req.path,
    method: req.method,
  });

  let message = err.message || "Server Error";
  let code = statusCode;

  if (err.name === "MongooseServerSelectionError" || err.message?.includes("ECONNREFUSED") || err.message?.includes("buffering timed out")) {
    message = "Database is offline. Please start MongoDB service (net start MongoDB).";
  }

  // Duplicate-key race: two concurrent registrations with the same email can
  // both pass the findOne check before either finishes create() — the unique
  // index then rejects the second with a raw Mongo E11000, not our friendly message.
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || { email: 1 })[0];
    code = 400;
    message = field === "email" ? "Email already registered." : `${field} already in use.`;
  }

  res.status(code).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
};
