/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app) {
    app.post('/api/private/github_signup',
        require('./github-signup.js'));

  }
};