const Item = require('./model');
const { uploadImageToS3 } = require('../../middleware/uploadImage');
const authMiddleware = require('../../middleware/auth.js');

// List items for the authenticated user's college
const listItems = async (req, res) => {
  try {
    const userCollege = req.user?.collegeName;
    if (!userCollege) {
      return res.status(400).json({ message: 'User college information is missing' });
    }

    const items = await Item.find({ collegeName: userCollege });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new item with sellerId from the authenticated user
const createItem = async (req, res) => {
 
  const { title, description, price, image } = req.body;
 
  try {
    const userCollege = req.user?.collegeName;
    const userId = req.user?.user_id; // Get sellerId from authenticated user

    if (!userCollege || !userId) {
      return res.status(400).json({ message: 'User college or seller ID information is missing' });
    }

    if (!image) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Process the base64 image
    const base64String = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)[1];

    // Upload image to S3
    const uploadResult = await uploadImageToS3(base64String, title, mimeType);
    const imageUrl = uploadResult.Location;

    // Create item in the database
    const item = await Item.create({
      title,
      image: imageUrl,
      description,
      price,
      sellerId :userId,
      sellerName: req.user?.name, // Assuming the user's name is available in the request
      collegeName: userCollege
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listItems, createItem };
