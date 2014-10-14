/* jshint node:true */
"use strict";


/**

Examples of notifications:

------------------------------------------
Souper Troupers
Mike: Yo
Andrew: Yo how are you...
Andrew uploaded account.xls
------------------------------------------
Souper Troupers
Mike: Yo
------------------------------------------
Souper Troupers
Andrew uploaded account.xls
Andrew uploaded account2.xls
------------------------------------------
Mike Bartlett:
Mike: hey how are you?
Mike: blah?
Mike: ?


*/

var MAX_LINE_LENGTH = 30;
var MAX_NOTIFICATION_TEXT = 90;
var MAX_SMS_LENGTH = 160;

var util  = require('util');
var _     = require('underscore');
var ent   = require('ent');

var NotificationMessageGenerator = function(options) {
  this.strategies = options.strategies;
};

NotificationMessageGenerator.prototype.generateNotificationMessage = function(troupe, items, smsLink) {
  var lines = [this.getTroupeDescription(troupe)];

  var itemTypes = Object.keys(items);

  var byIdHash = {};

  itemTypes.forEach(function(itemType) {
    var itemsOfType = items[itemType];

    itemsOfType.forEach(function(item) {
      var line = this.getLine(itemType, item);
      if(line) {
        line = this.truncate(line);
        byIdHash[item.id] = line;
      }
    }, this);

  }, this);

  var ids = Object.keys(byIdHash);
  ids.sort();

  ids.forEach(function(id) {
    lines.push(byIdHash[id]);
  });

  var i, nextLine, lineWithNext;

  //
  // Generate notification text
  //
  var notificationText = '';
  for(i = 0; i < lines.length; i++) {
    nextLine = lines[i];
    // We add extra spaces so that when they're removed on an iphone the notificationText still makes sense
    lineWithNext = notificationText ? notificationText + '  \n' + nextLine : nextLine;
    if(lineWithNext.length <= MAX_NOTIFICATION_TEXT
    ) {
      notificationText = lineWithNext;
    } else {
      break;
    }
  }

  var smsLinkLength = smsLink ? smsLink.length + 1 : 0;
  //
  // Generate sms text
  //
  var smsText = '';
  for(i = 0; i < lines.length; i++) {
    nextLine = lines[i];
    // We add extra spaces so that when they're removed on an iphone the smsText still makes sense
    lineWithNext = smsText ? smsText + '\n' + nextLine : nextLine;

    if(lineWithNext.length + smsLinkLength <= MAX_SMS_LENGTH) {
      smsText = lineWithNext;
    } else {
      break;
    }
  }

  if(smsLink) {
    smsText = smsText + '\n' + smsLink;
  }

  return {
    notificationText: notificationText,
    smsText: smsText
  };
};


NotificationMessageGenerator.prototype.truncate = function(line) {
  if(line.length > MAX_LINE_LENGTH) {
    line = line.substring(0, MAX_LINE_LENGTH - 2).trim() + '…';
  }
  return line;
};

NotificationMessageGenerator.prototype.getTroupeDescription = function(troupe) {
  return troupe.name || troupe.uri;
};


NotificationMessageGenerator.prototype.getShortName = function(displayName) {
  if(displayName) return displayName && displayName.split(/\s/,1)[0];
};

NotificationMessageGenerator.prototype.getLine = function(itemType, item) {
  var f = this.strategies[itemType];
  if(f) return f.call(this, item);
};

NotificationMessageGenerator.prototype.fileItemGenerator = function(item) {
  var name = this.getShortName(item.latestVersion.creatorUser.displayName);
  return name + ' uploaded ' + item.fileName;
};

NotificationMessageGenerator.prototype.chatItemGenerator = function(item) {
  var name = this.getShortName(item.fromUser.displayName);
  return name + ': ' + ent.decode(item.text);
};

module.exports = new NotificationMessageGenerator({
  strategies: {
    'file': NotificationMessageGenerator.prototype.fileItemGenerator,
    'chat': NotificationMessageGenerator.prototype.chatItemGenerator
    }
  });

