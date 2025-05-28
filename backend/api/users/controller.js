const User = require('./model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');


// Generate JWT





const generateToken = (id, name, collegeName, email, user_id) => {
  return jwt.sign({ id, name, collegeName, email ,user_id}, process.env.JWT_SECRET, { expiresIn: '30d' });
};


// Signup (Register) a new user
const signup = async (req, res) => {
  const { name, collegeName, email, password, confirmPassword } = req.body;
  const result = {
    status: 0,
    message: "User successfully registered",
    data: {}
  };

  try {
    if (password !== confirmPassword) {
      result.message = "Passwords do not match";
      return res.status(400).json(result);  // Use 400 for bad request
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      result.message = 'User already exists';
      return res.status(400).json(result);  // Use 400 for bad request
    }

    // Check if the college exists in the API
    const response = await axios.get(`${process.env.REACT_APP_API_URL}?name=${collegeName}&country=India`);
    if (!response.data.length) {
      result.message = "College not found in India";
      return res.status(404).json(result);  // Use 404 for not found
    }

    // Hash the password before saving the user

    // Generate user_id (you can adjust the logic based on your needs)
    const userCount = await User.countDocuments();
    const userId = userCount + 1; // Auto-increment logic for user_id

    // Create the user with hashed password and user_id
    const user = await User.create({ 
      name, 
      collegeName, 
      email, 
      password,  // Store the hashed password
      user_id: userId  // Ensure user_id is set
    });

    const resp_data = {
      _id: user._id,
      user_id: user.user_id,
      name: user.name,
      collegeName: user.collegeName,
      email: user.email,
      token: generateToken(user._id, user.name, user.collegeName, user.email, user.user_id),
    };

    result.data = resp_data;
    result.status = 1;
    res.status(201).json(result);
  } catch (error) {
    result.message = error.message;
    res.status(500).json(result);  // Use 500 for internal server errors
  }
};

// Login an existing user
// (await bcrypt.compare(password, user.password))
const login = async (req, res) => {
  const { email, password } = req.body;

  const result = {
    status: 0,
    message: "User successfully logged in",
    data: {}
  };

  try {
    const user = await User.findOne({ email });

    // Check if user exists and compare the plain-text password with the hashed password
    if (user && await bcrypt.compare(password, user.password)) {
      const resp_data = {
        _id: user._id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id, user.name, user.collegeName, user.email, user.user_id),
        message: "Successfully logged in"
      };

      result.data = resp_data;
      result.status = 1;
      res.status(200).json(result); // Use 200 for successful login
    } else {
      result.message = "Invalid email or password";
      res.status(401).json(result); // Use 401 for unauthorized
    }
  } catch (error) {
    result.message = error.message;
    res.status(500).json(result); // Use 500 for internal server errors
  }
};

// Get all users (requires authentication)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password field
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, getAllUsers };
