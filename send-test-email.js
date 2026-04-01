require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.GMAIL_USER,
  to: 'clemens.dubberke@googlemail.com',
  subject: 'Test-E-Mail von OMI App',
  text: 'Hallo Clemens,\n\ndies ist eine Test-E-Mail von deiner OMI App.\n\nAlles funktioniert!\n\nViele Grüße,\nOMI App',
  html: '<p>Hallo Clemens,</p><p>dies ist eine <strong>Test-E-Mail</strong> von deiner OMI App.</p><p>Alles funktioniert!</p><p>Viele Grüße,<br>OMI App</p>',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Fehler beim Senden:', error.message);
    process.exit(1);
  } else {
    console.log('E-Mail erfolgreich gesendet:', info.response);
  }
});
