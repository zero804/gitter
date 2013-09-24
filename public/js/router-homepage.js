/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'backbone',
  'views/base',
  'utils/context',
  'hbs!views/login/tmpl/loginRequestModalView',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'routers/userhome-router',
  'hbs!views/connect/tmpl/connectUserTemplate',
  'collections/instances/troupes',
  'views/app/smartCollectionView',
  'components/errorReporter',
  'components/dozy',
  'components/webNotifications',
  'components/desktopNotifications',
  'template/helpers/all'
], function(Backbone, TroupeViews, context, loginRequestTemplate,  AppIntegratedView, UserHomeView, UserhomeRouter, connectUserTemplate, troupeCollections, SmartCollectionView /*, errorReporter , dozy, webNotifications,_Helpers*/) {

  "use strict";

  var troupeCollection = troupeCollections.troupes;

  var appView = new AppIntegratedView();
  appView.smartMenuRegion.show(new SmartCollectionView({ collection: troupeCollections.smart }));

  new UserHomeView({ el: '#content-wrapper' }).render();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });

  // TODO: stop using localstorage for this, move to context events
  try {
    var ls = window.localStorage;
    if (ls) {
      var data;

      // Show a popup to confirm access requests through signup.
      if(ls.pendingRequestConfirmation) {
        data = ls.pendingRequestConfirmation;
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
        delete ls.pendingRequestConfirmation;

        new TroupeViews.Modal({view: new RequestSuccessView() }).show();
      }

      // Show a popup to confirm connection invite through signup.
      if (ls.pendingConnectConfirmation) {
        data = JSON.parse(ls.pendingConnectConfirmation);

        var InviteSuccessView = TroupeViews.Base.extend({
          template: connectUserTemplate,
          getRenderData: function() {
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
        delete ls.pendingConnectConfirmation;
        (new TroupeViews.Modal({
          view: new InviteSuccessView()
        })).show();

      }
    }
  }
  catch (e) {}

  new UserhomeRouter({
    regions: [appView.rightPanelRegion, appView.dialogRegion]
  });

  Backbone.history.start();

  if(!window.localStorage.troupeTourHome) {
    window.localStorage.troupeTourHome = 1;
    require([
      'tours/tour-controller'
    ], function(tourController) {
      tourController.init({ appIntegratedView: appView });
    });
  }

});
