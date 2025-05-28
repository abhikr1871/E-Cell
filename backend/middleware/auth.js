const jwt = require('jsonwebtoken');

// Middleware function to authenticate JWT
const auth = (req, res, next) => {
  // Extract token from the Authorization header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  // If there's no token, respond with a 401 Unauthorized error
  if (!token) {
    return res.status(401).json({ message: 'Access denied, no token provided' });
  }

  try {
    // Verify the token using the JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded payload (user info) to the request object

    console.log('Authenticated User:', req.user); // Log decoded token for debugging
    next(); // Continue to the next middleware or route handler
  } catch (error) {
    console.error("JWT verification error:", error.message); // Log specific JWT error message
    res.status(400).json({ message: 'Invalid token' }); // Respond with 400 for token-related issues
  }
};

module.exports = auth;
