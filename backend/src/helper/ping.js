const ping = require('ping');

const pingme = async (ip) => {
  if (!ip) {
    return { success: false, error: 'IP address is required' };
  }

  try {
    const result = await ping.promise.probe(ip);
    return { success: true, alive: result.alive };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = pingme;
