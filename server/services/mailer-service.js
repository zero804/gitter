/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";


var nodemailer     = require('nodemailer');
var troupeTemplate = require('../utils/troupe-template');
var nconf          = require('../utils/config');
var winston        = require('../utils/winston');
var Q              = require('q');
var emailify       = require('emailify');

var logEmailToLogger = nconf.get('logging:logEmailContents');

var smtpTransport = nodemailer.createTransport("SMTP", {
    host: 'smtp.mandrillapp.com',
    port: 587,
    auth : {
      user: nconf.get("mandrill:username"),
      pass: nconf.get("mandrill:apiKey")
    }
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

exports.sendEmail = function(options, done) {
  var d = Q.defer();

  var htmlTemplateFile = "emails/" + options.templateFile + "_html";

  troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
    if(err) return d.reject(err);

    var headerHtml = headerTemplate(options.data);
    var html = htmlTemplate(options.data);
    var footerHtml = footerTemplate(options.data);

    var compiledHtmlEmail = headerHtml + "\n" + html + "\n" + footerHtml;

    emailify.parse(compiledHtmlEmail, 'utf8', function(err,htmlContent) {
      var plaintextTemplateFile = "emails/" + options.templateFile;
      troupeTemplate.compile(plaintextTemplateFile, function(err, plaintextTemplate) {
        if(err) return d.reject(err);

        var plaintext = plaintextTemplate(options.data);
        if(logEmailToLogger) {
          winston.info("Sending email", plaintext);
        }

        if(/@troupetest.local/.test(options.from) || /@troupetest.local/.test(options.to)) {
          winston.info('Skipping send for troupetest.local');
          return d.resolve();
        }

        var headers;
        if(options.unsubscribe) {
          headers = {
            'List-Unsubscribe': '<' + options.unsubscribe + '>'
          };
        }
        smtpTransport.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: htmlContent,
          text: plaintext,
          headers: headers
        }, function(err, response){

          if(err) {
            winston.error("SMTP Email Error", { exception: err });
            return d.reject(err);
          }

          winston.info("Email sent successfully through SMTP", { message: response.message });
          d.resolve();
        });
      });
    });
  });

  return d.promise.nodeify(done);
};

