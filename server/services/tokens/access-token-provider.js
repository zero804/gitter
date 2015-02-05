'use strict';

var persistenceService = require("./persistence-service");
var random = require('../../utils/random');

module.exports = {
  getToken: function(userId, clientId) {
    /* Its much quicker to lookup the token in MongoDB than it is to generate one with randomByes and then attempt and upsert */

    /* Lookup and possible create */
    return persistenceService.OAuthAccessToken.findOneQ({
        userId: userId,
        clientId: clientId
      }, {
        _id: 0, token: 1
      }, {
        lean: true
      })
      .then(function(oauthAccessToken) {
        if(oauthAccessToken && oauthAccessToken.token) {
          return oauthAccessToken.token;
        }

        /* Generate a token and attempt an upsert */
        return random.generateToken()
          .then(function(token) {
            if(!userId) {
              // Anonymous tokens start with a `$`
              token = "$" + token;
            }

            return persistenceService.OAuthAccessToken.findOneAndUpdateQ(
              { userId: userId, clientId: clientId },
              {
                $setOnInsert: {
                  token: token
                }
              },
              {
                upsert: true
              }).then(function(result) {
                return result.token;
              });
          });
      });

  },

  validateToken: function(token) {
    return persistenceService.OAuthAccessToken.findOne({ token: token }, { _id: 0, userId: 1, clientId: 1 })
      .lean()
      .execQ()
      .then(function(accessToken) {
        if(!accessToken) return null;


        var clientId = accessToken.clientId;
        var userId = accessToken.userId;   // userId CAN be null

        if(!clientId) return null; // unknown client

        return [userId, clientId];
      });

  },

  cacheToken: function(userId, clientId, token) { // jshint unused:false
    // This is the terminating access provider. Should never need to cache
    return Q.resolve();
  },

  deleteToken: function(token) {
    return persistenceService.OAuthAccessToken.removeQ({ token: token });
  }
};
