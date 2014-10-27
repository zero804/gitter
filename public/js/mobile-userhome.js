require([
  'views/userhome/userHomeView',
  'jquery',
  'utils/appevents',
  'backbone',
  'views/menu/troupeMenu',
  'views/app/mobileAppView',
  'views/createRoom/confirmRepoRoomView',
  'components/modal-region'
  ], function(UserHomeView, $, appEvents, Backbone, TroupeMenu, MobileAppView, confirmRepoRoomView, modalRegion) {
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
        modalRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      },
      '': function() {
        modalRegion.close();
      }
    }
  });

  new Router();
  Backbone.history.start();

  $('html').removeClass('loading');

});
