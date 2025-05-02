const fs=require('fs'); 
const os=require('os');
const readJsonFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath
        )) {
          return {data:null,error:`${filePath} File not found`};
        }
        const file = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(file);
        return {data:data,error:false}
    }
    catch (err) {
        return {data:null,error:err.message}
    }
}
const getuuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// Function to load users from file (only when needed)
const loadUsers = async (USERS_FILE,usersCache) => {
    if (!usersCache) {
      try {
        const data = await readJsonFile(USERS_FILE);
        usersCache = JSON.parse(data);
      } catch (error) {
        console.error(`Error reading users file: ${error.message}`);
        usersCache = {};
      }
    }
    return usersCache;
  };
  
  // Function to save users to file (only when necessary)
  const saveUsers = (USERS_FILE,usersCache) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersCache, null, 2));
  };
const checkFilePermitted= (files,filename)=>{
  // first only check the user files is *
  if(files.includes('*')){
    return true;
  }
  return files.includes(filename);
}  

exports.readJsonFile = readJsonFile;
exports.getuuid = getuuid;
exports.saveUsers = saveUsers;
exports.checkFilePermitted = checkFilePermitted;