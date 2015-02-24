/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var userService   = require('../../services/user-service');
var troupeService = require('../../services/troupe-service');
var chatService   = require('../../services/chat-service');
var nconf         = require('../../utils/config');
var Q             = require('q');
var StatusError   = require('statuserror');

var env           = require('../../utils/env');
var stats         = env.stats;
var logger        = env.logger;

var redis         = require('../../utils/redis');
var redisClient   = redis.getClient();

function fixUrl(url) {
  return url.replace(nconf.get('transloadit:bucket') + '.s3.amazonaws.com', nconf.get('transloadit:cname'));
}

module.exports = function (req, res, next) {

  var token = req.params.token;

  redisClient.get('transloadit:' + token, function (err, data) {
    if (err) return next(err);

    if (!data) return next(new StatusError(404));

    var metadata;
    try {
      metadata = JSON.parse(data);
    } catch(e) {
      logger.info('Unable to parse redis data', { data: data });
      return next(new Error('JSON parse error: ' + e.message));
    }

    var transloadit;
    try {
      transloadit = req.body.transloadit;

      if (typeof transloadit === 'string') {
        transloadit = JSON.parse(req.body.transloadit);
      }
    } catch (e) {
      return next(new Error('Transloadit json parse error: ' + e.message));
    }

    if (transloadit.ok !== 'ASSEMBLY_COMPLETED') {
      return next(new Error('Transload did not return ASSEMBLY_COMPLETED.'));
    }

    return troupeService.findById(metadata.room_id)
      .then(function (room) {
        if (!room) throw new StatusError(404, 'Unable to find room ' + metadata.room_id);

        return userService.findById(metadata.user_id)
          .then(function (user) {
            if (!user) throw new StatusError(404, 'Unable to find user ' + metadata.user_id);

            var thumbs = {};

            if (transloadit.results['doc_thumbs']) {
              transloadit.results['doc_thumbs'].forEach(function (thumb) {
                thumbs[thumb.original_id] = fixUrl(thumb.ssl_url);
              });
            }

            if (transloadit.results['img_thumbs']) {
              transloadit.results['img_thumbs'].forEach(function (thumb) {
                thumbs[thumb.original_id] = fixUrl(thumb.ssl_url);
              });
            }

            if (!transloadit.results[':original']) {
              throw new StatusError(500, 'Transloadit upload failed' + transloadit.message ? ': ' + transloadit.message : '. AssemblyID: ' + transloadit.assembly_id);
            }

            // Generate a message for each uploaded file.
            var promises = transloadit.results[':original'].map(function (upload) {
              var name = upload.name;
              var url = fixUrl(upload.ssl_url);
              var thumb = thumbs[upload.id];

              var text;
              if (thumb) {
                text = "[![" + name + "](" + thumb + ")](" + url + ")";
              } else {
                text = "[" + name + "](" + url + ")";
              }

              stats.event('file.upload');
              return chatService.newChatMessageToTroupe(room, user, { text: text });
            });

            return Q.all(promises);
          });
      })
      .then(function () {
        res.send(200);
      })
      .fail(next);
  });

};
