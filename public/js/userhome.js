/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'backbone',
  'utils/router',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView'
], function(Backbone, Router, AppIntegratedView, UserHomeView) {

  "use strict";

  // var troupeCollection = troupeCollections.troupes;
  var appView = new AppIntegratedView();

  new UserHomeView({ el: '#content-wrapper' }).render();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });

  new Router({
    routes: [],
    regions: [appView.rightPanelRegion, appView.dialogRegion],
    rootHandler: function() {}
  });

  Backbone.history.start();

});
