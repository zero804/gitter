/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var usernameSuggestionService = require('../../services/username-suggestion/username-suggestion-service');

module.exports = function(req, res, next) {
  var email = req.query.email;

  var text = req.query.text;
  if(text) text = text.trim();

  var user = req.user;

  if(text) {
    usernameSuggestionService.suggestUsernames(text, function(err, suggestions) {
      if(err) return next(err);
      res.send(suggestions);
    });

  } else if(email) {
    usernameSuggestionService.suggestUsernamesForEmail(email, function(err, suggestions) {
      if(err) return next(err);
      res.send(suggestions);
    });

  } else if(user) {
    usernameSuggestionService.suggestUsernamesForUser(user, function(err, suggestions) {
      if(err) return next(err);
      res.send(suggestions);
    });

  } else {
    next(400);
  }


};