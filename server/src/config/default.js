require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3030,
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT || 3306
  },
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
};