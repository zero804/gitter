#!/usr/bin/env node

'use strict';

var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


function getNumActiveRoomsForRange(objIdMin, objIdMax) {
  return persistence.ChatMessage.aggregate([
      {
        // match only in a specific date range
        $match: {
          _id: {
            $gt: objIdMin,
            $lt: objIdMax
          }
        }
      }, {
        $group: {
          _id: "$toTroupeId"
        }
      }, {
        $lookup: {
          from: "troupes",
          localField: "_id",
          foreignField: "_id",
          as: "troupe"
        }
      }, {
        $unwind: "$troupe"
      }, {
        // match only normal rooms
        $match: {
          "troupe.githubType": { $ne: 'ONETOONE' }
        }
      }, {
        $project: {
          troupeId: "$troupe._id"
        }
      }, {
        $group: {
          _id: "$troupeId",
        }
      },{
        // separate group so we can get the total count
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ])

    .read('secondaryPreferred')
    .exec();
}

var opts = require('yargs')
  .option('afterDate', {
    alias: 'after',
    required: true,
    description: 'yyyy-mm-dd'
  })
  .option('beforeDate', {
    alias: 'before',
    required: true,
    description: 'yyyy-mm-dd'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

var objIdMin = mongoUtils.createIdForTimestamp(new Date(opts.afterDate+'T00:00:00Z').valueOf());
var objIdMax = mongoUtils.createIdForTimestamp(new Date(opts.beforeDate+'T00:00:00Z').valueOf());

getNumActiveRoomsForRange(objIdMin, objIdMax)
  .then(function(result) {
    console.log(result[0] && result[0].count);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });
