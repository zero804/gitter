/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var suggestedService = require('../services/suggested-room-service');
var Q = require('q');

var DEFAULT_TAGS = ['gitter', 'test', 'repo'];

module.exports = {
  install: function(app) {
    app.get('/explore', function (req, res, next) {
      var promises = DEFAULT_TAGS.map(function(tag) {
        return suggestedService.getTaggedRooms(tag)
          .then(function(rooms) {
            return {
              name: tag,
              rooms: rooms.splice(0, 6)
            };
          });
      });
      return Q.all(promises)
        .then(function(tags) {
            res.render('explore', { tags: tags });
          })
          .fail(next);
    });

    app.get('/explore/tags/:tag', function (req, res, next) {
      return suggestedService.getTaggedRooms(req.params.tag)
        .then(function(rooms) {
          res.render('explore', {
            tags: [{ name: req.params.tag, rooms: rooms }]
          });
        })
        .fail(next);
    });
  }
};
