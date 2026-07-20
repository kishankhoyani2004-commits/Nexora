import jwt from "jsonwebtoken";

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "nexora_secret_key",
    { expiresIn: "30d" } // 30 days for access token in testing
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "nexora_secret_key",
    { expiresIn: "7d" } // 7 days for refresh token
  );
};

// Legacy generator
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "nexora_secret_key",
    { expiresIn: "7d" }
  );
};

export default generateToken;