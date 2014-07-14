#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var sm = require('sitemap');
var moment = require('moment');
var nconf = require('../server/utils/config');
var fs = require('fs');

var opts = require("nomnom")
  .option('sitemap', {
    abbr: 's',
    required: true,
    help: 'Where to write the sitemap file to'
  })
  .parse();


function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

persistence.Troupe.findQ({ security: 'PUBLIC', '$or': [{'noindex': {'$exists': false}}, {'noindex': false}]}, { _id: 1, uri: 1 })
  .then(function(troupes) {
    var uris = troupes.reduce(function(memo,value) { memo[value._id] = value.uri; return memo; }, {});
    var ids = troupes.map(function(value) { return value._id; });

    return persistence.ChatMessage.aggregateQ([
        { $match: {
            toTroupeId: { $in: ids }
          }
        },
        { $project: {
            _id: 0,
            toTroupeId: 1,
            sent: 1
          }
        },
        { $group: {
            _id: "$toTroupeId",
            dates: {
              $addToSet: {
                $add: [
                  { $multiply: [{ $year: '$sent' }, 10000] },
                  { $multiply: [{ $month: '$sent' }, 100] },
                  { $dayOfMonth: '$sent' }
                ]
              }
            }
          }
        }
      ])
      .then(function(result) {
        var sitemap = sm.createSitemap ({
          hostname: nconf.get('web:basepath')
        });

        var today = moment.utc().startOf('day');

        result.forEach(function(m) {
          var uri = uris[m._id];

          m.dates.forEach(function(d) {
            var date = moment.utc("" + d,  "YYYYMMDD");

            var url = '/' + uri + '/archives/' + date.format('YYYY') + '/' + date.format('MM') + '/' + date.format('DD');

            var changeFreq = 'yearly';

            if(!date.isBefore(today)) {
              changeFreq = 'hourly';
            }

            sitemap.add({
              url: encodeURI(url),
              changefreq: changeFreq
            });
          });

        });

        return sitemap;
      });
  })
  .then(function(sitemap) {
    fs.writeFile(opts.sitemap, sitemap.toString(), { mode: parseInt('0644', 8) }, function(err) {
      if(err) return die(err);
      process.exit(0);
    });
  })
  .fail(die);

