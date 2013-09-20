/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService       = require("../../services/user-service");
var _                 = require('underscore');
var crc32             = require('crc32');
var expressValidator  = require('express-validator');


var validator         = expressValidator();

function mapPrimaryEmail(email) {
  return {
    id: crc32(email),
    email: email,
    status: 'PRIMARY'
  };
}


function mapConfirmedEmail(email) {
  return {
    id: crc32(email),
    email: email,
    status: 'CONFIRMED'
  };
}

function mapUnconfirmedEmail(unconfirmedEmail) {
  return {
    id: crc32(unconfirmedEmail.email),
    email: unconfirmedEmail.email,
    status: 'UNCONFIRMED'
  };
}


module.exports = {
  index: function(req, res, next) {
    var user = req.user;
    if(!user) {
      return next(403);
    }

    var emails = [ mapPrimaryEmail(user.email) ];
    emails = emails.concat(user.emails.map(mapConfirmedEmail));
    emails = emails.concat(user.unconfirmedEmails.map(mapUnconfirmedEmail));

    res.set('CACHE-CONTROL', 'NO-CACHE');
    res.send(emails);
  },

  show: function(req, res) {
    res.send(req.email);
  },

  create: function(req, res, next) {
      validator(req, res, function(err) {
        if(err) return next(err);

        req.checkBody('email', 'Invalid email address').notEmpty().isEmail();

        var mappedErrors = req.validationErrors(true);

        if (mappedErrors) {
          return next(400, { success: false, validationFailure: true, errors: mappedErrors});
        }

        return userService.addSecondaryEmail(req.user, req.body.email).then(function(email) {
          res.send({ email: email, status: 'UNCONFIRMED' });
        }).fail(function(errCode) {
          res.send(errCode);
        });

      });

    },

  update: function(req, res, next) {
    var forUpdate = req.email;
    if(forUpdate.status === 'CONFIRMED') {
      if(req.body.status === 'PRIMARY') {
        return userService.switchPrimaryEmail(req.user, forUpdate.email).then(function() {
          res.send({ email: forUpdate.email, status: 'PRIMARY'});
        }).fail(next);
      }
    }

    return res.send(403);
  },

  destroy: function(req, res, next) {
    var userEmail = req.email;

    if(!userEmail.primary) {
      return userService.removeSecondaryEmail(req.user, userEmail.email).then(function() {
        res.send({ success: true });
      }).fail(next);
    }

    return res.send(403);
  },

  load: function(req, id, callback) {
    var user = req.user;

    if(!user) {
      return callback(403);
    }

    if(id === crc32(user.email)) {
      return callback(null, mapPrimaryEmail(user.email));
    }

    var confirmed = _.find(user.emails, function(email) {
      return crc32(email) === id;
    });

    if(confirmed) {
      return callback(null, mapConfirmedEmail(confirmed));
    }

    var unconfirmed = _.find(user.unconfirmedEmails, function(userEmail) {
      return crc32(userEmail.email) === id;
    });

    if(unconfirmed) {
      return callback(null, mapUnconfirmedEmail(unconfirmed));
    }

    return callback();
  }

};
