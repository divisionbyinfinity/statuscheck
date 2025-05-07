const express = require("express");
const router = express.Router();
const pingme = require('../../helper/ping');
const sendMail = require('../../helper/transporter');
const { readJsonFile, saveUsers, checkFilePermitted } = require('../../helper/helper');
const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid').v4;
const deviceList = require('../../../config/devicesList.json');
const { checkAuthorazation } = require("../../middlewares/middleware");
const bcrypt = require('bcrypt'); // Added bcrypt import

const USERS_FILE = './config/users.json';
let usersCache = null;

router.use('/devices', require('./devices'));

router.get('/ping', async (req, res) => {
  try {  
    const ip = req.query.ip;
    if (!ip) {
      return res.status(400).json({ success: false, error: 'IP address is required' });
    }
    const result = await pingme(ip);
    if (result.alive) {
      return res.status(200).json(result);
    }
    return res.status(500).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sendMail', async (req, res) => {
  const { subject, toEmail, body, intro, outro } = req.body;
  const devicefiles = deviceList.files;
  const devices = {};
  for (const file of devicefiles) {
    try {
      const device = require(`../../../config/${file}`);
      Object.assign(devices, device);
    } catch (error) {
      console.error(`Error reading file ${file}: ${error.message}`);
    }
  }
  if (!toEmail || toEmail.length === 0) {
    return res.status(400).json({ success: false, error: 'To email is required' });
  }
  const deadDevices = {};
  // Use map to create an array of promises for Promise.all
  const pingPromises = Object.values(devices).filter(device => device['Alert Enable'] === true).map(async (device) => {
    try {
      const result = await pingme(device['IP Address']);
      if (!result.alive) {
        deadDevices[device['IP Address']] = device;
      }
    } catch (error) {
      console.error(`Error pinging ${device.ip}: ${error.message}`);
    }
  });

  // Wait for all ping promises to complete
  await Promise.all(pingPromises);
  if (Object.values(deadDevices).length > 0) {
    const mailText = {
      intro: intro || 'Alert Service To Notify Dead Devices/Services',
      action: Object.values(deadDevices).map((device) => ({
        instructions: ` ${device['DNS Name']} ${device['Device Type']}: ${device['Description']} is down.`,
        button: {
          color: 'red',
          text: device['DNS Name'],
          link: `https://${device['IP Address']}`,
        },
      })),
      outro: outro || `For more info check url: ${process.env.SUPPORT_URL}`,
    };  
    await sendMail(subject || 'Alert Device/Service Status Update', toEmail, { body: mailText });
  }
  return res.status(200).json({ success: true, message: 'Mail sent successfully' });
});

// **LOGIN ROUTE**
router.post('/login', async (req, res) => {
  try {
    const { username, password, filename } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    if (!usersCache) {
      const { data: newUsers, error } = await readJsonFile('./config/users.json');
      if (error) {
        return res.status(500).json({ success: false, error });
      }
      usersCache = newUsers;  
    }
    const user = usersCache[username];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    // Assign userId if missing
    if (!user.userId) {
      user.userId = uuidv4();
    }
    // Update last login timestamp
    user.lastLogin = new Date().toISOString();
    usersCache[username] = user;
    saveUsers(USERS_FILE, usersCache);
    // Check file permissions
    let filepermitted = checkFilePermitted(user.files, filename);
    if (!filepermitted) {
      return res.status(401).json({ success: false, error: `User does not have permission to access this file ${filename}` });
    }
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.userId, username, role: user.role, lastLogin: user.lastLogin, files: user.files || [] },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    user.token = token;
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// **REGISTER ROUTE**
router.post('/register', checkAuthorazation, async (req, res) => {
  try {
    const { username, password, role, files } = req.body;
    // Restrict to admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can create users' });
    }
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    if (!usersCache) {
      const { data: newUsers, error } = await readJsonFile(USERS_FILE);
      if (error) {
        return res.status(500).json({ success: false, error });
      }
      usersCache = newUsers;
    }
    if (usersCache[username]) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = {
      username,
      password: hashedPassword,
      userId: uuidv4(),
      role: role || 'user',
      files: files || [],
      lastLogin: null,
      token: null
    };
    usersCache[username] = newUser;
    saveUsers(USERS_FILE, usersCache);
    return res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// **CHECK TOKEN ROUTE**
router.get('/checktoken', checkAuthorazation, async (req, res) => {
  const user = req.user;
  try {
    if (!usersCache) {
      const { data: newUsers, error } = await readJsonFile('./config/users.json');
      if (error) {
        return res.status(500).json({ success: false, error });
      }
      usersCache = newUsers;  
    }
    if (!usersCache[user.username]) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

module.exports = router;