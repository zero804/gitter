/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var nconf = require('../utils/config');

module.exports = {
    install: function(app) {
      if (nconf.get('web:homeurl') !== '/') {
        app.get(
          '/',
          function(req, res) {
            res.render('landing');
          }
        );
      }
    }
};
