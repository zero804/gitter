/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');

module.exports = {
  install: function(app) {
    app.get('/home',
      ensureLoggedIn,
      function (req, res) {
        res.redirect('/' + req.user.username);
      });

    // This is used from the explore page
    app.get('/home/createroom',
      ensureLoggedIn,
      function (req, res) {
        res.redirect('/' + req.user.username + '#createroom');
      });

  }
};
