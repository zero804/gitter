/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var userService = require('../../services/user-service');
var troupeService = require('../../services/troupe-service');
var chatService = require('../../services/chat-service');
var nconf   = require('../../utils/config');

var redis = require('../../utils/redis');
var redisClient = redis.createClient();

module.exports = function(req, res) {

  var token = req.params.token;

  redisClient.get('transloadit:' + token, function(err, data) {
    if (err || !data) {
      res.send(400);
      return;
    } else {
      res.send(200);
    }

    var metadata = JSON.parse(data);
    var transloadit = JSON.parse(req.body.transloadit);

    if (transloadit.ok !== 'ASSEMBLY_COMPLETED') return;
  
    troupeService.findById(metadata.room_id)
    .then(function(room) {
      userService.findById(metadata.user_id)
      .then(function(user) {

        // Generate a message for each uploaded file. 
        transloadit.results[':original'].forEach(function(upload) {
          var cnamed_url = upload.ssl_url.replace(nconf.get('transloadit:bucket') + '.s3.amazonaws.com', nconf.get('transloadit:cname'));
          var text = '[' + upload.name + '](' + cnamed_url + ')';
          chatService.newChatMessageToTroupe(room, user, text, function() {});
        });

      });
    });
  });
  
};
