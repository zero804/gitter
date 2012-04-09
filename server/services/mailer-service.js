/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var nodemailer = require('nodemailer'),
    hogan = require('hogan'),
    troupeTemplate = require('../utils/troupe-template'),
    nconf = require("../utils/config").configure();

var sesTransport = nodemailer.createTransport("SES", {
    AWSAccessKeyID: nconf.get("amazon:accessKey"),
    AWSSecretKey: nconf.get("amazon:secretKey")
});

module.exports = {
    sendEmail: function(options) {
      var htmlTemplateFile = options.templateFile + "_html";
      var htmlTemplate = troupeTemplate.compile(htmlTemplateFile);
      var html = htmlTemplate.render(options.data);

      var plaintextTemplateFile = options.templateFile;
      var plaintextTemplate = troupeTemplate.compile(plaintextTemplateFile);
      var plaintext = plaintextTemplate.render(options.data);

      console.log(plaintext);

      sesTransport.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: html,
        text: plaintext
      }, function(error, response){
        if(error) {
          console.log(error);
        }else{
          console.log("Message sent: " + response.message);
        }
      });

    }
};
