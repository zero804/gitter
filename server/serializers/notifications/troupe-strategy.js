/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _ = require("underscore");
var UserIdStrategy = require('./user-id-strategy');
var execPreloads = require('../exec-preloads');

function TroupeStrategy(options) {
  if(!options) options = {};

  var userStategy = new UserIdStrategy(options);

  var recipientUserId = options.recipientUserId;

  this.preload = function(items, callback) {
    var userIds = items.map(function(t) {
                    if(t.oneToOne) {
                      if(recipientUserId) {
                        return getOtherUserId(t);
                      } else {
                        // Return all the userIds if one was not specified
                        return t.getUserIds();
                      }
                    }});

    userIds = _.flatten(userIds).filter(function(f) { return !!f; });
    if(userIds.length) {
      execPreloads([{
        strategy: userStategy,
        data: _.uniq(userIds)
      }], callback);

    } else {
      callback();
    }
  };


  function getOtherUserId(item) {
    if(!recipientUserId) return undefined;
    var userIds = item.getUserIds();
    var userId = userIds.filter(function(userId) { return "" + userId != "" + recipientUserId; })[0];
    return userId;
  }

  function getHomeUrl(user) {
    if(!user) return undefined;
    return "/" + user.username;
  }

  function getUrlUserMap(troupe) {
    if(recipientUserId || !troupe.oneToOne) return undefined;
    var result = {};
    troupe.getUserIds().forEach(function(userId) {
      var user = userStategy.map(userId);
      result[userId] = user && getHomeUrl(user);
    });
    return result;
  }

  function getNameUserMap(troupe) {
    if(recipientUserId || !troupe.oneToOne) return undefined;
    var result = {};
    troupe.getUserIds().forEach(function(userId) {
      var user = userStategy.map(userId);
      result[userId] = user && user.displayName;
    });
    return result;
  }

  this.map = function(item) {
    var user;
    if(item.oneToOne) {
      var otherUserId = getOtherUserId(item);
      user = otherUserId && userStategy.map(otherUserId);
    }

    var t = {
      id: item.id,
      name: item.oneToOne ? user && user.displayName : item.name,
      uri: item.uri,
      oneToOne: item.oneToOne,
      userIds: item.getUserIds(),
      url: item.oneToOne ? user && user && getHomeUrl(user) : "/" + item.uri,
      urlUserMap: item.oneToOne && getUrlUserMap(item),
      nameUserMap: item.oneToOne && getNameUserMap(item)
    };

    return t;
  };
}


TroupeStrategy.prototype = {
  name: 'TroupeStrategy'
};

module.exports = TroupeStrategy;

