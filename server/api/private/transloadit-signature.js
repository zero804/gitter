"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var redis = require('../../utils/redis');
var uuid = require('node-uuid');

var TransloaditClient = require('transloadit');
var transloadit = new TransloaditClient({
  authKey    : nconf.get('transloadit:key'),
  authSecret : nconf.get('transloadit:secret')
});

var redisClient = redis.getClient();

function randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

module.exports = function(req, res) {
  var token = uuid.v4();
  var shortToken = randomString(4);
  var apiBasePath = nconf.get('web:apiBasePath');

  var templateId = nconf.get('transloadit:template_id');
  if(req.query.type === 'image') {
    var typeTemplateId = nconf.get('transloadit:template_image_id');
    if(typeTemplateId) {
      templateId = typeTemplateId;
    }
  }

  var params = {
    auth: {
      max_size: 20971520 // 20MB
    },
    template_id: templateId,
    fields: {
      room_uri: req.query.room_uri,
      token: shortToken
    },
    steps: {
      export_originals: {
        path: '${fields.room_uri}/${fields.token}/${file.url_name}'
      },
      export_thumbs: {
        path: '${fields.room_uri}/${fields.token}/thumb/${file.url_name}'
      },
    },
    notify_url: apiBasePath + '/private/transloadit/' + token
  };

  // Store the token temporarily to verify Transloadit callback
  var expiry = 30 * 60; // 30 mins to be safe, S3 uploads, etc
  var metadata = {
    room_id: req.query.room_id,
    user_id: req.user.id
  };

  redisClient.setex('transloadit:' + token, expiry, JSON.stringify(metadata));

  var signed = transloadit.calcSignature(params);
  res.send({
    sig:    signed.signature,
    params: signed.params
  });
};
