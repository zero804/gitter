require([
  'views/userhome/userHomeView',
  'utils/appevents',
  'backbone',
  'views/createRoom/confirmRepoRoomView',
  'components/csrf'                             // No ref
], function(UserHomeView, appEvents, Backbone, confirmRepoRoomView) {

  "use strict";

  new UserHomeView({ el: '#content-wrapper' }).render();

  appEvents.on('navigation', function(url) {
    if(url.indexOf('#') === 0) {
      window.location.hash = url;
    } else {
      (window.parent || window).location.href = url;
    }
  });

  var Router = Backbone.Router.extend({
    routes: {
      'confirm/*uri': function(uri) {
        new confirmRepoRoomView.Modal({ uri: uri }).show();
      }
    }
  });

  new Router();
  Backbone.history.start();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });
});
