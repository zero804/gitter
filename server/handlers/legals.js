/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

/* legal is a reserved word on github */
module.exports = {
    install: function(app) {
      app.get(
        '/legal',
        function(req, res) {
          res.render('legals');
        }
      );
    }
};
