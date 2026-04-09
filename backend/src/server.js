const fs = require('fs');
const path = require('path');
const app = require('./app');
const { connectDatabase } = require('./config/database');

const port = Number(process.env.PORT || 5000);
const uploadDir = path.resolve(__dirname, '../', process.env.UPLOAD_DIR || 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;
