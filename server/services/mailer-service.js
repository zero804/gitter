var nodemailer = require('nodemailer'),
    hogan = require('hogan'),
    troupeTemplate = require('../utils/troupe-template');

nodemailer.SMTP = {
    host: 'smtp.sendgrid.net',
    port: 587,
    ssl: false,
    use_authentication: true,
    user: 'troupe',
    pass: 'r3k3n44r'
}

module.exports = {
    sendEmail: function(options) {
      var htmlTemplateFile = options.templateFile + "_html";
      var htmlTemplate = troupeTemplate.compile(htmlTemplateFile);
      var html = htmlTemplate.render(options.data);
      
      var plaintextTemplateFile = options.templateFile;
      var plaintextTemplate = troupeTemplate.compile(plaintextTemplateFile);
      var plaintext = plaintextTemplate.render(options.data);
      
      console.log(plaintext);
      
      // send an e-mail
      nodemailer.send_mail(
          // e-mail options
          {
            sender: 'troupe@hipgeeks.net',
            to: options.to,
            subject: options.subject,
            html: html,
            body: plaintext
          },
          // callback function
          function(error, success){
            if(!success) {
              console.log(JSON.stringify(error));
            } else {
              console.log("Email to " + options.to + " successfully sent.");
            }
          }
      );

    }
};
