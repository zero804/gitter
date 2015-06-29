/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

// var persistence     = require('./persistence-service');
// var Q               = require('q');
// var _               = require('underscore');
// var collections     = require('../utils/collections');
var graphRecommendations = require('gitter-web-recommendations');
// var recommendations = require('./recommendations');
//
// var MAX_RECOMMENDATIONS = 20;
//
// function indexOf(value) {
//   var buckets = Array.prototype.slice.call(arguments, 1);
//   var totalBuckets = buckets.length;
//   for (var i = 0; i < buckets.length; i++) {
//     if (value > buckets[i]) return totalBuckets - i;
//   }
//   return 0;
// }
// var CATEGORIES = {
//   pushTime: function(item) {
//     var repo = item.githubRepo;
//     if(!repo) return;
//     if(!repo.pushed_at) return;
//     var daysSincePush = (Date.now() - new Date(repo.pushed_at).valueOf()) / 86400000;
//     if (daysSincePush < 7) { return 5; }
//     if (daysSincePush < 31) { return 4; }
//     if (daysSincePush < 90) { return 3; }
//     if (daysSincePush < 180) { return 2; }
//     if (daysSincePush < 365) { return 1; }
//     return 0;
//   },
//   forks: function(item) {
//     var repo = item.githubRepo;
//     if(!repo) return;
//     // return repo.forks_count;
//     return indexOf(repo.forks_count, 1000, 500, 100, 50, 20, 1);
//   },
//   watchers: function(item) {
//     var repo = item.githubRepo;
//     if(!repo) return;
//     return indexOf(repo.watchers_count, 1000, 500, 100, 50, 20, 1);
//     // return repo.watchers_count;
//   },
//   starGazers: function(item) {
//     var repo = item.githubRepo;
//     if(!repo) return;
//     // return repo.stargazers_count;
//     return indexOf(repo.stargazers_count, 1000, 500, 100, 50, 20, 1);
//   },
//   userCount: function(item) {
//     var room = item.room;
//     if(!room) return 0;
//     return room.userCount || 0;
//   },
//   isWatchedByUser: function(item) {
//     return item.is_watched_by_user ? 1 : 0;
//   },
//   isStarredByUser: function(item) {
//     return item.is_starred_by_user ? 1 : 0;
//   },
//   programmingLanguage: function(item, context) {
//     var language = item.githubRepo && item.githubRepo.language || item.language;
//     if(!language) return;
//     return context.preferredComputerLanguages[language] || 0;
//   },
//   userLanguage: function(item, context) {
//     var language = item.room && item.room.lang || item.localeLanguage;
//     if(!context.localeLanguage || !language) return;
//     return language === context.localeLanguage ? 1 : 0;
//   },
//   highlighted: function(item) {
//     return item.highlighted ? 1 : 0;
//   },
//   similarTagsScore: function(item) {
//     return item.similarTagsScore || 0;
//   },
//   siblingScore: function(item) {
//     return item.roomSibling ? 1 : 0;
//   }
// };
//
// var CATEGORY_COEFFICIENTS = {
//   // use this to apply a multiplier to a category
//   pushTime: 0.5,
//   highlighted: 0.2,
//   siblingScore: 0.7,
//   userCount: 2,
//   isWatchedByUser: 1.2,
//   isStarredByUser: 2,
//   programmingLanguage: 2
// };
//
// function processCategory(name, items, context) {
//   var valueFunc = CATEGORIES[name];
//   var coefficient = CATEGORY_COEFFICIENTS[name];
//
//   var values = items.map(function(f) {
//     return valueFunc(f, context);
//   }).filter(function(f) {
//     return typeof f === 'number';
//   });
//   if(!values.length) return;
//   var max = _.max(values);
//   var min = _.min(values);
//
//   if(max === min) return; // All the values are the same, useless for ranking
//
//   items.forEach(function(item) {
//     var score = valueFunc(item, context);
//     if(typeof score != 'number') return;
//     var rank = ((score - min) / (max - min)) * 100;
//     if(coefficient > 0) {
//       rank = rank * coefficient;
//     }
//
//     if(!item.scores) item.scores = {};
//     item.scores[name] = rank;
//     item.score = item.score ? item.score + rank : rank;
//     item.categories = item.categories ? item.categories + 1 : 1;
//   });
//
// }
//
// function getPreferredComputerLanguages(suggestions) {
//   var result = {};
//   suggestions.forEach(function(item) {
//     if(!item.is_starred_by_user && !item.is_watched_by_user && !item.is_owned_by_user) return;
//     var repo = item.githubRepo;
//     if(!repo || !repo.language) return;
//     result[repo.language] = result[repo.language] ? result[repo.language] + 1 : 1;
//   });
//
//   return result;
// }
//
// /**
//  * If room does not exist:
//  *   -> If the user has push access: -> true
//  *   -> Otherwise false
//  * If the room exists
//  *   -> If the user is already in the room -> false
//  *   -> Otherwise true
//  */
// function filterRecommendations(recommendations, userId) {
//   if(recommendations.length === 0) return Q.resolve([]);
//
//   var uris = recommendations.map(function(r) { return r.uri.toLowerCase(); });
//
//   return persistence.Troupe.findQ({
//       lcUri: { $in: uris }
//     }, {
//       _id: 1,
//       uri: 1,
//       userCount: 1,
//       users: {
//         $elemMatch: { userId: userId }
//       },
//       lang: 1
//     })
//     .then(function(rooms) {
//       var roomsHash = collections.indexByProperty(rooms, 'uri');
//
//       return recommendations.filter(function(recommendation) {
//         var room = roomsHash[recommendation.uri];
//
//         if (room) {
//           recommendation.room = room;
//
//           // Room exists, but user is not in room
//           return !room.users || !room.users.length;
//         }
//
//         var repo = recommendation.repo;
//         if (!repo) return false;
//
//         // Room does not exist.. only recommend it if the user can create it
//         return repo && repo.permissions &&
//           (repo.permissions.admin || repo.permissions.push);
//       });
//
//     });
// }
//
// function getSuggestions(user, localeLanguage) {
//   return recommendations(user, 'marionettejs/backbone.marionette')
//     .then(function(recommendations) {
//       return filterRecommendations(recommendations, user._id);
//     })
//     .then(function(suggestions) {
//       var preferredComputerLanguages = getPreferredComputerLanguages(suggestions);
//
//       Object.keys(CATEGORIES).forEach(function(name) {
//         processCategory(name, suggestions, {
//           preferredComputerLanguages: preferredComputerLanguages,
//           localeLanguage: localeLanguage
//         });
//       });
//
//       suggestions.forEach(function(item) {
//         if(item.categories) {
//           item.score = item.score / item.categories;
//         } else {
//           item.score = 0;
//         }
//       });
//
//       suggestions.sort(function(a, b) {
//         return b.score - a.score;
//       });
//
//       return suggestions.slice(0, MAX_RECOMMENDATIONS);
//     });
// }

function getSuggestionsForUser(user/*, locale*/) {
  // TODO: deal with locale
  return graphRecommendations.getUserRecommendations(user.id);
}
exports.getSuggestionsForUser = getSuggestionsForUser;

/** Return rooms like the provided room */
function getSuggestionsForRoom(room, user) {
  return graphRecommendations.getRoomRecommendations(room.id, user && user.id);
}
exports.getSuggestionsForRoom = getSuggestionsForRoom;
