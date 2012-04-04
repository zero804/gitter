var mailService = require("./services/mail-service.js");
var troupeService = require("./services/troupe-service.js");
var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "troupe@hipgeeks.net",
        pass: "r3k3n44r"
    }
});

function sendEmail(mail) {
  console.log("sendEmail passed: " + JSON.stringify(mail));
  troupeService.findMemberEmails(mail.troupeId, function(err,users) {
    if (err) {
      console.log('Error:' + err);
      process.exit(2);
    }

    console.log('Subject: ' + mail.subject + " Troupe: " + mail.troupeId);

    while(users.length > 0) {
      var u1 = users.shift();
      console.log("User: " + u1);

      var mailOptions = {
        from: mail.fromName + " <" + mail.from + ">",
        to: u1,
        subject: "[Troupe] " + mail.subject,
        text: mail.plainText,
        html: mail.richText
      };

      smtpTransport.sendMail(mailOptions, function(error, response){
          if(error){
              console.log(error);
          }else{
              console.log("Message sent: " + response.message);
          }
      });

    } // end user iteration while


  });


}

console.log('Starting');

mailService.findUndistributed(function(err,mails) {
	if (err) {
		console.log('Error getting emails');
		process.exit(1);
	}
	console.log('Got some mails: ' + mails.length);

	while(mails.length > 0) {
    var p1 = mails.shift();
    sendEmail(p1);
    mailService.removeMailQueueItem(p1._id);
    console.log("Removed the item from the queue");
  } 

  smtpTransport.close(); // shut down the connection pool, no more messages

  //process.exit(0);

});

