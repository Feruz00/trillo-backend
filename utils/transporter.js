const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: process.env.USER_ADDRESS,
        pass: process.env.USER_PASSWORD
    }
});

module.exports = transporter;