/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston       = require('winston');
var nconf         = require('../../utils/config');
var signupService = require('../../services/signup-service');

module.exports = [
  function(req, res, next) {
    var username = req.body.username;
    var displayName = req.body.displayName;
    var emails = req.body.emails;

    if(!emails || !emails.length) return next();

    return signupService.gitterPromotionGithubSignup({
      username: username,
      displayName: displayName,
      emails: emails
    }).then(function(user) {
      if(!user || !user.confirmationCode) return next();

      res.send({ url: nconf.get('web:basepath') + '/confirm/' + user.confirmationCode });
    }).fail(function(err) {
      winston.error('Unable to create new user: ' + err, {
        exception: err,
        username: username,
        displayName: displayName,
        emails: emails
      });

      return next();
    });
  },
  function(req, res) {
    res.send({ url: nconf.get('web:basepath') + '/' });
  }];

