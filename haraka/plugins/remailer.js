// troupe service to redeliver mails to troupe users
var mailService = require("./../../server/services/mail-service.js");
var troupeService = require("./../../server/services/troupe-service.js");
var nodemailer = require("nodemailer");
var console = require("console");
var TroupeSESTransport = require("./../../server/utils/mail/troupe-ses-transport"),
    RawMailComposer = require("./../../server/utils/mail/raw-mail-composer"),
    nconf = require("./../../server/utils/config").configure();


var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

// Create an Amazon SES transport object
var sesTransport = new TroupeSESTransport({
  AWSAccessKeyID: nconf.get("amazon:accessKey"),
  AWSSecretKey: nconf.get("amazon:secretKey")
});

function continueResponse(next) {
  //return next (DENY, "Debug mode bounce.");
  return next(OK);
}

exports.hook_queue = function(next, connection) {
  console.log("Starting remailer");
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

    console.log("Delivering emails");

    var newSubject = transaction.header.get("Subject");
    newSubject = newSubject ? newSubject : "";

    if(newSubject.indexOf("[" + troupe.name + "]") < 0) {
      newSubject = "[" + troupe.name + "] " + newSubject;
      transaction.remove_header("Subject");
      transaction.add_header("Subject", newSubject);
    }

    transaction.remove_header("From");
    transaction.add_header("From", fromUser.displayName + " <" + fromUser.email + ">");

    transaction.remove_header("To");
    transaction.add_header("To", troupe.name + " <" + troupe.uri + emailDomainWithAt + ">");

    transaction.remove_header("Reply-To");
    transaction.add_header("Reply-To", troupe.name + "<" + troupe.uri + emailDomainWithAt + ">");

    transaction.remove_header("Return-Path");
    transaction.add_header("Return-Path", "troupe-bounces" + emailDomainWithAt);

    var mail = new RawMailComposer({
      source: troupe.uri + emailDomainWithAt,
      destinations: emailAddresses,
      message: transaction.data_lines.join('')
    });

    sesTransport.sendMail(mail, function(error, response){
        if (error) {
          connection.logdebug(error);
        } 
        console.log("Apparently I successfully delivered some mails");
        return continueResponse(next);
    });


  });

};


