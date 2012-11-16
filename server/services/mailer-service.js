/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var nodemailer = require('nodemailer'),
    troupeTemplate = require('../utils/troupe-template'),
    nconf = require('../utils/config'),
    winston = require("winston");

var sesTransport = nodemailer.createTransport("SES", {
    AWSAccessKeyID: nconf.get("amazon:accessKey"),
    AWSSecretKey: nconf.get("amazon:secretKey")
});

module.exports = {
    sendEmail: function(options) {
      var htmlTemplateFile = options.templateFile + "_html";
      troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
        if(err) return winston.error("Unable to load HTML template", err);
        var html = htmlTemplate(options.data);

        var plaintextTemplateFile = options.templateFile;
        troupeTemplate.compile(plaintextTemplateFile, function(err, plaintextTemplate) {
          if(err) return winston.error("Unable to load template", err);

          var plaintext = plaintextTemplate(options.data);

          sesTransport.sendMail({
            from: options.from,
            to: options.to,
            subject: options.subject,
            html: html,
            text: plaintext
          }, function(error, response){
            if(error) {
              winston.error("SES Email Error", error);
            } else {
              winston.info("Email sent successfully through SES", response.message);
            }
          });
        });
      });

    }
};
