/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var kue = require('../utils/kue'),
    _ = require('underscore'),
    jobs;

exports.startWorkers = function() {
  var nodemailer = require('nodemailer'),
      troupeTemplate = require('../utils/troupe-template'),
      nconf = require('../utils/config'),
      winston = require("winston");

  jobs = kue.createQueue();
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


  function sendEmailDirect(options, done) {
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
  }

  jobs.process('email', 20, function(job, done) {
    sendEmailDirect(job.data, done);
  });
};

exports.sendEmail = function(options) {
  if(!jobs) jobs = kue.createQueue();

  jobs.create('email', _.extend(options, { title: "Email to " + options.to }))
    .attempts(5)
    .save();
};

