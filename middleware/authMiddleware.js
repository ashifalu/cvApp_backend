const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  console.log("middleware reached")

  try {
    console.log(req);
    // 1. Get token from header
    const authHeader = req.headers['authorization'];
    console.log(authHeader)


    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log(token)


    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWTSECRETKEY);

    // 3. Attach user to request
    req.user = {
      id: decoded.id
    };

    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;