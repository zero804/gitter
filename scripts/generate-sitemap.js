#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _ = require('underscore');
var persistence = require('../server/services/persistence-service');
//var sm = require('sitemap');
var moment = require('moment');
var nconf = require('../server/utils/config');
var fs = require('fs');

/*
var opts = require("nomnom")
  .option('sitemap', {
    abbr: 's',
    required: true,
    help: 'Where to write the sitemap file to'
  })
  .parse();
*/

var opts = require("nomnom")
  .option('tempdir', {
    abbr: 't',
    required: true,
    help: 'Where to write the sitemap files to'
  })
  .option('name', {
    abbr: 'name',
    required: true,
    help: 'What to call the sitemap (ie. the prefix)'
  })
  .parse();


function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

function createSitemap(urls) {
  var xml = [];
  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  urls.forEach(function(url) {
    xml.push('<url>');
    xml.push('<loc>'+url+'</loc>');
    xml.push('<changefreq>monthly</changefreq>');
    xml.push('</url>');
  });
  xml.push('</urlset>');
  return xml.join('\n')
}

function createSitemapIndex(urls) {
  var xml = [];

  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
      'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');

  urls.forEach(function(url, index) {
    xml.push('<sitemap>');
    xml.push('<loc>' + url + '</loc>');
    xml.push('</sitemap>');
  });

  xml.push('</sitemapindex>');
  return xml.join('\n')
};

var query = {
  security: 'PUBLIC',
  '$or': [
    {'noindex': {'$exists': false}},
    {'noindex': false}
  ]
};
var projection = { _id: 1, uri: 1 };
persistence.Troupe
  .find(query, projection)
  .sort({_id: 1})
  .exec()
  .then(function(rooms) {
    // batch them into groups of 50000 rooms
    var lists = _.chain(rooms).groupBy(function(item, index) {
      return Math.floor(index/50000);
    }).toArray().value();

    var basePath = nconf.get('web:basepath');
    var sitemapLocation = nconf.get('sitemap:location');

    var sitemapURLs = [];
    lists.forEach(function(list, index) {
      var sitemapURL = sitemapLocation.replace('.xml', '-'+index+'.xml');
      sitemapURLs.push(sitemapURL);

      var urls = [];
      list.forEach(function(room) {
        var url = basePath + '/' + room.uri + '/archives/all';
        urls.push(url);
      });
      var sitemapData = createSitemap(urls);
      //console.log(data);
      fs.writeFileSync(opts.tempdir+'/'+opts.name+'-'+index+'.xml', sitemapData);
    });

    var indexData = createSitemapIndex(sitemapURLs);
    //console.log(data);
    fs.writeFileSync(opts.tempdir+'/'+opts.name+'.xml', indexData);

    process.exit(0);
    return;
  })
  .catch(die);

/*
persistence.Troupe.find({ security: 'PUBLIC', '$or': [{'noindex': {'$exists': false}}, {'noindex': false}]}, { _id: 1, uri: 1 })
  .exec()
  .then(function(troupes) {
    var uris = troupes.reduce(function(memo,value) { memo[value._id] = value.uri; return memo; }, {});
    var ids = troupes.map(function(value) { return value._id; });

    return persistence.ChatMessage.aggregate([
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
      .exec()
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
  .catch(die);
*/
