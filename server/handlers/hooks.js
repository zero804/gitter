/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var crypto        = require('crypto');
var winston       = require('winston');
var chatService   = require('../services/chat-service');
var troupeService = require('../services/troupe-service');

var passphrase = '***REMOVED***';

//var tid     = '521399f795c4c1aa0d000006';
//var cipher  = crypto.createCipher('aes256', passphrase);
//var hash    = cipher.update(tid, 'utf8', 'hex') + cipher.final('hex');

module.exports = {
  install: function(app) {
    app.post('/hook/:hash', function(req, res) {

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
   });
  }
};
