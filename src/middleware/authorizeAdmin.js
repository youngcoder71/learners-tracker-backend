const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.position === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admin only." });
};

module.exports = authorizeAdmin;