"use strict";

var persistence = require("./persistence-service"),
    userService = require("./user-service");

function findByUri(uri, callback) {
  persistence.Troupe.findOne({uri: uri}, function(err, troupe) {
    callback(err, troupe);
  });
}

function userHasAccessToTroupe(user, troupe) {
  console.dir(user);
  console.dir(troupe);
  return troupe.users.indexOf(user.id) >= 0;
}

function validateTroupeEmail(options, callback) {
  var from = options.from;
  var to = options.to;
  
  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];
  var user = null;
  var troupe = null;
  console.log("Options: " + JSON.stringify(options));
  
  userService.findByEmail(from, function(err, fromUser) {
    if(err) callback(err);
    if(!fromUser) callback("Access denied");
    
    findByUri(uri, function(err, troupe) {
      if(err) callback(err);
      if(!troupe) callback("Troupe not found for uri " + uri);
      console.dir(fromUser);
      if(!userHasAccessToTroupe(fromUser, troupe)) {
        callback("Access denied");
      } 

      callback(null,troupe);
	  
    });
  });
  
}

module.exports = {
  findByUri: findByUri,
  validateTroupeEmail: validateTroupeEmail,
  userHasAccessToTroupe: userHasAccessToTroupe

};