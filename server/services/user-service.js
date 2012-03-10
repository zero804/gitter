"use strict";

var persistence = require("./persistence-service"),
    sechash = require('sechash'),
    mongoose = require("mongoose");

module.exports = {
  newUser: function(options) {
    var user = new persistence.User(options);
    user.name = options.name;
    user.email = options.email;
    user.save(function (err) {
      console.log("Save failed:" + JSON.stringify(err) + ", " + err );
    });

    console.log("saved user")
  },

  findByEmail: function(email, callback) {
    persistence.User.findOne({email: email}, function(err, user) {
      callback(err, user);
    });
  },
  
  findByConfirmationCode: function(confirmationCode, callback) {
    persistence.User.findOne({confirmationCode: confirmationCode}, function(err, user) {
      callback(err, user);
    });
  },
    
  findById: function(id, callback) {
    persistence.User.findById(id, function(err, user) {
      callback(err, user);
    });
  },
  
  findByIds: function(ids, callback) {
    persistence.User.where('_id').in(ids)
      .slaveOk()
      .run(callback);
  },
  
  findDefaultTroupeForUser: function(id, callback) {
    persistence.Troupe.findOne({ users: id }, function(err, troupe) {
      callback(err, troupe);
    });
  },
  
  updateInitialPassword: function(userId, password, callback) {
    persistence.User.findById(userId, function(err, user) {
      if(user.passwordHash) return callback("User already has a password set");
      
       sechash.strongHash('md5', password, function(err, hash3) {
         user.passwordHash = hash3;
         return callback(false);
       });
    });
  },
  
  checkPassword: function(user, password, callback) {
    if(!user.passwordHash) {
      /* User has not yet set their password */
      callback(false);
    }
    
    sechash.testHash(password, user.passwordHash, function(err, match) {
      if(err) return callback(false);
      callback(match);
    });
  }
  
};