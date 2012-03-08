// troupe

// Ok, what this does is:
//   1) Check the sender is valid - for now this is just seeing if the user exists, it should match user to troupe when we have that mapping
//   2) Check the recipient matches a troupe URI
//   3) Stores this all on Mongo, including the full message payload
//
// If (1) or (2) fail, we bounce the message
//
// What needs to happen next is to deliver the message to the Troupe recipients

var persistence = require("./../../server/services/persistence-service.js")

var who; //who is the email TO mapped as a troupe URI
var from;

// let's look for the sender first
exports.hook_mail = function(next,connection,params) {

  var tmp = params[0].toString();
  var loc = tmp.indexOf(">");
  from = tmp.substring(1,loc);
  
  
  // for now we'll just look up to see if the SENDER exists in our user table.
  // we actually want to match them to the Troupe to make sure they are in the Troupe and can send.
  
    persistence.User.findOne({
		email : from
	  }, function(err, user) {
		if (err) {
		  callbackFunction(err, null);
		}
	
		if (user == null) {
		  connection.logdebug("SENDER CHECK: Unknown sender - bounce the message");
		  return next(DENY, "Sorry, I don't know you.");
		  
		} else {
		  connection.logdebug("SENDER CHECK: Valid sender (" + from + ") - so far so good");
		  next();
		  return true;
		  
		}
	  });
    
}

// now let's look for the recipient and match that to a Troupe
exports.hook_rcpt = function(next, connection, params) {
  var rcpt = params[0];
  var tmp;
 

  tmp = rcpt.toString();
  var loc = tmp.indexOf("@");
  who = tmp.substring(1, loc);

  persistence.Troupe.findOne({
    uri : who
  }, function(err, whatTroupe) {
    if (err) {
      callbackFunction(err, null);
    }

    if (whatTroupe == null) {
      connection.logdebug("RECIPIENT TROUPE CHECK: Unknown Troupe (" + who + ") - bounce the message");
	  return next(DENY, "Nope, that Troupe doesn't exist.");
	  
    } else {
      connection.logdebug("RECIPIENT TROUPE CHECK: Valid Troupe (" + who + ") - deliver the message");
	  
	  
	  next();
	  return true;
	  
    }
  });

  
}


// now lets move on and deliver the mail to the database

exports.hook_queue = function(next, connection) {
	
	// Get some stuff from the header to store later
	var subject = connection.transaction.header.get("Subject");
	var date = connection.transaction.header.get("Date");
	var fromName = connection.transaction.header.get("From");
	
	// Make the FromName field look better. Sometimes From can only be an email address, other times it has a name with the email address in <>
	if (fromName.indexOf("<") > 0)  {
		fromName = fromName.substring(0, fromName.indexOf("<")-1);					 
	 }
	
	
	// pull the message payload and bounce it if it's blank
    var lines = connection.transaction.data_lines;
    if (lines.length === 0) {
        return next(DENY);
    }
    
	
	 var storeMail = new persistence.Email();
	  storeMail.from = from.toString();
	  storeMail.troupeURI = who.toString();
	  storeMail.subject = subject;
	  storeMail.date = date;
	  storeMail.fromName = fromName;
	  storeMail.mail = lines.join('');
	  
	  
	
	  storeMail.save(function(err) {
		if(err == null) {
		 
		  connection.logdebug("Stored the email.");

		  return next(OK);
		}
	  });
};
