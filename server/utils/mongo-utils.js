/* jshint node:true */
"use strict";

var winston = require("winston");
var ObjectID = require('mongodb').ObjectID;

function getDateFromObjectId(id) {
	if(!id) {
		winston.silly('Null ID passed into getDateFromObjectId.');
		return null;
	}

	if(id instanceof ObjectID) {
		return id.getTimestamp();
	}

	var objectId = new ObjectID(id);
	return objectId.getTimestamp();
}

function getTimestampFromObjectId(id) {
	var d = getDateFromObjectId(id);
  if(d) return d.getTime();

  return null;
}

exports.getDateFromObjectId = getDateFromObjectId;
exports.getTimestampFromObjectId = getTimestampFromObjectId;