/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env            = require('../utils/env');
var stats          = env.stats;

//var nodemailer     = require('nodemailer');
var troupeTemplate = require('../utils/troupe-template');
var nconf          = require('../utils/config');
var winston        = require('../utils/winston');
var Q              = require('q');
// var emailify       = require('emailify');

var mandrillClient = require('mandrill-api/mandrill');
var mandrill = new mandrillClient.Mandrill(env.config.get('mandrill:apiKey'));
var cdn = require('../web/cdn');

var logEmailToLogger = nconf.get('logging:logEmailContents');

//var smtpTransport = nodemailer.createTransport("SMTP", {
//    host: 'smtp.mandrillapp.com',
//    port: 587,
//    auth : {
//      user: nconf.get("mandrill:username"),
//      pass: nconf.get("mandrill:apiKey")
//    }
//});

//var footerTemplate = null;
//var headerTemplate = null;
//troupeTemplate.compile("emails/footer", function(err, t) {
//  if(err) {
//    winston.error("Error. Unable to compile footer template. ", { exception: err });
//    throw new Error(err);
//  }
//  footerTemplate = t;
//});
//
//troupeTemplate.compile("emails/header", function(err, t) {
//  if(err) {
//    winston.error("Error. Unable to compile header template. ", { exception: err });
//    throw new Error(err);
//  }
//  headerTemplate = t;
//});

exports.sendEmail = function(options, done) {
  options.templateName = options.templateFile.replace(/\_/g,'-');

  if (options.templateFile === 'added_to_room')       return addedToRoomViaMandrill(options, done);
  if (options.templateFile === 'invitation')          return invitationViaMandrill(options, done);
  if (options.templateFile === 'invitation-reminder') return invitationViaMandrill(options, done);
  if (options.templateFile === 'unread_notification') return unreadViaMandrill(options, done);
  if (options.templateFile === 'created_room')        return createdRoomViaMandrill(options, done);


  //var d = Q.defer();

  //var tracking = options.tracking || {}; // avoids failure if no tracking information is present

  //var htmlTemplateFile = "emails/" + options.templateFile + "_html";

  //troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
  //  if(err) return d.reject(err);

  //  var headerHtml = headerTemplate(options.data);
  //  var html = htmlTemplate(options.data);
  //  var footerHtml = footerTemplate(options.data);

  //  var compiledHtmlEmail = headerHtml + "\n" + html + "\n" + footerHtml;

  //  // emailify.parse(compiledHtmlEmail, 'utf8', function(err,htmlContent) {
  //    var htmlContent = compiledHtmlEmail;
  //    var plaintextTemplateFile = "emails/" + options.templateFile;
  //    troupeTemplate.compile(plaintextTemplateFile, function(err, plaintextTemplate) {
  //      if(err) return d.reject(err);

  //      var plaintext = plaintextTemplate(options.data);
  //      if(logEmailToLogger) {
  //        winston.info("Sending email", plaintext);
  //      }

  //      if(/@troupetest.local/.test(options.from) || /@troupetest.local/.test(options.to)) {
  //        winston.info('Skipping send for troupetest.local');
  //        return d.resolve();
  //      }

  //      var headers;
  //      if(options.unsubscribe) {
  //        headers = {
  //          'List-Unsubscribe': '<' + options.unsubscribe + '>'
  //        };
  //      }
  //      smtpTransport.sendMail({
  //        from: options.from,
  //        to: options.to,
  //        subject: options.subject,
  //        html: htmlContent,
  //        text: plaintext,
  //        headers: headers
  //      }, function(err, response){

  //        if (err) {
  //          winston.error("SMTP Email Error", { exception: err });
  //          return d.reject(err);
  //        }

  //        winston.info("Email sent successfully through SMTP", { message: response.message });
  //        stats.event(tracking.event, tracking.data);

  //        d.resolve();
  //      });
  //    });
  //  });
  //// });

  //return d.promise.nodeify(done);
};

function addedToRoomViaMandrill(options, done) {

  var vars = [
    {name: 'NAME',    content: options.data.recipientName},
    {name: 'SENDER',  content: options.data.senderName},
    {name: 'ROOMURI', content: options.data.roomUri},
    {name: 'ROOMURL', content: options.data.roomUrl},
    {name: 'UNSUB',   content: options.data.unsubscribeUrl},
    {name: 'LOGOURL', content: cdn('images/logo-text-blue-pink.png', {email: true})}
  ];

  return sendMail(vars, options, done);
}

function invitationViaMandrill(options, done) {

  var vars = [
    { name: 'NAME',    content: options.data.recipientName },
    { name: 'DATE',    content: options.data.date },
    { name: 'SENDER',  content: options.data.senderName },
    { name: 'ROOMURI', content: options.data.roomUri },
    { name: 'ROOMURL', content: options.data.roomUrl },
    { name: 'LOGOURL', content: cdn('images/logo-text-blue-pink.png', { email: true }) }
  ];

  return sendMail(vars, options, done);
}

function unreadViaMandrill(options, done) {

  var htmlTemplateFile = "emails/" + options.templateFile + "_html";
  var plaintextTemplateFile = "emails/" + options.templateFile;

  var html;
  var plaintext;

  troupeTemplate.compile(htmlTemplateFile, function(err, htmlTemplate) {
    html = htmlTemplate(options.data);

    troupeTemplate.compile(plaintextTemplateFile, function(err, plaintextTemplate) {
      plaintext = plaintextTemplate(options.data);

      var vars = [
        {name: 'NAME',       content: options.data.recipientName},
        {name: 'SENDER',     content: options.data.senderName},
        {name: 'ROOMURI',    content: options.data.roomUri},
        {name: 'ROOMURL',    content: options.data.roomUrl},
        {name: 'UNSUB',      content: options.data.unsubscribeUrl},
        {name: 'LOGOURL',    content: cdn('images/logo-text-blue-pink.png', {email: true})},
        {name: 'HTML',       content: html},
        {name: 'PLAINTEXT',  content: plaintext}
      ];

      return sendMail(vars, options, done);
    });
  });
}

function createdRoomViaMandrill(options, done) {
  var twitterSnippet = options.data.isPublic ? '<tr><td><br><a href="' + options.data.twitterUrl + '" style="text-decoration: none" target="_blank" class="button-twitter">Share on Twitter</a></td></tr>' : '';
  var orgNote = options.data.isOrg ? '<p>Note that only people within your organisation can join this room.</p>' : '';

  var vars = [
    {name: 'NAME',        content: options.data.recipientName},
    {name: 'SENDER',      content: options.data.senderName},
    {name: 'ROOMURI',     content: options.data.roomUri},
    {name: 'ROOMURL',     content: options.data.roomUrl},
    {name: 'UNSUB',       content: options.data.unsubscribeUrl},
    {name: 'LOGOURL',     content: cdn('images/logo-text-blue-pink.png', {email: true})},
    {name: 'TWITTERURL',  content: twitterSnippet},
    {name: 'ORGNOTE',     content: orgNote},
    {name: 'ROOMTYPE',    content: options.data.roomType}
  ];

  return sendMail(vars, options, done);
}

function sendMail(vars, options, done) {
  var d = Q.defer();
  var templateName = options.templateName;
  var tracking = options.tracking || {};

  var message = {
    subject:    options.subject,
    from_email: 'support@gitter.com',
    from_name:  options.fromName,
    to:         [{ email: options.to, type: 'to' }],
    tags:       [options.templateName], // used for A/B testing
    merge_vars: [{ rcpt: options.to, vars: vars }]
  };

  mandrill.messages.sendTemplate({
    template_name:    templateName,
    template_content: [],
    message:          message
  }, function() {
    if(logEmailToLogger) winston.info('Sent email: ' + templateName + ', check Mandrill');
    stats.event(tracking.event, tracking.data);
    d.resolve();
  }, function(err) {
    d.reject(err);
  });

  return d.promise.nodeify(done);
}

