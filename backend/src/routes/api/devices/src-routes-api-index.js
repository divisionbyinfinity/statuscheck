const router=require('express').Router();
const {readJsonFile,checkFilePermitted}=require('../../../helper/helper');
const {checkAuthorazation}=require('../../../middlewares/middleware');
const fs=require('fs');

router.get('/:fileName', async (req, res) => {
    try {
      const configDir = './config';
      const files = fs.readdirSync(configDir);
      const fileName = req.params.fileName;
      let  filePath = './config/'+fileName;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: `File : "${fileName}" not found` ,files:files});
      }
      // Read the file
      let {data:devices,error} = readJsonFile(filePath);
      // sort the keys
        devices = Object.keys(devices).sort().reduce((obj, key) => {
        obj[key] = devices[key];
        return obj;
        }, {});
      // Create a copy of the devices for the response
      const filteredServers = JSON.parse(JSON.stringify(devices));
      const currentDate = new Date();
  
      Object.keys(filteredServers).forEach((server) => {
        const device = filteredServers[server];
        const snoozeDate = new Date(device['snoozeTime']);
  
        if (isNaN(snoozeDate)) {
          // If snoozeTime is invalid, reset it in the frontend copy
          device['snoozeTime'] = 0;
          device['snoozed'] = false;
        } else if (snoozeDate > currentDate) {
          // If snoozeTime is in the future, calculate days for the frontend
          const minutesRemaining = Math.ceil((snoozeDate - currentDate) / (1000 * 60));
          device['snoozeTime'] = minutesRemaining;
        } else {
          // If snoozeTime is today or in the past, set to 0 for frontend
          device['snoozeTime'] = 0;
          device['snoozed'] = false;
  
          // Update the original device object on the server
          if (devices[server]) {
            devices[server]['snoozeTime'] = 0;
            devices[server]['snoozed'] = false;
          }
        }
      });
  
      // Save updated devices object to the file
      if (!devices) {
        return res.status(404).json({ success: false, error: `File : "${fileName}" not found` });
      }
      fs.writeFile(filePath, JSON.stringify(devices, null, 2), 'utf8', (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Error writing to devices file' });
        }
        // Return filtered servers to the frontend
        return res.status(200).json({
          success: true,
          message: 'Fetched Devices successfully',
          devices: filteredServers, // Send frontend-friendly version
        });
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
router.put('/device/:fileName',checkAuthorazation, async (req, res) => {
try{
    
const deviceName = req.query.deviceName;
const {fileName} = req.params;
const user=req.user;
// check if the filename user has access to
let filepermitted=checkFilePermitted(user.files,fileName);
if(!filepermitted){
    return res.status(401).json({ success: false, error: `User does not have permission to access this file ${fileName}` });
}
const filePath =`./config/${fileName}`;
const enableMailAlert = req.body.enableMailAlert;
let {data:devices,error} = readJsonFile(filePath);
if (!devices) {
    return res.status(404).json({ success: false, error: `File : "${fileName}" not found` });
}
if (!deviceName || !(deviceName in devices)){
    return res.status(400).json({ success: false, message: `${deviceName} Invalid device name` });
}
if (enableMailAlert!==undefined){
    
    devices[deviceName]['Alert Enable'] = enableMailAlert;
    return fs.writeFile(filePath, JSON.stringify(devices, null, 2), 'utf8', (err) => {
    if (err) {
        return res.status(500).json({ success: false, error: 'Error writing to devices file' });
    }
    return res.status(200).json({
        success: true,
        message: 'Device Mail Alert updated successfully',
    });
    });  
}
return res.status(400).json({ success: false, error: 'Invalid request' });
}
catch(err){
    return res.status(500).json({ success: false, message: err.message });
}
});
router.post("/device/snooze/:fileName", checkAuthorazation, async (req, res) => {
  const { fileName } = req.params;
  const { name, days: minutes } = req.body;
  const user = req.user;

  // Check user permission for the file
  let filepermitted = checkFilePermitted(user.files, fileName);
  if (!filepermitted) {
    return res.status(401).json({
      success: false,
      error: `User does not have permission to access this file ${fileName}`
    });
  }

  if (minutes === undefined || minutes === null) {
    return res.status(400).json({
      success: false,
      message: 'Snooze time in minutes is required'
    });
  }

  const snoozeTime = new Date();
  if (isNaN(minutes)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid snooze time'
    });
  }
  if (minutes < 0) {
    return res.status(400).json({
      success: false,
      message: 'Snooze time must be a positive number'
    });
  }
  if (minutes > 4320) { // 3 days max
    return res.status(400).json({
      success: false,
      message: 'Snooze time must be less than or equal to 4320 minutes (3 days)'
    });
  }

  const filePath = `./config/${fileName}`;
  const { data: devices, error } = readJsonFile(filePath);
  if (!devices) {
    return res.status(500).json({
      success: false,
      message: 'Unable to read devices file'
    });
  }

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Missing device name"
    });
  }

  // Find device key by matching DNS Name
  const matchingKey = Object.keys(devices).find(
    key => devices[key]['DNS Name']?.toLowerCase() === name.toLowerCase()
  );

  if (!matchingKey) {
    return res.status(400).json({
      success: false,
      message: `Device '${name}' not found`
    });
  }

  snoozeTime.setTime(snoozeTime.getTime() + minutes * 60 * 1000);
  devices[matchingKey].snoozeTime = snoozeTime;
  devices[matchingKey].snoozed = false;

  return fs.writeFile(filePath, JSON.stringify(devices, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Error writing to devices file'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device snooze time updated successfully',
      snoozeTime: minutes
    });
  });
});

router.post('/device/:fileName', checkAuthorazation,async (req, res) => {
try{
const {fileName} = req.params;
const deviceName = req.query.deviceName;
const filePath =`./config/${fileName}`;
const body = req.body;
const user=req.user;
// check if the filename user has access to
let filepermitted=checkFilePermitted(user.files,fileName);
if(!filepermitted){
    return res.status(401).json({ success: false, error: `User does not have permission to access this file ${fileName}` });
}
// check if device name exist in devices
let {data:devices,error} = readJsonFile(filePath);
if (!devices) {
    return res.status(404).json({ success: false, error: `File : "${fileName}" not found` });
}
const existingDevice = devices[deviceName];
if (!deviceName || !existingDevice) {
    return res.status(400).json({ success: false, message: 'Device not found' });
}
// update device
if (deviceName !== body['DNS Name'] && body['DNS Name'] in devices) {
    return res.status(400).json({ success: false, message: `${device.name} already exists` });
}
// check if department , location , IPAdress , Device Type is not empty individually
if (!body['Department'] || !body['Location'] || !body['IP Address'] || !body['Device Type']) {
    return res.status(400).json({ success: false, message: 'Department, Location, IP Address, Device Type are required' });
}
const newDevice={}
Object.keys(existingDevice).forEach((key) => {
    newDevice[key] = body[key] || existingDevice[key];
});

delete devices[deviceName];
const newdeviceName = body['DNS Name']; 

devices[newdeviceName] = newDevice;
// can we sort the keys with keys and save it 
devices = Object.keys(devices).sort().reduce((obj, key) => {
    obj[key] = devices[key];
    return obj;
}, {});
fs.writeFile(filePath, JSON.stringify(devices, null, 2), 'utf8', (err) => {
    if (err) {
        return res.status(500).json({ success: false, error: 'Error writing to devices file' });
    }
    return
});
return res.status(200).json({
    success: true,
    message: 'Device updated successfully',
    device: newDevice,
});
// 
}
catch(err){
    return res.status(500).json({ success: false, message: err.message });
}
});

router.post('/device/add/:fileName', checkAuthorazation,async (req, res) => {
try{
const {fileName} = req.params;
const filePath =`./config/${fileName}`;
const body = req.body;
const deviceName = body['DNS Name'];
const user=req.user;
// check if the filename user has access to
let filepermitted=checkFilePermitted(user.files,fileName);
if(!filepermitted){
    return res.status(401).json({ success: false, error: `User does not have permission to access this file ${fileName}` });
}
if (!body['DNS Name'] || !body['Department'] || !body['Location'] || !body['IP Address'] || !body['Device Type']) {
    return res.status(400).json({ success: false, message: 'DNS Name, Department, Location, IP Address, Device Type are required' });
}

// check ip address is valid
const ipPattern = new RegExp('^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$');
if (!ipPattern.test(body['IP Address'])) {
    return res.status(400).json({ success: false, message: 'Invalid IP Address' });
}

let {data:devices,error} = readJsonFile(filePath);
if (!devices) {
    return res.status(404).json({ success: false, error: `File : "${fileName}" not found` });
}
if (!deviceName  || deviceName in devices) {
    return res.status(400).json({ success: false, message: 'Invalid device name' });
}
// check if device name atleast 3 characters
if (deviceName.length < 3) {
    return res.status(400).json({ success: false, message: 'Device name must be at least 3 characters' });
}
const newDevice={}
newDevice['DNS Name'] = body['DNS Name'];
newDevice['Department'] = body['Department'];
newDevice['Location'] = body['Location'];
newDevice['IP Address'] = body['IP Address'];
newDevice['Device Type'] = body['Device Type'];
newDevice['Description'] = body['Description'];
newDevice['Alert Enable'] = body['Alert Enable'] || true;
newDevice['Owner'] = body['Owner'] || 'N/A';
newDevice['Actions'] = body['Actions'] || 'SSH';
newDevice['snoozeTime'] = 0;
newDevice['snoozed'] = false;
devices[newDevice['DNS Name']] = newDevice;
fs.writeFile
(filePath, JSON.stringify(devices, null, 2), 'utf8', (err) => {
    if (err) {
        return res.status(500).json({ success: false, error: 'Error writing to devices file' });
    }
    return res.status(200).json({
        success: true,
        message: 'Device added successfully',
        device: newDevice,
    });
  });
  }
catch(err){
    return res.status(500).json({ success: false, message: err.message });
}
});
router.delete('/device/:fileName', checkAuthorazation,async (req, res) => {
try{
const {fileName} = req.params;
const deviceName = req.query.deviceName;
const filePath =`./config/${fileName}`;
const user=req.user;
// check if the filename user has access to
let filepermitted=checkFilePermitted(user.files,fileName);
if(!filepermitted){
    return res.status(401).json({ success: false, error: `User does not have permission to access this file ${fileName}` });
}

let {data:devices,error} = readJsonFile(filePath);
if (!devices) {
    return res.status(404).json({ success: false, error: `File : "${fileName}" not found` });
}
if (!deviceName || !(deviceName in devices)) {
    return res.status(400).json({ success: false, message: 'Invalid device name' });
}
delete devices[deviceName];
fs.writeFile
(filePath, JSON.stringify(devices, null, 2), 'utf8', (err) => {
    if (err) {
        return res.status(500).json({ success: false, error: 'Error writing to devices file' });
    }
    return res.status(200).json({
        success: true,
        message: 'Device deleted successfully',
    });
});
} 
catch(err){
    return res.status(500).json({ success: false, message: err.message });
}
});

module.exports=router;