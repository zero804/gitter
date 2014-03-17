/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var domain = require('domain');

module.exports = function(app) {
  return function(req, res) {
    var reqd = domain.create();
    reqd.add(req);
    reqd.add(res);

    reqd.on('error', function(err) {
      console.error('Error', err, req.url);
      try {
        res.writeHead(500);
        res.end('Error occurred, sorry.');
      } catch (err) {
        console.error('Error sending 500', err, req.url);
        try {
          reqd.dispose();
        } catch(e2) {
        }
      }
    });

    app.apply(null, arguments);
  };

};