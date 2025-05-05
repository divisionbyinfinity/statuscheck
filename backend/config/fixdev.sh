const fs = require("fs");
const path = require("path");

// Automatically look for "devices.json" in the current working directory
const filePath = path.join(process.cwd(), "devices.json");

if (!fs.existsSync(filePath)) {
  console.error(`Error: devices.json not found in ${process.cwd()}`);
  process.exit(1);
}

const devices = JSON.parse(fs.readFileSync(filePath, "utf8"));

Object.keys(devices).forEach((key) => {
  const device = devices[key];
  if (device.snoozeTime && typeof device.snoozeTime !== "number") {
    device.snoozeTime = 0;
    device.snoozed = false;
  }
  if (!("snoozeStartTime" in device)) {
    device.snoozeStartTime = null;
  }
});

// Optional: write back to file
fs.writeFileSync(filePath, JSON.stringify(devices, null, 2));
console.log("devices.json updated successfully.");