/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
    install: function(app) {
      app.get('/*',
        function(req, res, next) {
          return next(404);
        }
      );
    }
};
