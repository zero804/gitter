// troupe service to deliver mails to mongo database

var persistence = require("./../../server/services/persistence-service.js")
 
var troupeService = require("./../../server/services/troupe-service.js");

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
	
	
	
	if (fromName.indexOf("<") > 0)  {
	  var fromEmail = fromName.substring(fromName.indexOf("<") + 1, fromName.indexOf(">"));
	  fromName = fromName.substring(0, fromName.indexOf("<")-1);					 
	 } 
	else { 
	   var fromEmail = fromName;
	 }
	
	
	connection.logdebug("To: " + JSON.stringify(toName));
	connection.logdebug("From: " + fromName);
	connection.logdebug("Email: " + fromEmail);
	
	troupeService.validateTroupeEmail({ to: toName, from: fromEmail}, function(err, troupe) {
	  if (err) return next(DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.");
	  if (!troupe) return next (DENY, "Sorry, either we don't know you, or we don't know the recipient. You'll never know which.")  
	  
	  var storeMail = new persistence.Email();
	  storeMail.from = fromEmail;
	  storeMail.troupeId = troupe.id;
	  storeMail.subject = subject;
	  storeMail.date = date;
	  storeMail.fromName = fromName;
	  storeMail.mail = lines.join('');
	  storeMail.delivered = false;
	  
	
	  storeMail.save(function(err) {
		if (err) return next(DENY);
		 
		connection.logdebug("Stored the email.");

		return next(OK);
	  });
	  
	  
																		  
																		  
	})
	
	// Make the FromName field look better. Sometimes From can only be an email address, other times it has a name with the email address in <>
	//if (fromName.indexOf("<") > 0)  {
//		fromName = fromName.substring(0, fromName.indexOf("<")-1);					 
//	 }

};
