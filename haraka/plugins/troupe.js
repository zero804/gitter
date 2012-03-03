// troupe

// documentation via: haraka -c /Users/mike/Documents/TroupeGit/troupe1/roger/haraka -h plugins/troupe

// Put your plugin code here
// type: `haraka -h Plugins` for documentation on how to create a plugin

var persistence = require("./../../server/services/persistence-service.js")

exports.hook_rcpt = function(next, connection, params) {
  var rcpt = params[0];
  var who;
  var tmp;

  tmp = rcpt.toString();

  var loc = tmp.indexOf("@");

  // we start at 1 because the recipient always starts with a "<" (i think!)
  who = tmp.substring(1, loc);

  this.loginfo("Trying to send to : " + who);

  // Yeah, bad bad bad.
  // Haraka has some weird hybrid plugin system and I cannot for the life of my
  // figure out where the relative path to this is, I've tried everything - so
  // maybe we need to somehow extract this service so it can be put into
  // package.json, which is what i did with mongoose. (Also BAD BAD BAD, is I
  // just copied node_modules from troupe's web server into the haraka dir).

  // I don't entirely understand the node queue system, but I guess this is NOT
  // the way to do it as I've seen the output of the Mongo query happen after
  // the entire Haraka script has finished running. I tried using whatTroupe =
  // persistance.Troupe.findOne blah blah but that only returned some fucked up
  // query object rather than the response. Sigh. Almost get it, but not 100%

  persistence.Troupe.findOne({
    uri : who
  }, function(err, whatTroupe) {
    if (err) {
      callbackFunction(err, null);
    }

    if (whatTroupe == null) {
      connection.loginfo("Unknown Troupe (" + who + ") - bounce the message");
    } else {
      connection.logdebug("Valid Troupe (" + who + ") - deliver the message");
    }
  });

  next();
}
