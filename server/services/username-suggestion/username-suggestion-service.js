/*jshint globalstrict:true, trailing:false, unused:true, node:true, newcap: true */
"use strict";

// Internally this module is using promises. However, externally it exposes callbacks

var Q = require('q');
var _ = require('underscore');
var userService = require('../user-service');
var persistence = require('../persistence-service');
var byline = require('byline');
var fs = require('fs');
var winston = require('winston');
var monq = require('../../utils/mongoose-utils').monq;

var userInfoServices = [
  require('./gravatar-user-info-service.js'),
  require('./email-user-info-service.js')
];

var SERVICE_RANKINGS = [
  'twitter',
  'gravatar',
  'facebook',
  'email'
];

function suggestUsernames(email, callback) {
	var promises = userInfoServices.map(function(service) {
    // If the service returns a promise and the promise fails, simply return an empty array
    return Q.resolve(service.lookupUsernameForEmail(email)).fail(function(err) {
      winston.info('User info lookup failed: ' + err, { exception: err });
      return [];
    });
	});

	return Q.all(promises)
		.then(createUniqueRankedListOfUsernames)
    .then(filterUsernamesByReservedWords)
    .then(filterUsernamesByAvailability)
    .then(generateSuggestionsForUnavailableUsernames)
    .nodeify(callback);

}

function createUniqueRankedListOfUsernames(results) {
  // Results look like this:
  // [ { service: 'twitter', username: 'suprememoocow' }, { service: 'facebook', username: 'andrewnewdigate' } ]
  results = _.flatten(results, true);
  results.sort(function(a,b) {
    function score(serviceName) {
      var i = SERVICE_RANKINGS.indexOf(serviceName);
      return i == -1 ? 100 : i;
    }
    var scoreA = score(a.service);
    var scoreB = score(b.service);

    return scoreA - scoreB;
  });

  var usernames = results.map(function(result) { return result.username; });

  // Unique usernames, but keep the order (only keep the first instance of each)
  var unique = usernames.filter(function(username) {
    if(!this[username]) {
      this[username] = true;
      return true;
    }

    return false;
  }, {});
  return unique;
}

// Lazy load the words
var disallowedWordHash = null;
function loadDisallowedWordsHash() {
  disallowedWordHash = {};

  var d = Q.defer();

  var count = 0;
  ['disallowed-usernames.txt', 'reserved-usernames.txt'].forEach(function(fileName, index, collection) {
    var stream = fs.createReadStream(__dirname + '/../../../config/' + fileName);
    stream = byline.createLineStream(stream);

    stream.on('data', function(data) {
      disallowedWordHash[data] = true;
    });

    stream.on('end', function() {
      if(++count === collection.length) d.resolve();
    });

  });


  return d.promise;
}

function filterUsernamesByReservedWords(usernames) {
  if(!disallowedWordHash) {
    return loadDisallowedWordsHash().then(filterValues);
  }

  return filterValues();

  function filterValues() {
    return usernames.filter(function(u) {
      return !disallowedWordHash[u];
    });
  }
}

function filterUsernamesByAvailability(usernames) {
  var d = Q.defer();
  userService.findTakenUsernames(usernames, d.makeNodeResolver());

  return d.promise.then(function(takenUsernames) {
    return usernames.map(function(u) {
      return {
        username: u,
        available: !takenUsernames[u]
      };
    });
  });
}

// Suggestions takes the form [ { username: x, available: false }]
function generateSuggestionsForUnavailableUsernames(suggestions) {
  var unavailable = suggestions.filter(function(s) { return !s.available; });

  // If all the suggestions are available, don't bother trying to generate any new ones
  if(!unavailable.length) return suggestions;

  var suggestionOrs = unavailable.map(function(u) { return { 'username': new RegExp('^' + u.username + '[0-9]+$') }; });

  var promise = persistence.User.find()
    .or(suggestionOrs)
    .select('username')
    .exec();

  return monq(promise).then(function(users) {
    var usernames = users.map(function(u) { return u.username; });
    unavailable.forEach(function(u) {
      var currentUsername = u.username;
      var taken = usernames
                    .filter(function(username) { return username.indexOf(currentUsername) === 0; })
                    .map(function(username) { return username.substring(currentUsername.length); });

      var takenHash = taken.reduce(function(memo, val) {
        memo[val] = true;
        return memo;
      }, {});

      var index = 1;
      while(takenHash[index] && index < 999) {
        index++;
      }

      suggestions.push({ username: u.username + index, available: true });
    });

    return suggestions;
  });
}

exports.suggestUsernames = suggestUsernames;