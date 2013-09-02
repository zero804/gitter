/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var express = require('express');

module.exports = {
    install: function(app) {

      app.get('/test/in-browser/*', express.static( __dirname + "/../.."));

      app.get(
        '/test/in-browser/test',
        function(req, res) {
          res.render('test/in-browser', {
            minified: false,
            homeUrl: nconf.get('web:homeurl')
          });
        }
      );

    }
};
