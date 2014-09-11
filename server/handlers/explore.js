/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var suggestedService = require('../services/suggested-room-service');

module.exports = {
  install: function(app) {
    app.get('/explore', function (req, res, next) {
      return suggestedService.getTaggedRooms('gitter')
        .then(function(rooms) {
          res.render('explore', {
            rooms: rooms
          });
        })
        .fail(next);
    });

    app.get('/explore/tags/:tag', function (req, res, next) {
      return suggestedService.getTaggedRooms(req.params.tag)
        .then(function(rooms) {
          res.render('explore', {
            rooms: rooms
          });
        })
        .fail(next);
    });
  }
};
