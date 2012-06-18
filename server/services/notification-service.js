/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service");
var appEvents = require("../app-events");
var winston = require("winston");

/* TODO: externalize and internationalise this! */
var notificationTemplates = {
  "email:new": "You've got email",
  "file:createVersion": "New file version!",
  "file:createNew": "New file!"
};
var notificationLinkTemplates = {
  "email:new": "#x",
  "file:createVersion": "#y",
  "file:createNew": "#z"
};

function findByTroupe(id, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var q = persistence.Notification
        .where('troupeId', id);

  if(options.skip) q.skip(options.skip);
  if(options.limit) q.limit(options.limit);

  q.desc('createdDate')
        .slaveOk()
        .exec(callback);
}

function formatNotification(notification) {
  // TODO: hook a template engine in here
  return {
    troupeId: notification.troupeId,
    notificationText: notificationTemplates[notification.notificationName],
    notificationLink: notificationLinkTemplates[notification.notificationName]
  };
}

module.exports = {
  /* Create a new troupe notification */
  createTroupeNotification: function(troupeId, notificationName, data) {
    winston.debug("notificationService: createTroupeNotification", arguments);
    var notification = new persistence.Notification({
      troupeId: troupeId,
      userId: null,
      notificationName: notificationName,
      data: data
    });

    notification.save(function(err) {
      if(err) return winston.error("Unable to save notification", err);

      var n = formatNotification(notification);
      appEvents.newNotification(notification.troupeId, null, n.notificationText, n.notificationLink);
    });
  },

  /* Find all notifications for a troupe */
  findByTroupe: findByTroupe,

  listByTroupe: function(id, options, callback) {
    findByTroupe(id, options, function(err, notifications) {
      if(err) return callback(err);
      callback(null, notifications.map(formatNotification));
    });
  }

};