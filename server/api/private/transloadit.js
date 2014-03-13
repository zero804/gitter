/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var userService   = require('../../services/user-service');
var troupeService = require('../../services/troupe-service');
var chatService   = require('../../services/chat-service');
var nconf         = require('../../utils/config');
var Q             = require('q');

var redis         = require('../../utils/redis');
var redisClient   = redis.createClient();

function fixUrl(url) {
  return url.replace(nconf.get('transloadit:bucket') + '.s3.amazonaws.com', nconf.get('transloadit:cname'));
}

module.exports = function(req, res, next) {

  var token = req.params.token;

  redisClient.get('transloadit:' + token, function(err, data) {
    if(err) return next(err);

    if(!data) return next(404);

    var metadata = JSON.parse(data);
    var transloadit = JSON.parse(req.body.transloadit);

    if (transloadit.ok !== 'ASSEMBLY_COMPLETED') {
      return next(500);
    }

    return troupeService.findById(metadata.room_id)
      .then(function(room) {
        return userService.findById(metadata.user_id)
          .then(function(user) {

            var thumbs = {};

            if(transloadit.results['doc_thumbs']) {
              transloadit.results['doc_thumbs'].forEach(function(thumb) {
                thumbs[thumb.name] = fixUrl(thumb.ssl_url);
              });
            }

            if(transloadit.results['img_thumbs']) {
              transloadit.results['img_thumbs'].forEach(function(thumb) {
                thumbs[thumb.name] = fixUrl(thumb.ssl_url);
              });
            }

            // Generate a message for each uploaded file.
            var promises = transloadit.results[':original'].map(function(upload) {
              var name = upload.name;
              var url = fixUrl(upload.ssl_url);
              var thumb = thumbs[name];

              var text;
              if(thumb) {
                text = "[![" + name + "](" + thumb + ")](" + url + ")";
              } else {
                text = "[" + name + "](" + url + ")";
              }

              return chatService.newChatMessageToTroupe(room, user, text);
            });


            return Q.all(promises);
          });
      })
      .then(function() {
        res.send(200);
      })
      .fail(next);
  });

};
