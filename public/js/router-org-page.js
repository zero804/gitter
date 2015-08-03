/*global require, console, window, document */
"use strict";

var onReady = require('./utils/onready');
var Backbone= require('backbone');
var appEvents = require('utils/appevents');
var frameUtils = require('./utils/frame-utils');
var modalRegion = require('components/modal-region');

onReady(function(){

  require('components/link-handler').installLinkHandler();

  appEvents.on('navigation', function(url, type, title) {
    if(frameUtils.hasParentFrameSameOrigin()) {
      frameUtils.postMessage({ type: "navigation", url: url, urlType: type, title: title});
    } else {
      // No pushState here. Open the link directly
      // Remember that (window.parent === window) when there is no parent frame
      window.parent.location.href = url;
    }
  });

  var Router = Backbone.Router.extend({

    routes: {
      '': 'index',
      ':rommId/tags': 'onNavigateTags'
    },

    index: function(){
        modalRegion.destroy();
        //FIXME: ugly hack to refresh the server rendered page once
        //a user has added tags to a room
        //jp 3/9/15
        window.location.reload();
    },

    onNavigateTags: function(roomId){
      require.ensure(['views/app/editTagsView'], function(require) {
        var EditTagsView = require('views/app/editTagsView');
        modalRegion.show(new EditTagsView({ roomId: roomId }));
      });
    }
  });

  new Router();
  Backbone.history.start({ silent: true });
});
