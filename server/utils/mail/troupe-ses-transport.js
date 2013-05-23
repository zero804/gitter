/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('../config');
var url = require('url');
var Q = require('q');
var _ = require('underscore');
var https = require('https');
var xml2js = require('xml2js');
var crypto = require('crypto');
var io = require('../io');
var winston = require('../winston');

function TroupeSESTransport() {
  this.AWSAccessKeyID = nconf.get("amazon:accessKey");
  this.AWSSecretKey = nconf.get("amazon:secretKey");
  this.ServiceUrl = "https://email.us-east-1.amazonaws.com";
}


TroupeSESTransport.prototype.sendMailString = function(from, recipients, string, callback) {
  var self = this;
  var date = new Date();
  var urlparts = url.parse(this.ServiceUrl);


  var params = {
    'Action': 'SendRawEmail',
    'Version': '2010-12-01',
    'Timestamp': self.ISODateString(date),
    'RawMessage.Data': new Buffer(string).toString('base64'),
    'Source': from
  };

  /* chunk the outgoing message into mails with max 50 recipients (due to SES limit) */

  var SESLimit = 50;
  var recipientsRemaining = recipients.slice(0);
  // we must only return to caller once all these mails have been posted
  var mailPromises = [];

  while(recipientsRemaining.length) {
    var defered = Q.defer();
    sendMessageToRecipients(recipientsRemaining.splice(0, 50), defered.makeNodeResolver());
    mailPromises.push(defered.promise);
  }

  Q.all(mailPromises).then(function(messageIds) {
    callback(null, messageIds);
  }).fail(callback);

  /* Sends the message to up to MAX 50 recipients, returns a callback(err, messageId) */

  function sendMessageToRecipients(destinations, callback) {
    var myParams = _.extend(params);

    // don't really send mails to the troupetest.local domain
    destinations = _.filter(destinations, function(d) { return (d.indexOf('@troupetest.local') >= 0) === false; });
    if (destinations.length === 0) {
      return callback(null, 'noId');
    }

    for(var i = 0; i < destinations.length & i < 50; i++) {
      myParams['Destinations.member.' + (i + 1)] = destinations[i];
    }

    myParams = self.buildKeyValPairs(myParams);

    var reqObj = {
      host: urlparts.hostname,
      path: urlparts.path || "/",
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': myParams.length,
        'Date': date.toUTCString(),
        'X-Amzn-Authorization': ['AWS3-HTTPS AWSAccessKeyID=' + self.AWSAccessKeyID, "Signature=" + self.buildSignature(date.toUTCString(), self.AWSSecretKey), "Algorithm=HmacSHA256"].join(",")
      }
    };

    /* Take the XML response, extract the messageId, then call the callback */

    function extractMessageIdFromResponse(errPostingToSES, response) {
      if(errPostingToSES) return callback(errPostingToSES);

      var parser = new xml2js.Parser();

      parser.parseString(response.message, function(errParsingXML, parsedResult) {
        var messageId = parsedResult.SendRawEmailResponse.SendRawEmailResult ? parsedResult.SendRawEmailResponse.SendRawEmailResult[0].MessageId + "@email.amazonses.com" : null;
        // return ONE messageId string to caller (which is the outer sendMail function)
        callback(null, messageId);
      });
    }

    // post the request, extract the message id from response
    https.request(reqObj, self.responseHandler.bind(self, extractMessageIdFromResponse)).end(myParams);

  }

};

/**
 * Sends an email in the form of a message stream to SES, returns a callback of the form
 * callback(err, messageIds)
 * - where messageIds is an array of one of more message identifiers used for the distribution from SES
 */
TroupeSESTransport.prototype.sendMailStream = function(from, recipients, stream, callback) {

  var self = this;
  // we need to buffer the contents of the stream
  // before we can actually construct the message (due to the signing required).
  io.readStreamIntoString(stream, function(err, string) {
    if(err) { winston.error("Error reeading stream", { exception: err }); return callback(err); }
    self.sendMailString(from, recipients, string, callback);
  });

};

/**
 * Handles the response for the HTTP request to SES.
 * Interprets the statusCode so before the caller tries to interpret the specific XML result.
 * Buffers the response data for the caller to put into XML parser.
 *
 * @param {Function} callback Callback function to run on end (binded)
 * @param {Object} response HTTP Response object
 */
TroupeSESTransport.prototype.responseHandler = function(callback, response) {
  var body = "";
  response.setEncoding('utf8');

  //Re-assembles response data
  response.on('data', function(d) {
    body += d.toString();
  });

  //Performs error handling and executes callback, if it exists
  response.on('end', function(err) {

    if(err instanceof Error) {
      return callback && callback(err, null);
    }
    if(response.statusCode != 200) {
      winston.error('Email failed: ', { exception: response.statusCode, body: body });
      return callback && callback(new Error('Email failed: ' + response.statusCode + '\n' + body), null);
    }
    return callback && callback(null, {
      message: body
    });
  });
};

/**
 * <p>Converts an object into an Array with "key=value" values</p>
 *
 * @param {Object} config Object with keys and values
 * @return {Array} Array of key-value pairs
 */
TroupeSESTransport.prototype.buildKeyValPairs = function(config) {
  var keys = Object.keys(config).sort(),
    keyValPairs = [],
    key, i, len;

  for(i = 0, len = keys.length; i < len; i++) {
    key = keys[i];
    if(key != "ServiceUrl") {
      keyValPairs.push((encodeURIComponent(key) + "=" + encodeURIComponent(config[key])));
    }
  }

  return keyValPairs.join("&");
};

/**
 * <p>Uses SHA-256 HMAC with AWS key on date string to generate a signature</p>
 *
 * @param {String} date ISO UTC date string
 * @param {String} AWSSecretKey ASW secret key
 */
TroupeSESTransport.prototype.buildSignature = function(date, AWSSecretKey) {
  var sha256 = crypto.createHmac('sha256', AWSSecretKey);
  sha256.update(date);
  return sha256.digest('base64');
};

/**
 * <p>Generates an UTC string in the format of YYY-MM-DDTHH:MM:SSZ</p>
 *
 * @param {Date} d Date object
 * @return {String} Date string
 */
TroupeSESTransport.prototype.ISODateString = function(d) {
  return d.getUTCFullYear() + '-' + this.strPad(d.getUTCMonth() + 1) + '-' + this.strPad(d.getUTCDate()) + 'T' + this.strPad(d.getUTCHours()) + ':' + this.strPad(d.getUTCMinutes()) + ':' + this.strPad(d.getUTCSeconds()) + 'Z';
};

/**
 * <p>Simple padding function. If the number is below 10, add a zero</p>
 *
 * @param {Number} n Number to pad with 0
 * @return {String} 0 padded number
 */
TroupeSESTransport.prototype.strPad = function(n) {
  return n < 10 ? '0' + n : n;
};

module.exports = new TroupeSESTransport();