/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var userService = require("../services/user-service");
var Q = require("q");

function concatArraysOfArrays(a) {
  var result = [];
  for(var i = 0; i < a.length; i++) {
    result = result.concat(a[i]);
  }
  return result;
}

function execPreloads(preloads, callback) {
  var promises = preloads.map(function(i) { 
    var deferred = Q.defer();
    i.strategy.preload(i.data, deferred.node());
    return deferred.promise;
  });

  Q.all(promises)
      .then(function() {
        console.log("PRELOADS DONE!");
        callback(null);
      })
      .fail(function(err) {
        callback(err);
      });
}

function UserIdStrategy() {
  var self = this;

  this.preload = function(ids, callback) {
    console.dir("PRELOAD....................");
    console.dir(ids);

    userService.findByIds(ids.distinct(), function(err, users) {
      if(err) return callback(err);
      self.users = users.indexById();
      callback(null);
    });
  };

  this.map = function(id) {
    var user = self.users[id];
    if(!user) return null;

    function getAvatarUrl() {
      if(user.avatarUrlSmall) {
        return user.avatarUrlSmall;
      }

      return "/avatar/" + user.id;
    }

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: getAvatarUrl()
    };
  };
}

function EmailStrategy() {
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    console.dir(["***********emails!!", items]);

    var allUsers = items.map(function(i) { return i.fromUserId; });

    console.dir(allUsers);

    execPreloads([{
      strategy: userStategy,
      data: allUsers.distinct()
    }], callback);

  };

  this.map = function(item) {
    return {
      id: item.id,
      from: userStategy.map(item.fromUserId),
      subject: item.subject,
      date: item.date,
      preview: item.preview
    };
  };
}

function ConversationStrategy()  {
  var emailStrategy = new EmailStrategy();

  this.preload = function(items, callback) {
    var allEmails = concatArraysOfArrays(items.map(function(i) { return i.emails; }));

    execPreloads([{
      strategy: emailStrategy, 
      data: allEmails
    }], callback);
  };

  this.map = function(item) {
    return {
      id: item.id,
      troupeId: item.troupeId,
      updated: item.updated,
      subject: item.subject,
      emails: item.emails.map(emailStrategy.map)
    };
  };
}

/* This method should move */
function serialize(items, Strategy, callback) {
  if(!items) return null;

  var single = !Array.isArray(items);
  if(single) {
    items = [ items ];
  }

  function pkg(i) {
    return single ? i[0] : i;
  }

  var strat = new Strategy();

  strat.preload(items, function(err) {
    if(err) return callback(err);

    callback(null, pkg(items.map(strat.map)));
  });

}

module.exports = {
  ConversationStrategy: ConversationStrategy,
  serialize: serialize
}