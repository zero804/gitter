/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');

module.exports = {
    install: function(app) {
      app.get(
        '/robots.txt',
        function(req, res) {
          res.set('Content-Type', 'text/text');
          res.render('robotstxt', {
            allowCrawling: nconf.get('sitemap:allowCrawling'),
            sitemap: nconf.get('sitemap:location')
          });
        }
      );

      app.get(
        '/humans.txt',
        function(req, res) {
          res.set('Content-Type', 'text/text');
          res.render('humanstxt');
        }
      );
    }
};
