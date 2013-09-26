/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/router',
  'utils/context',
  'views/profile/profileView',
  'views/profile/profileEmailView',
  'views/profile/profileAddEmailView',
  'views/signup/createTroupeView',
  'collections/instances/troupes',
  'collections/useremails',
  'views/shareSearch/shareSearchView',
  'views/invite/reinviteModal'
  ], function(Router, context, profileView, profileEmailView, profileAddEmailView, createTroupeView, troupeCollections, UserEmailCollection, shareSearchView, InviteModal) {
  "use strict";

  // instantiate user email collection
  var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  var router = Router.extend({
    routes: [
      { name: "profile",  re: /^profile$/,         viewType: profileView.Modal },
      { name: "profileEmails",    re: /^profile\/emails$/,        viewType: profileEmailView.Modal, collection: userEmailCollection, skipModelLoad: true },
      { name: "profileEmailsAdd", re: /^profile\/emails\/add$/,   viewType: profileAddEmailView.Modal, collection: userEmailCollection, skipModelLoad: true },
      { name: "create",   re: /^create$/,          viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
      { name: "share",    re: /^share$/,           viewType: shareSearchView.Modal },
      { name: "reinvite", re: /^reinvite\/(\w+)$/, viewType: InviteModal,                  collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "connect",  re: /^connect$/,         viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } }
    ],
    regions: []
  });

  if(context.popEvent('password_reset')) {
    new profileView.Modal({ disableClose: true }).show();
  }

  return router;

});
