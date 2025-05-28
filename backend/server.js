require('dotenv').config();
const http = require("http");
const app = require("./app");
const setupWebSocket = require("./api/chat/socket");

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize WebSocket
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});