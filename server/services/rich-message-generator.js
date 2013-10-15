/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService = require("./chat-service");
var userService = require("./user-service");
var appEvents   = require("../app-events");
var winston     = require('winston');

exports.install = function() {

  var events = {

    newFile: function(data) {
      // var message = data.user.displayName + ' uploaded ' + data.fileName;
      var message = "";
      var meta = {
        type: 'file',
        action: 'uploaded',
        fileId: data.fileId
      };

      chatService.newRichMessageToTroupe(data.troupe, data.user, message, meta, function(err/*, msg*/) {
        if (err) return winston.error('Unable to generate rich text message' +  err, { exception: err });
        winston.info("Notification created");
      });
    },

    userJoined: function(data) {
      userService.findById(data.userId, function(err, user) { 
        var message = user.getDisplayName() + ' has joined';
        var meta = {
          type: 'user',
          action: 'joined',
          userId: user.userId
        };
        chatService.newRichMessageToTroupe(data.troupe, null, message, meta, function(err/*, msg*/) {
          if (err) return winston.error('Unable to generate rich text message' +  err, { exception: err });
          winston.info("Notification created");
        });
      });
    }
  };

  appEvents.localOnly.onRichMessage(function(data) {
    if (events[data.eventName]) events[data.eventName](data);
  });
  
};


