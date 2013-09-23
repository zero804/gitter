/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/router',
  'views/base',
  'views/profile/profileView',
  'views/profile/profileEmailView',
  'views/profile/profileAddEmailView',
  'views/signup/createTroupeView',
  'collections/instances/troupes',
  'collections/useremails',
  'views/shareSearch/shareSearchView',
  'views/invite/reinviteModal',
  'hbs!views/connect/tmpl/connectUserTemplate'
  ], function(Router, TroupeViews, profileView, profileEmailView, profileAddEmailView, createTroupeView, troupeCollections, UserEmailCollection, shareSearchView, InviteModal, connectUserTemplate) {
  "use strict";

  // instantiate user email collection
  var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  var InviteSuccessView = TroupeViews.Base.extend({
    template: connectUserTemplate,
    getRenderData: function() {
      var data = JSON.parse(window.localStorage.pendingConnectConfirmation);
      delete window.localStorage.pendingConnectConfirmation;
      return data;
    },
    afterRender: function() {
      this.$el.find('.modal-content').hide();
      this.$el.find('.modal-success').show();
      this.$el.find('#learn-more-btn').hide();
    },
    events: {
      'click #cancel-button': function(e) {
        this.remove();
        if (this.dialog) this.dialog.hide();
        e.preventDefault();
      }
    }
  });

  var InviteSuccessViewModal = TroupeViews.Modal.extend({
    view: new InviteSuccessView()
  });

  return Router.extend({
    routes: [
      { name: "profile",  re: /^profile$/,         viewType: profileView.Modal },
      { name: "profileEmails",    re: /^profile\/emails$/,        viewType: profileEmailView.Modal, collection: userEmailCollection, skipModelLoad: true },
      { name: "profileEmailsAdd", re: /^profile\/emails\/add$/,   viewType: profileAddEmailView.Modal, collection: userEmailCollection, skipModelLoad: true },
      { name: "create",   re: /^create$/,          viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
      { name: "share",    re: /^share$/,           viewType: shareSearchView.Modal },
      { name: "reinvite", re: /^reinvite\/(\w+)$/, viewType: InviteModal,                  collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "connect",  re: /^connect$/,         viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "inviteSent", re: /^invitesent$/, viewType: InviteSuccessViewModal, skipModelLoad: true }
    ],
    regions: []
  });

});
