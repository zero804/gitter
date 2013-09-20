/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var restSerializer  = require("../serializers/rest-serializer");
var oauthService    = require("../services/oauth-service");
var presenceService = require("../services/presence-service");
var useragent       = require("useragent");
var crypto          = require("crypto");

var appVersion = require("./appVersion");
var Q = require('q');

/**
 * Returns the promise of a mini-context
 */
exports.generateMiniContext = function(req, callback) {
  var user = req.user;

  return Q.all([
      user ? serializeUser(user) : null,
      user ? getWebToken(user) : null,
      user ? determineDesktopNotifications(user, req) : false
    ])
    .spread(function(serializedUser, token, desktopNotifications) {
      return createTroupeContext(req, {
        user: serializedUser,
        accessToken: token,
        inUserhome: true,
        desktopNotifications: desktopNotifications
      });
    })
    .nodeify(callback);
};

exports.generateSocketContext = function(userId, troupeId, callback) {
  return Q.all([
      serializeUserId(userId),
      serializeTroupeId(troupeId, userId)
    ])
    .spread(function(serializedUser, serializedTroupe) {
      return {
        user: serializedUser,
        troupe: serializedTroupe
      };
    })
    .nodeify(callback);
};

exports.generateTroupeContext = function(req, callback) {
  var user = req.user;
  var troupe = req.uriContext.troupe;
  var invite = req.uriContext.invite;
  var homeUser = req.uriContext.oneToOne && req.uriContext.otherUser; // The users page being looked at
  var accessDenied = !req.uriContext.access;

  var troupeHash;
  if(troupe) {
    var cipher = crypto.createCipher('aes256', '***REMOVED***');
    var hash   = cipher.update(troupe.id, 'utf8', 'hex') + cipher.final('hex');
    troupeHash  = hash;

  }

  return Q.all([
    user ? serializeUser(user) : null,
    homeUser ? serializeHomeUser(homeUser, !!invite) : undefined, //include email if the user has an invite
    user ? getWebToken(user) : null,
    troupe && user ? serializeTroupe(troupe, user) : fakeSerializedTroupe(req.uriContext),
    determineDesktopNotifications(user, req)
  ])
  .spread(function(serializedUser, serializedHomeUser, token, serializedTroupe, desktopNotifications) {

    var status;
    if(user) {
      status = user.status;
    }

    return createTroupeContext(req, {
      user: serializedUser,
      homeUser: serializedHomeUser,
      troupe: serializedTroupe,
      accessToken: token,
      inviteId: invite && invite.id,
      accessDenied: accessDenied,
      desktopNotifications: desktopNotifications,
      troupeHash: troupeHash
    });
  })
  .nodeify(callback);
};

/**
 * Figures out whether to use desktop notifications for this user
 */

function determineDesktopNotifications(user, req) {
  if(!user) return true;

  var agent = useragent.parse(req.headers['user-agent']);
  var os = agent.os.family;
  var clientType;

  if(os === 'Mac OS X') {
    clientType = 'osx';
  } else if(os.indexOf('Windows') === 0) {
    clientType = 'win';
  }

  if(clientType) {
    return Q.nfcall(presenceService.isUserConnectedWithClientType, user.id, clientType)
      .then(function(result) {
        return !result;
      });
  }

  return true;

}

function serializeUser(user) {
  var strategy = new restSerializer.UserStrategy({ includeEmail: true });

  return restSerializer.serializeQ(user, strategy);
}

function serializeUserId(userId) {
  var strategy = new restSerializer.UserIdStrategy({ includeEmail: true });

  return restSerializer.serializeQ(userId, strategy);
}

function serializeHomeUser(user, includeEmail) {
  var strategy = new restSerializer.UserStrategy({ includeEmail: includeEmail, hideLocation: true });

  return restSerializer.serializeQ(user, strategy);
}

function getWebToken(user) {
  return oauthService.findOrGenerateWebToken(user.id);
}

function serializeTroupeId(troupeId, userId) {
  var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

  return restSerializer.serializeQ(troupeId, strategy);
}


function serializeTroupe(troupe, user) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: user ? user.id : null });

  return restSerializer.serializeQ(troupe, strategy);
}

function fakeSerializedTroupe(uriContext) {
  var oneToOne = uriContext.oneToOne;
  var otherUser = uriContext.otherUser;
  var troupe = uriContext.troupe;

  var uri = (oneToOne ?  (otherUser.username || "one-one/" + otherUser.id ) : troupe.uri);

  var url = "/" + uri;

  return {
    oneToOne: oneToOne,
    uri: uri,
    url: url,
    name: otherUser && otherUser.username ? otherUser.username : 'Welcome'
  };

}

function createTroupeContext(req, options) {
  var events = req.session.events;
  if(events) { delete req.session.events; }

  return {
      user: options.user,
      troupe: options.troupe,
      homeUser: options.homeUser,
      inUserhome: options.inUserhome,
      accessToken: options.accessToken,
      loginToAccept: req.loginToAccept,
      accessDenied: options.accessDenied,
      inviteId: options.inviteId,
      appVersion: appVersion.getCurrentVersion(),
      desktopNotifications: options.desktopNotifications,
      importedGoogleContacts: req.user && req.user.googleRefreshToken ? true : false,
      events: events,
      troupeUri: options.troupe ? options.troupe.uri : undefined,
      troupeHash: options.troupeHash
    };
  }
