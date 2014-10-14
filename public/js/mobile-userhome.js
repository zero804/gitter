require([
  'views/userhome/userHomeView',
  'jquery',
  'utils/appevents',
  'backbone',
  'views/menu/troupeMenu',
  'views/app/mobileAppView',
  'views/createRoom/confirmRepoRoomView',
  ], function(UserHomeView, $, appEvents, Backbone, TroupeMenu, MobileAppView, confirmRepoRoomView) {
  "use strict";

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  new UserHomeView({
    el: $('#content-frame')
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      'confirm/*uri': function(uri) {
        new confirmRepoRoomView.Modal({ uri: uri }).show();
      }
    }
  });

  new Router();
  Backbone.history.start();

  $('html').removeClass('loading');

});
