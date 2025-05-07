// update-passwords.js
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const USERS_FILE = './config/users.json';

async function updateUserPasswords() {
  try {
    const usersData = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    const saltRounds = 10;
    for (const username in usersData) {
      const user = usersData[username];
      // Check if password is not already hashed
      if (!user.password.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        user.password = hashedPassword;
        usersData[username] = user;
      }
    }
    await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8');
    console.log('All user passwords updated successfully');
  } catch (error) {
    console.error('Error updating passwords:', error.message);
  }
}

updateUserPasswords();