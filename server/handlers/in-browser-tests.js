/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('nconf');
var express = require('express');

module.exports = {
    install: function(app) {

      app.get('/test/in-browser/*', express['static']( __dirname + "/../.."));

      app.get(
        '/test/in-browser/test/:name',
        function(req, res) {
          res.render('test/in-browser', {
            homeUrl: nconf.get('web:homeurl'),
            test: 'in-browser/' + req.params.name
          });
        }
      );


    }
};
