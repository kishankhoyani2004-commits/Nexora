import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "nexora_secret_key");
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Not authorized, user not found." });
    }

    // Check email verification status
    if (!user.verified) {
      return res.status(403).json({ success: false, message: "Please verify your email address to proceed." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({ success: false, message: "Not authorized, invalid token." });
  }
};