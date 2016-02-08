"use strict";

var ObjectID = require('mongodb').ObjectID;
var _        = require('lodash');

function stringToObjectID(string) {
  try {
    return new ObjectID(string);
  } catch(e) {
    throw new Error('Invalid ObjectID ' + string);
  }
}

function asObjectID(id) {
  if(!id) {
    return null;
  }

  if(typeof id === 'string') {
    return stringToObjectID(id);
  }

  return id;
}

function asObjectIDs(ids) {
  return ids.map(function(id) {
    return asObjectID(id);
  });
}

function getDateFromObjectId(id) {
  if(!id) {
    return null;
  }

  if(typeof id === 'string') {
    var objectId = stringToObjectID(id);
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
  if(!value) return false;

  if(value && value._bsontype === 'ObjectID' || value instanceof ObjectID) {
    return true;
  }

  if(typeof value === 'string' || value instanceof String) {
    // Avoid an expensive try-catch if possible
    if(value.length !== 24) return false;

    return (/^[0-9a-fA-F]{24}$/).test(value);
  }

  return false;
}


function serializeObjectId(id) {
  if(!id) return id;
  if(typeof id === 'string') { return id; }
  return id.toString();
}

function serializeObjectIds(ids) {
  if (!ids || !ids.length) return [];

  return ids.map(serializeObjectId);
}

function createIdForTimestampString(timestamp) {
  var hexSeconds = Math.floor(timestamp/1000).toString(16);

  while(hexSeconds.length < 8) {
    hexSeconds = "0" + hexSeconds;
  }
  return hexSeconds + "0000000000000000";
}

function createIdForTimestamp(timestamp) {
  return new ObjectID(createIdForTimestampString(timestamp));
}

function fieldInPredicate(fieldName, values, additionalClauses) {
  var predicate = {};
  if (values.length === 1) {
    predicate[fieldName] = values[0];
  } else {
    predicate[fieldName] = { $in: values };
  }

  return _.defaults(predicate, additionalClauses);
}

function setId(model) {
  if (!model) return model;
  model.id = serializeObjectId(model._id);
  return model;
}
exports.setId = setId;

function setIds(array) {
  array.forEach(function(f) {
    if (!f) return;
    f.id = serializeObjectId(f._id);
  });
  return array;
}

function conjunctionIds(terms, termIdentifiers) {
  if (!terms.length) return { $or: terms };
  if (terms.length < 3) return { $or: terms };

  if (termIdentifiers.length !== 2) return { $or: terms };

  var t1Identifier = termIdentifiers[0];
  var t2Identifier = termIdentifiers[1];

  var t1UniqueValue = terms[0][t1Identifier];
  var t1Unique = true;
  var t2UniqueValue = terms[0][t2Identifier];
  var t2Unique = true;

  for (var i = 1; i < terms.length; i++) {
    var t1 = terms[i][t1Identifier];
    var t2 = terms[i][t2Identifier];

    if (t1UniqueValue != t1) t1Unique = false;
    if (t2UniqueValue != t2) t2Unique = false;

    if (!t1Unique && !t2Unique) break;
  }

  // Everything is the same. Duh
  if (t1Unique && t2Unique) return terms[0];

  if (t1Unique) {
    var t1UniqueQuery = {};
    t1UniqueQuery[t1Identifier] = terms[0][t1Identifier];

    var t2MultiQuery = {};
    t2MultiQuery[t2Identifier] = {
      $in: _.map(terms, function(term) {
              return term[t2Identifier];
            })
    };

    return { $and: [ t1UniqueQuery, t2MultiQuery] };
  }

  if (t2Unique) {
    var t2UniqueQuery = {};
    t2UniqueQuery[t2Identifier] = terms[0][t2Identifier];

    var t1MultiQuery = {};
    t1MultiQuery[t1Identifier] = {
      $in: _.map(terms, function(term) {
              return term[t1Identifier];
            })
    };

    return { $and: [ t2UniqueQuery, t1MultiQuery] };
  }

  return { $or: terms };
}
exports.conjunctionIds = conjunctionIds;

exports.setIds = setIds;

exports.isLikeObjectId = isLikeObjectId;
exports.asObjectID = asObjectID;
exports.asObjectIDs = asObjectIDs;
exports.getDateFromObjectId = getDateFromObjectId;
exports.getTimestampFromObjectId = getTimestampFromObjectId;
exports.getNewObjectIdString = getNewObjectIdString;
exports.serializeObjectId = serializeObjectId;
exports.serializeObjectIds = serializeObjectIds;
exports.createIdForTimestamp = createIdForTimestamp;
exports.createIdForTimestampString = createIdForTimestampString;
exports.fieldInPredicate = fieldInPredicate;
