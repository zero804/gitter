'use strict';

var troupeService = require('../troupe-service');
var oneToOneTypeahead = require('./user-typeahead-one-to-one');
var elasticTypeahead = require('./user-typeahead-elastic');

module.exports.query = function(text, options) {
  var roomId = (options || {}).roomId;

  if (roomId) {
    return troupeService.findById(roomId)
      .then(function(room) {
        if (room.oneToOne) {
          return oneToOneTypeahead.query(text, room);
        } else {
          // elastic typeahead doesnt know about oneToOnes
          return elasticTypeahead.query(text, { roomId: roomId });
        }
      });
  } else {
    return elasticTypeahead.query(text);
  }
}
