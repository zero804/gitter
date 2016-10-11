'use strict';

var $ = require('jquery');
var Backbone = require('backbone');
var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');
var MobileAppLayout = require('./views/layouts/mobile-app');
var clientEnv = require('gitter-client-env');

//Remove when Left Menu is in
var FastClick = require('fastclick');

require('./utils/font-setup');
require('gitter-web-frame-utils');
require('./utils/tracking');

// Preload widgets
require('./views/widgets/avatar');
require('./template/helpers/all');

//Super simple router used only to dismiss any modals
//that are shown
var Router = Backbone.Router.extend({
  routes: {
    '': 'index',
    login: 'login'
  },

  initialize: function(attrs) {
    this.modalRegion = attrs.modalRegion;
  },

  index: function(){
    //Clear any existing modals
    this.modalRegion.destroy();
  },

  login: function(){
    //Async load our login modal
    var self = this;
    require.ensure(['./views/modals/login-view'], function(require){
      var LoginView = require('./views/modals/login-view');
      self.modalRegion.show(new LoginView());
    });
  }
});

//Simple helper to get data from
//any postMessage event handles
function parsePostMessagePayload(data){
  var message;
  try { message = JSON.parse(data); }
  catch (err) { return; }
  return message;
}

//Simple wrapper for changing pushState
function pushState(state, title, url) {
  if (state === window.history.state) { return; }
  window.history.pushState(state, title, url);
}


onready(function() {
  $('html').removeClass('loading');

  var mobileView = new MobileAppLayout({
    template: false,
    el: 'body'
  });

  var router = new Router({ modalRegion: mobileView.dialogRegion });

  //Remove for Left Menu
  FastClick.attach(document.body);

  require('./components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  window.addEventListener('message', function(e){
    if (e.origin !== clientEnv.basePath) { return; }
    var message = parsePostMessagePayload(e.data);

    switch (message.type) {
      case 'navigation': return pushState(message.url, message.title, message.url);
        //I literally have no idea why this in not "navigation"
        //seems foolish not to be .... JP 11/10/16
      case 'route': return router.navigate('login', { trigger: true });
    }

  });

  //Render our view so its good and ready for updates
  mobileView.render();

  //Start the routing
  Backbone.history.start();
});
