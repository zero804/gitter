/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
    install: function(app) {
      app.get(
        '/legals',
        function(req, res) {
          res.render('legals');
        }
      );
    }
};
