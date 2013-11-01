/* jshint node:true */
"use strict";

var winston = require("winston");
var ObjectID = require('mongodb').ObjectID;

function asObjectID(id) {
  if(!id) {
    return null;
  }

  if(typeof id === 'string') {
    return new ObjectID(id);
  }

  return id;
}

function getDateFromObjectId(id) {
  if(!id) {
    winston.silly('Null ID passed into getDateFromObjectId.');
    return null;
  }

  if(typeof id === 'string') {
    var objectId = new ObjectID(id);
    return objectId.getTimestamp();
  }

  return id.getTimestamp();
}

function getTimestampFromObjectId(id) {
  var d = getDateFromObjectId(id);
  if(d) return d.getTime();

  return null;
}

function getNewObjectIdString() {
  var objectId = new ObjectID();
  return objectId.valueOf();
}

/**
 * Checks to see whether something is either a String or ObjectID (hence ObjectID-like)
 */
function isLikeObjectId(value) {
  // value instanceof Object doesn't always work, so we'll do something a bit more hacky

  return value && value._bsontype === 'ObjectID' ||
          typeof value === 'string' ||
          value instanceof String ||
          value instanceof ObjectID;
}


exports.isLikeObjectId = isLikeObjectId;
exports.asObjectID = asObjectID;
exports.getDateFromObjectId = getDateFromObjectId;
exports.getTimestampFromObjectId = getTimestampFromObjectId;
exports.getNewObjectIdString = getNewObjectIdString;