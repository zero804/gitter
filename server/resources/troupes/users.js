/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restful = require('../../services/restful');
var recentRoomService  = require('../../services/recent-room-service');
var roomService        = require('../../services/room-service');
var emailAddressService = require('../../services/email-address-service');
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var _                  = require("underscore");

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res, next) {

    var options = {
      lean: !!req.query.lean,
      limit: req.query.limit,
      searchTerm: req.query.q
    };

    restful.serializeUsersForTroupe(req.troupe.id, req.user.id, options)
      .then(function (data) {
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  },

  create: function(req, res, next) {
    var username = req.body.username;

    function maskEmail(email) {
      return email
        .split('@')
        .map(function (item, index) {
          if (index === 0) return item.slice(0, 4) + '****';
          return item;
        })
        .join('@');
    }

    return roomService.addUserToRoom(req.troupe, req.user, username)
      .then(function (addedUser) {

        var strategy = new restSerializer.UserStrategy();

        return [
          restSerializer.serializeQ(addedUser, strategy),
          emailAddressService(addedUser)
        ];
      })
      .spread(function(serializedUser, email) {

        if (serializedUser.invited && email) {
          serializedUser.email = maskEmail(email);
        }

        res.send(200, { success: true, user: serializedUser });
      })
      .catch(function (err) {
        res.send(err.status, err);
      })
      .fail(next);
  },

  destroy: function(req, res, next){
    var user = req.resourceTroupeUser;

    return roomService.removeUserFromRoom(req.troupe, user, req.user)
      .then(function() {
        recentRoomService.removeRecentRoomForUser(user.id, req.troupe.id);
      })
      .then(function() {
        res.send({ success: true });
      })
      .catch(next);
  },

  load: function(req, id, callback) {
    var userInTroupeId = _.find(req.troupe.getUserIds(), function(v) { return v == id;} );
    userService.findById(userInTroupeId, callback);
  }

};
