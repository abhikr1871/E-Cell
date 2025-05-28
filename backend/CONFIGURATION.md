# Configuration Guide

## Environment Variables Setup

Create a `.env` file in your project root with the following variables:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/college_cart

# JWT Authentication (Optional - uncomment to enable)
# JWT_SECRET=your_super_secret_jwt_key_here_make_it_very_long_and_random

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# AWS S3 (if using file uploads)
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=your-bucket-name
```

## JWT Authentication Setup

To enable JWT authentication for Socket.IO connections:

1. Uncomment the `JWT_SECRET` in your `.env` file
2. Generate a secure JWT secret (recommended 64+ characters)
3. Uncomment the JWT verification code in `api/chat/socket.js`:

```javascript
// In socket.js, replace this line:
socket.userId = socket.handshake.auth.userId;

// With this:
const decoded = jwt.verify(token, process.env.JWT_SECRET);
socket.userId = decoded.userId;
```

## Database Indexing

The system will automatically create database indexes when you start the server. For optimal performance, ensure MongoDB is running with sufficient memory allocation.

## CORS Configuration

Update the `FRONTEND_URL` to match your frontend application URL in production.

## Production Considerations

For production deployment:
- Set `NODE_ENV=production`
- Use a secure JWT secret
- Configure proper MongoDB connection with authentication
- Set up proper CORS origins
- Consider using Redis for Socket.IO clustering if scaling horizontally 