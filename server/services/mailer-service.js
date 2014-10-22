/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env            = require('../utils/env');
var stats          = env.stats;

var nodemailer     = require('nodemailer');
var troupeTemplate = require('../utils/troupe-template');
var nconf          = require('../utils/config');
var winston        = require('../utils/winston');
var Q              = require('q');
// var emailify       = require('emailify');

var mandrillClient = require('mandrill-api/mandrill');
var mandrill = new mandrillClient.Mandrill(env.config.get('mandrill:apiKey'));
var cdn = require('../web/cdn');

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
  if (options.templateFile === 'added_to_room') return addedToRoomViaMandrill(options, done);
  if (options.templateFile === 'invitation')    return invitationViaMandrill(options, done);
  if (options.templateFile === 'invitation-reminder')    return invitationViaMandrill(options, done);

  var d = Q.defer();

  var tracking = options.tracking || {}; // avoids failure if no tracking information is present

  var htmlTemplateFile = "emails/" + options.templateFile + "_html";

  troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
    if(err) return d.reject(err);

    var headerHtml = headerTemplate(options.data);
    var html = htmlTemplate(options.data);
    var footerHtml = footerTemplate(options.data);

    var compiledHtmlEmail = headerHtml + "\n" + html + "\n" + footerHtml;

    // emailify.parse(compiledHtmlEmail, 'utf8', function(err,htmlContent) {
      var htmlContent = compiledHtmlEmail;
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

          if (err) {
            winston.error("SMTP Email Error", { exception: err });
            return d.reject(err);
          }

          winston.info("Email sent successfully through SMTP", { message: response.message });
          stats.event(tracking.event, tracking.data);

          d.resolve();
        });
      });
    });
  // });

  return d.promise.nodeify(done);
};

function addedToRoomViaMandrill(options, done) {
  var d = Q.defer();
  var templateName = 'added-to-room';
  var tracking = options.tracking || {};

  var data = options.data;
  var templateContent = [];

  var message = {
    subject:    options.subject,
    from_email: 'support@gitter.com',
    from_name:  options.fromName,
    to:         [{email: options.to, type: 'to'}],
    tags:       ['added-to-room'], // used for A/B testing
    merge_vars: [{
      rcpt: options.to,
      vars: [
       {name: 'NAME',    content: data.recipientName},
       {name: 'SENDER',  content: data.senderName},
       {name: 'ROOMURI', content: data.roomUri},
       {name: 'ROOMURL', content: data.roomUrl},
       {name: 'UNSUB',   content: data.unsubscribeUrl},
       {name: 'LOGOURL', content: cdn('images/logo-text-blue-pink.png', {email: true})}
      ]
    }]
  };

  mandrill.messages.sendTemplate({
    template_name:    templateName,
    template_content: templateContent,
    message:          message
  }, function() {
    stats.event(tracking.event, tracking.data);
    d.resolve();
  }, function(err) {
    d.reject(err);
  });

  return d.promise.nodeify(done);
}

function invitationViaMandrill(options, done) {
  var d = Q.defer();
  var templateName = options.templateFile;
  var tracking = options.tracking || {};

  var data = options.data;
  var templateContent = [];
  var message = {
    subject:    options.subject,
    from_email: 'support@gitter.com',
    from_name:  options.fromName,
    to:         [{ email: options.to, type: 'to' }],
    tags:       [options.templateFile], // used for A/B testing
    merge_vars: [{
      rcpt: options.to,
      vars: [
       { name: 'NAME',    content: data.recipientName },
       { name: 'DATE',  content: data.date },
       { name: 'SENDER',  content: data.senderName },
       { name: 'ROOMURI', content: data.roomUri },
       { name: 'ROOMURL', content: data.roomUrl },
       { name: 'LOGOURL', content: cdn('images/logo-text-blue-pink.png', { email: true }) }
      ]
    }]
  };

  mandrill.messages.sendTemplate({
    template_name:    templateName,
    template_content: templateContent,
    message:          message
  }, function() {
    stats.event(tracking.event, tracking.data);
    d.resolve();
  }, function(err) {
    d.reject(err);
  });

  return d.promise.nodeify(done);
}
