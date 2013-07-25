/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'backbone',
  'views/base',
  'hbs!views/login/tmpl/loginRequestModalView',
  'views/shareSearch/shareSearchView',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'collections/instances/troupes',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/app/userHeaderView',
  'views/toolbar/troupeMenu',
  'utils/router',
  'components/errorReporter',
  'components/dozy',
  'components/webNotifications',
  'template/helpers/all'
], function(Backbone, TroupeViews, loginRequestTemplate, shareSearchView, AppIntegratedView, UserHomeView, troupeCollections,
  profileView, createTroupeView, UserHeaderView, TroupeMenuView, Router /*, errorReporter , dozy, webNotifications,_Helpers,  _backboneKeys*/) {

  "use strict";

  var appView = new AppIntegratedView();
  appView.leftMenuRegion.show(new TroupeMenuView());
  appView.headerRegion.show( new UserHeaderView());

  new UserHomeView({ el: '#chat-frame' }).render();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });

  if(window.troupeContext.profileNotCompleted) {
   var view = new profileView.Modal({ disableClose: true  });

   view.once('close', function() {
     window.location.reload(true);
   });
   view.show();

   return;
  }

  // Show a popup to confirm access requests through signup.
  try {
    if (window.localStorage && window.localStorage.pendingRequestConfirmation) {
      var data = window.localStorage.pendingRequestConfirmation;
      //alert("Your access request has been sent. We will notify you once it is accepted.");
      var RequestSuccessView = TroupeViews.Base.extend({
        template: loginRequestTemplate,
        getRenderData: function() {
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
      delete window.localStorage.pendingRequestConfirmation;
      (new TroupeViews.Modal({
        view: new RequestSuccessView()
      })).show();
    }
  }
  catch (e) {}

  new Router({
      routes: [
        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
        { name: "share",          re: /^share$/,                  viewType: shareSearchView.Modal },
        { name: "connect",          re: /^connect$/,              viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } }
      ],
      appView: appView
    });

  Backbone.history.start();

});
