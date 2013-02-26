/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";
var nconf = require('nconf');

module.exports = {
    install: function(app) {
      app.get(
        '/mac-app',
        function(req, res) {
          res.render('mac-app', { homeUrl: nconf.get('web:homeurl') });
        }
      );
    }
};
