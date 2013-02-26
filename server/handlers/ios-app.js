/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";
var nconf = require('nconf');

module.exports = {
    install: function(app) {
      app.get(
        '/ios-app',
        function(req, res) {
          var userAgent = req.headers['user-agent'] || '';
          var compactView = userAgent.indexOf("Mobile/") >= 0;
          res.render('ios-app', { compactView: compactView, homeUrl: nconf.get('web:homeurl') });
        }
      );
    }
};
