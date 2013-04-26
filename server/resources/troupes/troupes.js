/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service");
var persistence = require("../../services/persistence-service");
var restSerializer = require("../../serializers/rest-serializer");
var Fiber = require("../../utils/fiber");

module.exports = {
  index: function(req, res, next) {
    troupeService.findAllTroupesForUser(req.user.id, function(err, troupes) {
      if (err) return next(err);

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

      restSerializer.serialize(troupes, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });
    });
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true });

    restSerializer.serialize(req.troupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  create: function(req, res, next) {
    var newTroupe = req.body;
    var name = newTroupe.troupeName || newTroupe.name;
    var oneToOneTroupeId = newTroupe.oneToOneTroupeId;
    var invites = newTroupe.invites;

    name = name ? name.trim() : '';
    if(!name) return next('Please provide a troupe name');

    if (oneToOneTroupeId) {
      // find this 1-1 troupe and create a new normal troupe with the additional person(s) invited
      troupeService.findById(oneToOneTroupeId, function(err, troupe) {
        if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
          return next(403);
        }

        troupeService.upgradeOneToOneTroupe({ name: name, oneToOneTroupe: troupe, senderName: req.user.name, invites: invites }, function(err, troupe) {
          if(err) return next(err);

          var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true });
          restSerializer.serialize(troupe, strategy, function(err, serialized) {
            if(err) return next(err);

            res.send(serialized);
          });
        });

      });

      return;
    }

    // create a troupe normally
    var troupe = new persistence.Troupe();
    troupe.name = name;
    troupe.uri = troupeService.createUniqueUri();
    troupe.addUserById(req.user.id);

    troupe.save(function(err) {
      if(err) return next(403);

      // add invites for each additional person
      for(var i = 0; i < invites.length; i++) {
        var displayName = invites[i].displayName;
        var inviteEmail = invites[i].email;
        if (displayName && inviteEmail)
          troupeService.addInvite(troupe, req.user.displayName, displayName, inviteEmail);
      }

      // send the new troupe back
      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true });
      restSerializer.serialize(troupe, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });

    });


  },

  update: function(req, res, next) {
    var troupe = req.troupe;
    var updatedTroupe = req.body;
    var name = updatedTroupe.name;

    var f = new Fiber();

    if(name) {
      troupeService.updateTroupeName(troupe.id, name, f.waitor());
    }

    if(updatedTroupe.hasOwnProperty('favourite')) {
      troupeService.updateFavourite(req.user.id, troupe.id, updatedTroupe.favourite, f.waitor());
    }

    f.all().then(function() {
      troupeService.findById(troupe.id, function(err, troupe) {

        var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: false });

        restSerializer.serialize(troupe, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });

    }, next);

  },

  load: function(req, id, callback) {
    if(!req.user) return callback(401);

    troupeService.findById(id, function(err, troupe) {
      if(err) return callback(500);
      if(!troupe) return callback(404);

      if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
        return callback(403);
      }

      return callback(null, troupe);
    });
  }

};
