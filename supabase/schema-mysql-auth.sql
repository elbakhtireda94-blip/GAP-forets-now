-- Add password column to users table for MySQL API login
-- Run this after schema-mysql.sql if you use the Node.js MySQL API backend.

USE anef_field_connect;

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL
  AFTER email;

-- Optional: create a first admin user (replace password with bcrypt hash of your choice)
-- Example: node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword', 10));"
-- INSERT INTO users (id, email, password_hash) VALUES (UUID(), 'admin@anef.ma', '$2a$10$...');
