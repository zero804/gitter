// troupe service to deliver mails to mongo database

var persistence = require("./../../server/services/persistence-service.js");
 
var troupeService = require("./../../server/services/troupe-service.js");

exports.hook_data = function (next, connection) {
    // enable mail body parsing
    connection.transaction.parse_body = 1;
    next();
};

exports.hook_queue = function(next, connection) {
	// Get some stuff from the header to store later
	var subject = connection.transaction.header.get("Subject");
	var date = connection.transaction.header.get("Date");
	var fromName = connection.transaction.header.get("From");
	var toName = connection.transaction.header.get("To");

	
	var lines = connection.transaction.data_lines;
    if (!lines) return next(DENY);
  
	toName = toName.replace(/\n/g,"");
	fromName = fromName.replace(/\n/g,"");
	subject = subject.replace(/\n/g,"");
	
	// do some string parsing for email formats such as Name <email>
	
	if (fromName.indexOf("<") > 0)  {
     var fromEmail = fromName.substring(fromName.indexOf("<") + 1, fromName.indexOf(">"));
	  fromName = fromName.substring(0, fromName.indexOf("<")-1);					 
	 } 
	else { 
	   var fromEmail = fromName;
	 }
	 
	// We're going to extract a message preview to store in mongo so we don't have to parse the email every time someone views it
	// First we check to see if the message is single part or multipart and then we extract the bodytext or plaintext bodytext and then we chop it down to 255 chars
	 
	if (connection.transaction.body.children.length==0) {
		//connection.logdebug("Single part message");
		var preview = connection.transaction.body.bodytext;
	}
	else {
		//connection.logdebug("Multipart message");
		var preview = connection.transaction.body.children[0].bodytext;
	}

if (preview.length>255) preview=preview.substring(0,255);
	
	//connection.logdebug("Body: " + JSON.stringify(connection.transaction.body.bodytext));
    //connection.logdebug("Children: " + JSON.stringify(connection.transaction.body.children.length));
	//connection.logdebug("Child: " + connection.transaction.body.children[0].bodytext);
	//connection.logdebug("To: " + JSON.stringify(toName));
	//connection.logdebug("From: " + fromName);
	//connection.logdebug("Email: " + fromEmail);
	//connection.logdebug("Preview: " + preview);
	//connection.logdebug("Mail Body : "+ lines.join(''));
	
	troupeService.validateTroupeEmail({ to: toName, from: fromEmail}, function(err, troupe) {
	  if (err) return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");
	  if (!troupe) return next (DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.")  
	  
	  troupeService.storeEmail({ fromEmail: fromEmail, troupeID: troupe.ID, subject: subject, date: date, fromName: fromName, preview: preview, mailBody: lines.join('')}, function(err) {
	   if (err) return next(DENY, "Failed to store the email");
		 
		connection.logdebug("Stored the email.");

		return next(OK);
	  });
	  
	  
						if 												  
																		  
	})
	
	
};
