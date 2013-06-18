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
var latinize = require('latinize');


var userInfoServices = [
  require('./fullcontact-user-info-service.js'),
  require('./gravatar-user-info-service.js'),
  require('./email-user-info-service.js')
];

var SERVICE_RANKINGS = [
  'twitter',
  'gravatar',
  'facebook',
  'email'
];

function suggestUsernamesForEmail(email, callback) {
	return loadWordLists()
    .then(function() { return lookupPotentialUsernamesForEmail(email); })
		.then(createUniqueRankedListOfUsernames)
    .then(filterUsernamesByDisallowedWords)
    .then(filterUsernamesByAvailability)
    .then(generateSuggestionsForUnavailableUsernames)
    .nodeify(callback);
}

function suggestUsernames(seed, callback) {
  return loadWordLists()
    .then(function() { return filterUsernamesByDisallowedWords([seed]); })
    .then(filterUsernamesByAvailability)
    .then(generateSuggestionsForUnavailableUsernames)
    .nodeify(callback);
}

function suggestUsernamesForUser(user, callback) {
  return loadWordLists()
    .then(function() { return lookupPotentialUsernamesForUser(user); })
    .then(createUniqueRankedListOfUsernames)
    .then(filterUsernamesByDisallowedWords)
    .then(filterUsernamesByAvailability)
    .then(generateSuggestionsForUnavailableUsernames)
    .nodeify(callback);
}

function loadWordLists() {
  return Q.all([loadDisallowedWordsHash(), loadReservedWordsHash()]);
}

function lookupPotentialUsernamesForEmail(email) {
  var promises = userInfoServices.map(function(service) {
    // If the service returns a promise and the promise fails, simply return an empty array
    return Q.resolve(service.lookupUsernameForEmail(email))
          .timeout(2000) // Maximum response time of 2000ms
          .fail(function(err) {
            winston.info('User info lookup failed: ' + err, { exception: err });
            return [];
          });
  });

  return Q.all(promises);
}


function lookupPotentialUsernamesForUser(user) {
  var promises = [lookupPotentialUsernamesForEmail(user.email)]
                    .concat(lookupPotentialUsernamesForDisplayName(user.displayName));
  return Q.all(promises);
}

function lookupPotentialUsernamesForDisplayName(displayName) {
  var words = displayName.split(/\s+/);
  var combinations = [words];
  if(words.length === 2) {
    combinations.push([words[0].substring(0, 1), words[1]]);
    combinations.push([words[0], words[1].substring(0, 1)]);
  }

  var names = _.flatten(combinations.map(function(combination) {
    return [combination.join(''), combination.join('.'), combination.join('_')];
  }));

  var suggestions = names.map(function(n) { return { service: 'name_guess', username: n }; });

  return suggestions;
}

function createUniqueRankedListOfUsernames(results) {
  // Results look like this:
  // [ { service: 'twitter', username: 'suprememoocow' }, { service: 'facebook', username: 'andrewnewdigate' } ]
  results = _.flatten(results);

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
    var un = username.toLowerCase();
    if(!this[un]) {
      this[un] = true;
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

  var stream = fs.createReadStream(__dirname + '/../../../config/disallowed-usernames.txt');
  stream = byline.createLineStream(stream);

  stream.on('data', function(data) {
    disallowedWordHash[data] = true;
  });

  stream.on('end', function() {
    d.resolve();
  });

  return d.promise;
}


// Lazy load the words
var reservedWordsHash = null;
function loadReservedWordsHash() {
  reservedWordsHash = {};

  var d = Q.defer();

  var stream = fs.createReadStream(__dirname + '/../../../config/reserved-usernames.txt');
  stream = byline.createLineStream(stream);

  stream.on('data', function(data) {
    reservedWordsHash[data] = true;
  });

  stream.on('end', function() {
    d.resolve();
  });

  return d.promise;
}

function filterUsernamesByDisallowedWords(usernames) {
  usernames = usernames.map(function(u) {
    u = latinize(u);
    u = u.replace(/[^a-zA-Z0-9\.\-\_]/g,'');
    u = u.toLowerCase();
    return u;
  });

  return usernames.map(function(u) {
    return {
      username: u,
      disallowed: disallowedWordHash[u] || u.length < 3
    };
  });

}

function filterUsernamesByAvailability(usernameSuggestions) {
  // Firstly filter the reserved words
  usernameSuggestions.forEach(function(s) {
    if(!s.disallowed) {
      if(reservedWordsHash[s.username]) {
        s.available = false;
      }
    }
  });

  var d = Q.defer();

  var usernames = usernameSuggestions.filter(function(s) { return !s.disallowed; }).map(function(s) { return s.username; });

  userService.findTakenUsernames(usernames, d.makeNodeResolver());

  return d.promise.then(function(takenUsernames) {

    usernameSuggestions.forEach(function(s) {
      if(!s.disallowed && s.available !== false) {
        s.available = !takenUsernames[s.username];
      }
    });

    return usernameSuggestions;
  });


}

// Suggestions takes the form [ { username: x, available: false }]
// TODO: in the future, this function may be a bit of a cpu hog.
// and perhaps will need to have some yields happening internally
function generateSuggestionsForUnavailableUsernames(suggestions) {
  var unavailable = suggestions.filter(function(s) { return !s.available && !s.disallowed; });

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

      // Build a hash of all the usernames taken
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

exports.suggestUsernamesForEmail = suggestUsernamesForEmail;
exports.suggestUsernames = suggestUsernames;
exports.suggestUsernamesForUser = suggestUsernamesForUser;

