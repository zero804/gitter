/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

module.exports = {
    install: function(app) {
      app.get(
        '/',
        function(req, res) {
          throw new Error("Arg!");
          res.render('landing');
        }
      );
    }
};
