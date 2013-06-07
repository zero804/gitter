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

var util = require('util');
var _ = require('underscore');

var NotificationMessageGenerator = function(options) {
  this.strategies = options.strategies;
};

NotificationMessageGenerator.prototype.generateNotificationMessage = function(troupe, items) {
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

  return lines.join('  \n');
};


NotificationMessageGenerator.prototype.truncate = function(line) {
  if(line.length > MAX_LINE_LENGTH) {
    line = line.substring(0, MAX_LINE_LENGTH - 2).trim() + '…';
  }
  return line;
};

NotificationMessageGenerator.prototype.getTroupeDescription = function(troupe) {
  return troupe.name; // TODO: deal with one-to-one troupes
};


NotificationMessageGenerator.prototype.getShortName = function(displayName) {
  if(displayName) return displayName.split(/\s/,1)[0];
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
  return name + ': ' + item.text;
};

module.exports = new NotificationMessageGenerator({
  strategies: {
    'file': NotificationMessageGenerator.prototype.fileItemGenerator,
    'chat': NotificationMessageGenerator.prototype.chatItemGenerator
    }
  });

