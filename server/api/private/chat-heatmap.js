/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');
var chatService = require('../../services/chat-service');
var moment = require('moment');

module.exports = function(req, res, next) {
  var roomId = req.params.roomId;

  var endDate = req.query.end ? moment(req.query.end) : moment.utc().endOf('day');
  var startDate = req.query.start ? moment(req.query.start) : moment(endDate).subtract('years', 1).startOf('day');

  roomService.findByIdForReadOnlyAccess(req.user, roomId)
    .then(function(room) {
      var roomId = room.id;

      return chatService.findDailyChatActivityForRoom(roomId, startDate.toDate(), endDate.toDate())
        .then(function(r) {
          var adjusted = {};
          var rSorted = Object.keys(r).map(function(key) {
            var value = moment.utc(key, 'YYYYMMDD').valueOf();
            return { timestamp: value, value: r[key] };
          });

          rSorted.sort(function(a,b) {
            return a.timestamp - b.timestamp;
          });

          var d = moment(startDate);
          while(rSorted.length && (d.isBefore(endDate) || d.isSame(endDate))) {
            var rangeStart = d.valueOf();
            var rangeEnd = moment(d).add('days', 1).valueOf();

            if(rSorted[0].timestamp < rangeStart) {
              rSorted.shift();
            }

            if(!rSorted.length) break;

            if(rSorted[0].timestamp < rangeEnd) {
              var item = rSorted.shift();
              adjusted[d.valueOf() / 1000] = item.value;
            }

            d.add('days', 1);
          }

          res.send(adjusted);
        });
    })
    .fail(next);
};
