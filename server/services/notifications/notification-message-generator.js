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

var ent = require('ent');

function truncate(line, maxLineLength) {
  if(line.length > maxLineLength) {
    line = line.substring(0, maxLineLength - 2).trim() + '…';
  }
  return line;
}

function getHeaderLine(troupe) {
  return troupe.name || troupe.uri;
}

function getChatLine(troupe, chat) {
  if (!chat.text) return;
  var encodedText = ent.decode(chat.text);
  if (troupe.oneToOne) {
    return encodedText;
  }

  var fromLabel = getShortFromUserName(chat.fromUser);
  if (fromLabel) return fromLabel  + ': ' + encodedText;

  return encodedText;
}

function getShortFromUserName(user) {
  if (user.username) return user.username;
  var displayName = user.displayName;
  if (!displayName) return '';
  return displayName && displayName.split(/\s/,1)[0];
}

function summarizeChatsInRoom(troupe, chats, options) {
  var appendText = options && options.appendText;
  var maxLineLength = options && options.maxLineLength || MAX_LINE_LENGTH;
  var maxMessageLength = options && options.maxMessageLength || MAX_NOTIFICATION_TEXT;

  var maxLength = maxMessageLength - (appendText ? appendText.length : 0);

  //
  // Generate notification text
  //
  var notificationText = getHeaderLine(troupe);
  for(var i = 0; i < chats.length; i++) {
    var nextLine = getChatLine(troupe, chats[i]);
    if (!nextLine) continue;

    nextLine = truncate(nextLine, maxLineLength);

    // We add extra spaces so that when they're removed on an iphone the notificationText still makes sense
    var lineWithNext = notificationText ? notificationText + '  \n' + nextLine : nextLine;
    if(lineWithNext.length <= maxLength) {
      notificationText = lineWithNext;
    } else {
      break;
    }
  }

  if (appendText) {
    notificationText += appendText;
  }

  return notificationText;
}

module.exports = summarizeChatsInRoom;
