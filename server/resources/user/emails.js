/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require("../../services/user-service");
var _ = require('underscore');

function mapUserEmail(userEmail) {
  return {
    id: userEmail.id,
    email: userEmail.email,
    status: userEmail.primary ? 'PRIMARY' : (userEmail.confirmed ? 'CONFIRMED' : 'UNCONFIRMED')
  };
}

module.exports = {
  index: function(req, res, next) {
    var user = req.user;
    if(!user) {
      return next(403);
    }

    var emails = [ { id: 0, email: user.email, primary: true } ];
    emails.concat(user.emails);

    res.send(emails.map(mapUserEmail));
  },

  show: function(req, res) {
    res.send(mapUserEmail(req.email));
  },

  create: function(req, res, next) {
    req.checkBody('email', 'Invalid email address').notEmpty().isEmail();

    var mappedErrors = req.validationErrors(true);

    if (mappedErrors) {
      return next(400, { success: false, validationFailure: true, errors: mappedErrors});
    }

    return userService.addSecondaryEmail(req.user, req.body.email).then(function(email) {
      res.send(mapUserEmail(email));
    }).fail(next);

  },

  update: function(req, res, next) {
    var userEmail = req.email;

    if(!userEmail.primary && userEmail.confirmed) {
      if(req.body.status === 'PRIMARY') {
        return userService.switchPrimaryEmail(req.user, userEmail.email).then(function() {
          res.send(userEmail);
        }).fail(next);
      }
    }

    return res.send(403);
  },

  destroy: function(req, res, next) {
    var userEmail = req.email;

    if(!userEmail.primary) {
      return userService.removeSecondaryEmail(req.user, userEmail.email).then(function() {
        next(200);
      }).fail(next);
    }

    return res.send(403);
  },

  load: function(req, id, callback) {
    if(!req.user) {
      return callback(403);
    }

    if(id === '0') {
      return callback(null, {
        id: 0,
        email: req.user.email,
        primary: true
      });
    }

    return callback(null, _.find(req.user.emails, function(userEmail) {
        return userEmail.id == id;
      }));

  }

};
