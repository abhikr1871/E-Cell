const express = require('express');
const { signup, login, getAllUsers } = require('./controller');
const auth = require('../../middleware/auth');


const router = express.Router();

// Define user routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/', auth, getAllUsers); // Protected route


module.exports = router;
