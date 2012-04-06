// troupe service to redeliver mails to troupe users
var mailService = require("./../../server/services/mail-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var nodemailer = require("nodemailer");
var TroupeSESTransport = require("./../../server/utils/mail/troupe-ses-transport"),
    RawMailComposer = require("./../../server/utils/mail/raw-mail-composer");

// Create an Amazon SES transport object
var sesTransport = new TroupeSESTransport({
  AWSAccessKeyID: "AKIAJU4GW2JINRMDW66Q",
  AWSSecretKey: "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",
  ServiceUrl: "https://email.us-east-1.amazonaws.com" // optional
});

function continueResponse(next) {
  //return next (DENY, "Debug mode bounce.");
  next();
};

exports.hook_queue = function(next, connection) {
	var mailFrom = connection.transaction.mail_from;
	var rcptTo = connection.transaction.rcpt_to;
  var transaction = connection.transaction;
  var from = mailFrom.address();

  // TODO: handle each recipient!
  var to = rcptTo[0].address();

	troupeService.validateTroupeEmailAndReturnDistributionList({ to: to, from: from}, function(err, troupe, fromUser, emailAddresses) {
    if (err) return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");
    if (!troupe) return next (DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");

    if(!emailAddresses) {
      /* If  there's no-one to distribute the email to, don't continue */
      return continueResponse(next);
    }

    /* Once we've got the troupe email verified, we should be able to get rid of this */
    transaction.remove_header("From");
    transaction.add_header("From", fromUser.displayName + " <" + fromUser.email + ">");

    transaction.remove_header("To");
    transaction.add_header("To", troupe.name + " <" + troupe.uri + "@trou.pe>");

    transaction.remove_header("Reply-To");
    transaction.add_header("Reply-To", troupe.name + "<" + troupe.uri + "@trou.pe>");

    transaction.remove_header("Return-Path");
    transaction.add_header("Return-Path", "troupe-bounces@trou.pe");

    var mail = new RawMailComposer({
      source: troupe.uri + "@trou.pe",
      destinations: emailAddresses,
      message: transaction.data_lines.join('')
    });

    sesTransport.sendMail(mail, function(error, response){
        if (error) {
          connection.logdebug(error);
        } else {
          connection.logdebug("sent" + response.message);
        }

        return continueResponse(next);
    });


  });

};


