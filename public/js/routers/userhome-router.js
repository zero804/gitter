/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/router',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'collections/instances/troupes',
  'views/shareSearch/shareSearchView',
  'views/invite/reinviteModal'
  ], function(Router, profileView, createTroupeView, troupeCollections, shareSearchView, InviteModal) {
  "use strict";

  return Router.extend({
    routes: [
      { name: "profile",  re: /^profile$/,         viewType: profileView.Modal },
      { name: "create",   re: /^create$/,          viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
      { name: "share",    re: /^share$/,           viewType: shareSearchView.Modal },
      { name: "reinvite", re: /^reinvite\/(\w+)$/, viewType: InviteModal,                  collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "connect",  re: /^connect$/,         viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } }
    ],
    regions: []
  });

});
