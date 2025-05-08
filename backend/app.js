const express = require("express");
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000; // Reads it from the .env, if undefined in .env it will fallback to 3000
const cronSchedule = process.env.CRON_SCHEDULE || "0 10 * * *"; // Default to 10 AM daily
const cron = require('node-cron');
const fs = require('fs');
const deviceList = require('./config/devicesList.json');
const sendMail = require('./src/helper/transporter');
const pingme = require('./src/helper/ping');
const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use('/devices', express.static(__dirname + '/config'));

const deviceFiles = deviceList.files;
const AllDevices = {};

const PullAllDevices = () => {
  for (const file of deviceFiles) {
    try {
      const devices = require(`./config/${file}`);
      Object.assign(AllDevices, devices);
    } catch (error) {
      console.error(`Error reading file ${file}: ${error.message}`);
    }
  }
};
PullAllDevices();

const findAndAlertDeadDevices = async (devices) => {
  const deadDevices = {};
  const currentTime = Date.now();
  // Use map to create an array of promises for Promise.all
  const pingPromises = Object.values(devices)
    .filter((device) => {
      // Check if alerts are enabled and device is not snoozed
      if (device["Alert Enabled"] === false) return false;
      if (device["snoozeTime"] > 0 && device["snoozeStartTime"]) {
        const elapsedMinutes = (currentTime - device["snoozeStartTime"]) / (1000 * 60);
        return elapsedMinutes >= device["snoozeTime"];
      }
      return true;
    })
    .map(async (device) => {
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
  if (Object.keys(deadDevices).length > 0) {
    const mailText = {
      intro: 'New Update On The Status Of Devices/Services',
      action: Object.values(deadDevices).map((device) => ({
        instructions: ` ${device['DNS Name']} ${device['Device Type']}: ${device['Description']} is down.`,
        button: {
          color: 'red',
          text: device['DNS Name'],
          link: `https://${device['IP Address']}`,
        },
      })),
      outro: 'For more info check url: https://github.com/divisionbyinfinity/statuscheck',
    };
    await sendMail('Alert Device/Service Status Update', ['<email>'], { body: mailText });
  }
};

// Schedule the cron job to run everyday at 10:00 AM
cron.schedule(cronSchedule, () => {
  console.log('Running cron job to find and alert dead devices');
  findAndAlertDeadDevices(AllDevices);
});

app.use(require('./src/routes/routes'));
app.listen(PORT, function () {
  console.log('Server listening on port ', PORT);
});