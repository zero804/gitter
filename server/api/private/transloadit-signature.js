/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var crypto  = require('crypto');
var nconf   = require('../../utils/config');
var nodeEnv = process.env['NODE_ENV'] || 'dev';
var redis   = require('../../utils/redis');
var uuid    = require('node-uuid');

var redisClient = redis.getClient();

var utcDateString = function(time) {
  function pad(val, len) {
    val = String(val);
    len = len || 2;
    while (val.length < len) val = "0" + val;
    return val;
  }

  var now = new Date();
  now.setTime(time);

  var utc = new Date(
    Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    )
  );

  var cDate  = utc.getDate();
  var cMonth = utc.getMonth();
  var cYear  = utc.getFullYear();
  var cHour  = utc.getHours();
  var cMin   = utc.getMinutes();
  var cSec   = utc.getSeconds();

  var result = cYear + '/' + pad((cMonth + 1)) + '/' + pad(cDate);
  result += ' ' + pad(cHour) + ':' + pad(cMin) + ':' + pad(cSec) + '+00:00';

  return result;
};

function randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

module.exports =  function(req, res) {

  // 1 hours from now (this must be milliseconds)
  var expiresIn  = 1 * 60 * 60 * 1000;
  var expires    = utcDateString((+new Date()) + expiresIn);
  var token      = uuid.v4();
  var shortToken = randomString(4);

  // Host for Transloadit callback. In dev env you'll need to use localtunnel
  var host = (nodeEnv === 'dev') ? 'https://wpdhlriyon.localtunnel.me' : nconf.get('web:basepath');

  var templateId = nconf.get('transloadit:template_id');
  if(req.query.type === 'image') {
    var typeTemplateId = nconf.get('transloadit:template_image_id');
    if(typeTemplateId) {
      templateId = typeTemplateId;
    }
  }

  var params = {
    auth: {
      expires: expires,
      key: nconf.get('transloadit:key'),
      max_size: 20971520
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
    notify_url: host + '/api/private/transloadit/' + token
  };

  var paramsString = JSON.stringify(params);

  // Generate the signature hmac
  var signature = crypto
      .createHmac('sha1', nconf.get('transloadit:secret'))
      .update(new Buffer(paramsString, 'utf-8'))
      .digest('hex');

  // Store the token temporarily to verify Transloadit callback
  var expiry = 30 * 60; // 30 mins to be safe, S3 uploads, etc
  var metadata = {
    room_id: req.query.room_id,
    user_id: req.user.id
  };

  redisClient.setex('transloadit:' + token, expiry, JSON.stringify(metadata));

  res.send({
    sig:    signature,
    params: paramsString
  });
};

