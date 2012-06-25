/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service");
var appEvents = require("../app-events");
var fileService = require("./file-service");
var winston = require("winston");
var mailService = require("./mail-service");
var userService = require("./user-service");
var notificationService = require("./notification-service");



module.exports = {
  install: function() {
    /* File Events */
    appEvents.onFileEvent(function(data) {

      var troupeId = data.troupeId;
      var fileId = data.fileId;
      var version = data.version;

      fileService.findById(fileId, function(err, file) {
        if(err) return winston.error("notificationService: error loading file", err);
        if(!file) return winston.error("notificationService: unable to find file", fileId);

        var notificationData = {
          fileName: file.fileName,
          fileId: fileId,
          version: version
        };

        switch(data.event) {
          case 'createVersion':
            if(version > 1) {
              notificationService.createTroupeNotification(troupeId, "file:createVersion", notificationData);
            }
            break;

          case 'createNew':
            notificationService.createTroupeNotification(troupeId, "file:createNew", notificationData);
            break;
        }

      });

    });

    appEvents.onNewEmailEvent(function(data) {
      var troupeId = data.troupeId;
      var emailId = data.emailId;
      mailService.findById(emailId, function(err, email) {
        if(err) return winston.error("notificationService: error loading email", err);
        if(!email) return winston.error("notificationService: unable to find email", emailId);

        userService.findById(email.fromUserId, function(err, user) {
          if(err) return winston.error("notificationService: error loading user", err);
          if(!user) return winston.error("notificationService: unable to find user", email.fromUserId);

          var notificationData = {
            emailId: email.id,
            subject: email.subject,
            from: user.displayName,
            fromUserId: email.id
          };

          notificationService.createTroupeNotification(troupeId, "email:new", notificationData);
        });

      })
    });

  }
}