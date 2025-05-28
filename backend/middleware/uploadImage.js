const s3 = require('../config/s3');

const uploadImageToS3 = async (base64String, fileName, mimeType) => {
  // Decode the base64 string
  const base64Data = Buffer.from(base64String, 'base64');
  
  const params = {
    Bucket: process.env.S3_BUCKET, // Your S3 bucket name
    Key: `${Date.now()}_${fileName}`, // File name you want to save as
    Body: base64Data,
    ContentType: mimeType,
    // ACL: 'public-read' // Optional: to make the file publicly accessible
  };

  return s3.upload(params).promise();
};

module.exports = {
  uploadImageToS3
};