/*jslint node: true */
"use strict";

var kue = require('kue'),
    jobs = kue.createQueue(),
    _ = require('underscore');

exports.startWorkers = function() {
  var nodemailer = require('nodemailer'),
      troupeTemplate = require('../utils/troupe-template'),
      nconf = require('../utils/config'),
      winston = require("winston");

  var sesTransport = nodemailer.createTransport("SES", {
      AWSAccessKeyID: nconf.get("amazon:accessKey"),
      AWSSecretKey: nconf.get("amazon:secretKey")
  });

  function sendEmailDirect(options, done) {
    var htmlTemplateFile = options.templateFile + "_html";
    troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
      if(err) return winston.error("Unable to load HTML template", err);
      var html = htmlTemplate(options.data);

      var plaintextTemplateFile = options.templateFile;
      troupeTemplate.compile(plaintextTemplateFile, function(err, plaintextTemplate) {
        if(err) return winston.error("Unable to load template", { exception: err });

        var plaintext = plaintextTemplate(options.data);

        sesTransport.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: html,
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

  jobs.process('email', function(job, done) {
    sendEmailDirect(job.data, done);
  });
};

exports.sendEmail = function(options) {
  jobs.create('email', 20, _.extend(options, { title: "Email to " + options.to }))
    .attempts(5)
    .save();
};

