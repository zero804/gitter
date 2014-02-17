/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var os         = require("os");
var nconf      = require('../../utils/config');
var mongoose   = require('mongoose');
var winston    = require('winston');
var appVersion = require('../../web/appVersion');

//TODO: remove
module.exports = [
  function(req, res, next) {
    try {
      var db = mongoose.connection.db;
      var adminDb = db.admin();
      adminDb.ping(function(err, pingResult) {
        if(err) return next(err);
        if(!pingResult ||
            !pingResult.documents ||
            !pingResult.documents.length ||
            !pingResult.documents[0] ||
            !pingResult.documents[0].ok) return next('ping fail');

        adminDb.replSetGetStatus(function(err, info) {
          if(err) return next(err);
          if(!info ||
              info.myState !== 1) return next('replica set fail');

          var pingtestCollection = db.collection('pingtest');
          pingtestCollection.insert({ ping: Date.now() }, function(err) {
            if(err) return next(err);

            pingtestCollection.remove({ }, function(err) {
              if(err) return next(err);

              res.send("OK from " + os.hostname() + ":" + nconf.get('PORT') + ", running " + appVersion.getAppTag());
            });
          });


        });
      });

    } catch(e) {
      next(e);
    }
  },
  function(err, req, res, next) {
    winston.error('Health check failed: ' + err, { exception: err });
    res.send(500);
  }
];
