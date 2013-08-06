/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
    install: function(app) {
      app.get(
        '/unawesome-browser',
        function(req, res) {
          res.status(406/* Not Acceptable */).render('unawesome-browser', { });
        }
      );
    }
};
