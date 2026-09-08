const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const app = require('./app');
const connectDatabase = require('./config/db');
const { initSocket } = require('./config/socket');
const { ensureAdminAccount } = require('./services/adminService');

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDatabase();
  await ensureAdminAccount();
  const server = http.createServer(app);
  initSocket(server);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the running process or set PORT to a different value.`);
      process.exit(1);
    }

    console.error('Server error:', error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`SLMS backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
