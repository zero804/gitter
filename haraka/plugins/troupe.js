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
	
	
	connection.logdebug("To: " + JSON.stringify(toName));
	connection.logdebug("From: " + fromName);
	
	troupeService.validateTroupeEmail({ to: toName, from: fromName}, function(err, troupe) {
	  if (err) return next(DENY);
	  if (!troupe) return next (DENY);
	  
	  
	  
	  var storeMail = new persistence.Email();
	  storeMail.from = fromName;
	  storeMail.troupeId = troupe.id;
	  storeMail.subject = subject;
	  storeMail.date = date;
	  storeMail.fromName = fromName;
	  storeMail.mail = lines.join('');
	  
	  
	
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
