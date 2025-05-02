
require('dotenv').config();
const nodemailer = require('nodemailer');
const mailgen = require('mailgen');
const config = {
  host: process.env.MAILHOST,
  port: 25,
  secure: false, // use TLS
  tls: {
      ciphers: 'SSLv3'
  }
}
const transporter = nodemailer.createTransport(config);

const mailGenerator = new mailgen({
  theme: 'default',
  product: {
    name: process.env.PRODUCT_NAME || 'N/A',
    link: process.env.PRODUCT_LINK || 'N/A',
  },
});

  const sendMail = (subject,mailList,response) => {

const emailBody = mailGenerator.generate(response);
const message = {
    from: process.env.EMAIL_USER,
    to: mailList.join(',') || '<email>>',
    subject: subject || 'Alert unable to ping device',
    html: emailBody,
  };
  console.log('Sending email:', message);
  transporter.sendMail(message, (err, info) => {
    if (err) {
      return { error: `Error: ${err}` }
    }
    return { response: info };
  });
}
module.exports = sendMail;
