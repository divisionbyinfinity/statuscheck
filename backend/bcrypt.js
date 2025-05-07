// bcrypt.js
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log(`Password: ${password}`);
    console.log(`Hashed password: ${hashedPassword}`);
  } catch (error) {
    console.error('Error hashing password:', error.message);
  }
}

hashPassword('password123');
