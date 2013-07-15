/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var workerQueue = require('../utils/worker-queue');
var queue = workerQueue.queue('email', {}, function() {

  var nodemailer = require('nodemailer'),
      troupeTemplate = require('../utils/troupe-template'),
      nconf = require('../utils/config'),
      winston = require("winston");

  var logEmailToLogger = nconf.get('logging:logEmailContents');

  var sesTransport = nodemailer.createTransport("SES", {
      AWSAccessKeyID: nconf.get("amazon:accessKey"),
      AWSSecretKey: nconf.get("amazon:secretKey")
  });

  var footerTemplate = null;
  var headerTemplate = null;
  troupeTemplate.compile("emails/footer", function(err, t) {
    if(err) {
      winston.error("Error. Unable to compile footer template. ", { exception: err });
      throw new Error(err);
    }
    footerTemplate = t;
  });

  troupeTemplate.compile("emails/header", function(err, t) {
    if(err) {
      winston.error("Error. Unable to compile header template. ", { exception: err });
      throw new Error(err);
    }
    headerTemplate = t;
  });

  return function sendEmailDirect(options, done) {
    var htmlTemplateFile = "emails/" + options.templateFile + "_html";
    troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
      if(err) return winston.error("Unable to load HTML template", err);
      var headerHtml = headerTemplate(options.data);
      var html = htmlTemplate(options.data);
      var footerHtml = footerTemplate(options.data);

      var plaintextTemplateFile = "emails/" + options.templateFile;
      troupeTemplate.compile(plaintextTemplateFile, function(err, plaintextTemplate) {
        if(err) return winston.error("Unable to load plaintext template", { exception: err });

        var plaintext = plaintextTemplate(options.data);
        if(logEmailToLogger) {
          winston.info("Sending email", plaintext);
        }

        if(/@troupetest.local/.test(options.from) || /@troupetest.local/.test(options.to)) {
          winston.info('Skipping send for troupetest.local');
          return done();
        }

        sesTransport.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: headerHtml + "\n" + html + "\n" + footerHtml,
          text: plaintext
        }, function(error, response){
          if(error) {
            winston.error("SES Email Error", { exception: error });
            return done(error);
          }

          winston.info("Email sent successfully through SES", { message: response.message });
          done();
        });
      });
    });
  };

});

exports.sendEmail = function(options) {
  queue.invoke(options);
};

