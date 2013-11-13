/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/router',
  'utils/context',
  'views/base',
  'views/profile/profileView',
  'views/profile/profileEmailView',
  'views/profile/profileAddEmailView',
  'views/signup/createTroupeView',
  'collections/instances/troupes',
  'collections/useremails',
  'views/shareSearch/shareSearchView',
  'views/invite/reinviteModal',
  'views/modals/completeYourProfileModal',
  'hbs!views/connect/tmpl/connectUserTemplate',
  'hbs!views/login/tmpl/loginRequestModalView'
  ], function(Router, context, TroupeViews, profileView, profileEmailView, profileAddEmailView, createTroupeView,
    troupeCollections, UserEmailCollection, shareSearchView, InviteModal, completeYourProfileModal, connectUserTemplate,
    loginRequestTemplate) {
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

  var RequestSuccessView = TroupeViews.Base.extend({
    template: loginRequestTemplate,
    getRenderData: function() {
      var data = window.localStorage.pendingRequestConfirmation;
      delete window.localStorage.pendingRequestConfirmation;
      return data;
    },
    afterRender: function() {
      this.$el.find('.modal-content').hide();
      this.$el.find('.modal-success').show();
    },
    events: {
      'click #cancel-button': function(e) {
        this.remove();
        if (this.dialog) this.dialog.hide();
        e.preventDefault();
      }
    }
  });

  var RequestSuccessViewModal = TroupeViews.Modal.extend({
    view: new RequestSuccessView()
  });

  var profileModal = context.getUser().username ? profileView.Modal : completeYourProfileModal;

  var router = Router.extend({
    routes: [
    { name: "profile",               re: /^profile$/,                viewType: profileModal },
    { name: "profileEmails",         re: /^profile\/emails$/,        viewType: profileEmailView.Modal,    collection: userEmailCollection, skipModelLoad: true },
    { name: "profileEmailsAdd",      re: /^profile\/emails\/add$/,   viewType: profileAddEmailView.Modal, collection: userEmailCollection, skipModelLoad: true },
    { name: "create",                re: /^create$/,                 viewType: createTroupeView.Modal,    collection: troupeCollections.troupes,   skipModelLoad: true },
    { name: "share",                 re: /^share$/,                  viewType: shareSearchView.Modal },
    { name: "reinvite",              re: /^reinvite\/(\w+)$/,        viewType: InviteModal,               collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
    { name: "connect",               re: /^connect$/,                viewType: shareSearchView.Modal,     viewOptions: { overrideContext: true, inviteToConnect: true } },
    { name: "inviteSent",            re: /^invitesent$/,             viewType: InviteSuccessViewModal,    skipModelLoad: true },
    { name: "joinTroupeRequestSent", re: /^joinrequestsent$/,        viewType: RequestSuccessViewModal,   skipModelLoad: true },
    ],
    regions: []
  });

return router;

});
