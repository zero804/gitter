/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var crypto        = require('crypto');
var winston       = require('winston');
var chatService   = require('../../services/chat-service');
var troupeService = require('../../services/troupe-service');

var passphrase = 'wyElt0ian8waunt8';

module.exports = function(req, res) {
  var troupeId;

  try {
    var decipher  = crypto.createDecipher('aes256', passphrase);
    troupeId      = decipher.update(req.params.hash, 'hex', 'utf8') + decipher.final('utf8');
  } catch(err) {
    res.send(400, 'Invalid Troupe hash');
    return;
  }

  var message = req.body.message;
  var meta    = req.body.meta;

  troupeService.findById(troupeId, function(err, troupe) {
    chatService.newRichMessageToTroupe(troupe, null, message, meta, function(err) {
      if (err) winston.info('Error creating Rich Message');
    });
  });

  res.send('OK');
};

