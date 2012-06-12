/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

module.exports = {
    install: function(app) {
      app.get(
        '/',
        function(req, res) {
          res.render('landing');
          console.log("yo");
        }
      );
    }
};
