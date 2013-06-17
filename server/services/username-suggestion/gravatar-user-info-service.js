/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var crypto = require('crypto');
var request = require('request');

exports.lookupUsernameForEmail = function(email) {
  var hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  var url = 'https://www.gravatar.com/' + hash + '.json';

  var d = Q.defer();

  request.get({ url: url, json: true }, function (error, response, body) {
    if(error) return d.reject(error);
    if(response.statusCode == 404) return d.resolve([]);
    if(response.statusCode >= 400) return d.reject('Unexpected status code ' + response.statusCode);

    var entries = body.entry;
    if(!entries) return d.resolve([]);

    var result = [];
    entries.forEach(function(entry) {
      if(entry.preferredUsername) {
        this.push({ service: 'gravatar', username: entry.preferredUsername });
      }

      if(entry.accounts) {
        entry.accounts.forEach(function(account) {
          if(account.username) {
            this.push({ service: account.shortname, username: account.username });
          }
        }, this);
      }

    }, result);

    return d.resolve(result);
  });

  return d.promise;
};