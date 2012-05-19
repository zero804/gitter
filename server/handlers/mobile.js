/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

module.exports = {
    install: function(app) {
      app.get('/mob', function(req, res, next) {
          console.log("MOBILE");
          res.render('m/mobile', {
          });
      });
    }
};