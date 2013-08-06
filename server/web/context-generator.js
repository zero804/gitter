/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var restSerializer = require("../serializers/rest-serializer");
var oauthService = require("../services/oauth-service");
var appVersion = require("./appVersion");
var Q = require('q');
var useFirebugInIE = nconf.get('web:useFirebugInIE');

module.exports.generateMiniContext = function(req, callback) {
  var user = req.user;

  Q.all([ serializeUser(user), getWebToken(user) ])
    .spread(function(serializedUser, token) {
      var profileNotCompleted = user.status == 'PROFILE_NOT_COMPLETED';
      var troupeContext = createTroupeContext(req, {
        user: serializedUser,
        accessToken: token,
        profileNotCompleted: profileNotCompleted,
        inUserhome: true
      });
      callback(null, troupeContext);
    })
    .fail(callback);
};

module.exports.generateTroupeContext = function(req, callback) {
  var user = req.user;
  var troupe = req.uriContext.troupe;
  var invite = req.uriContext.invite;
  var homeUser = req.uriContext.oneToOne && req.uriContext.otherUser; // The users page being looked at
  var accessDenied = !req.uriContext.access;

  Q.all([
  user ? serializeUser(user) : null,
  homeUser ? serializeHomeUser(homeUser, !!invite) : undefined, //include email if the user has an invite
  user ? getWebToken(user) : null,
  troupe && user ? serializeTroupe(troupe, user) : fakeSerializedTroupe(req.uriContext) ])
  .spread(function(serializedUser, serializedHomeUser, token, serializedTroupe) {

    var status, profileNotCompleted;
    if(user) {
      status = user.status;
      profileNotCompleted = (status == 'PROFILE_NOT_COMPLETED') || (status == 'UNCONFIRMED');
    }

    var troupeContext = createTroupeContext(req, {
      user: serializedUser,
      homeUser: serializedHomeUser,
      troupe: serializedTroupe,
      accessToken: token,
      profileNotCompleted: profileNotCompleted,
      inviteId: invite && invite.id,
      accessDenied: accessDenied
    });
    callback(null, troupeContext);
  })
  .fail(callback);
};

function serializeUser(user) {
  var strategy = new restSerializer.UserStrategy({ includeEmail: true });

  return restSerializer.serializeQ(user, strategy);
}

function serializeHomeUser(user, includeEmail) {
  var strategy = new restSerializer.UserStrategy({ includeEmail: includeEmail, hideLocation: true });

  return restSerializer.serializeQ(user, strategy);
}

function getWebToken(user) {
  return oauthService.findOrGenerateWebToken(user.id);
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

  var disabledFayeProtocols = [];

  var userAgent = req.headers['user-agent'];
  userAgent = userAgent ? userAgent : '';

  // Disable websocket on Mobile due to iOS crash bug
  if(userAgent.indexOf('Mobile') >= 0) {
    disabledFayeProtocols.push('websocket');
  }

  var useFirebug = useFirebugInIE && userAgent.indexOf('MSIE') >= 0;

  return {
      user: options.user,
      troupe: options.troupe,
      homeUser: options.homeUser,
      inUserhome: options.inUserhome,
      accessToken: options.accessToken,
      loginToAccept: req.loginToAccept,
      profileNotCompleted: options.profileNotCompleted,
      accessDenied: options.accessDenied,
      inviteId: options.inviteId,
      mobilePage: req.params && req.params.mobilePage,
      appVersion: appVersion.getCurrentVersion(),
      baseServer: nconf.get('web:baseserver'),
      basePort: nconf.get('web:baseport'),
      basePath: nconf.get('web:basepath'),
      homeUrl: nconf.get('web:homeurl'),
      mixpanelToken: nconf.get("stats:mixpanel:token"),
      importedGoogleContacts: req.user && req.user.googleRefreshToken ? true : false,

      troupeUri: options.troupe ? options.troupe.uri : undefined,
      websockets: {
        fayeUrl: nconf.get('ws:fayeUrl') || "/faye",
        options: {
          timeout: nconf.get('ws:fayeTimeout'),
          retry: nconf.get('ws:fayeRetry'),
          interval: nconf.get('ws:fayeInterval')
        },
        disable: disabledFayeProtocols
      },
      useFirebug: useFirebug
    };
  }
