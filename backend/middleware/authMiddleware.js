import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  // The Authorization header is what the SPA explicitly sends for the
  // account currently active in this tab (via localStorage), so it must
  // win. The cookie is shared across every tab of the origin — if it took
  // priority, logging into a second account in another tab (e.g. testing
  // the freelancer side while a client session is open elsewhere) would
  // silently hijack every request in the first tab onto the wrong account,
  // even though its UI still shows the original user.
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
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