/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var usernameSuggestionService = require('../../services/username-suggestion/username-suggestion-service');

module.exports = function(req, res, next) {
  var email = req.query.email;
  if(!email) return next('Suggestion API requires email parameter');

  usernameSuggestionService.suggestUsernamesForEmail(email, function(err, suggestions) {
    if(err) return next(err);
    res.send(suggestions);
  });
};