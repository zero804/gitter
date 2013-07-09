/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var nconf = require('../../utils/config');

var FullContact = require('fullcontact.js');
var fc = new FullContact(nconf.get('fullcontact:apikey'));

exports.lookupUsernameForEmail = function(email) {
  var d = Q.defer();

  fc.person({ email: email }, function(response) {
    if(response.status != 200) return d.reject('Status ' + response.status);

    if(!response.socialProfiles) d.resolve([]);

    var results = response.socialProfiles.filter(function(profile) {
      return ['twitter', 'facebook', 'klout'].indexOf(profile.typeId) >= 0 &&
              profile.username;
    }).map(function(profile) {
      return { service: profile.typeId, username: profile.username };
    });

    return d.resolve(results);
  });

  return d.promise;
};