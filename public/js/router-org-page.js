"use strict";

require('utils/font-setup');

var onReady = require('./utils/onready');
var Backbone = require('backbone');
var appEvents = require('utils/appevents');
var modalRegion = require('components/modal-region');
var _ = require('underscore');
var clientEnv = require('gitter-client-env');

require('gitter-styleguide/css/components/buttons.css');
require('gitter-styleguide/css/components/headings.css');

require('utils/tracking');

onReady(function(){

  require('components/link-handler').installLinkHandler();

  //We are always within an iFrame to we can
  //change the parent url with NO FEAR!
  appEvents.on('navigation', function(url) {
    window.parent.location.assign(url);
  });

  //listen for postMessageCalls
  window.addEventListener('message', function onWindowMessage(message, targetOrigin){
    if (message.origin !== clientEnv['basePath']) return;

    var data;
    if(_.isString(message.data)) {
      try {
        data = JSON.parse(message.data);
      }
      catch(e){
        //FIXME JP 8/9/15 Should so something with this error
        data = message.data;
      }
    }
    else {
      data = message.data;
    }
    if(data.type !== 'change:room') return;
    window.location.replace(data.url);
  });

  var Router = Backbone.Router.extend({

    routes: {
      '': 'index',
      'tags/:roomId': 'onNavigateTags'
    },

    index: function(){
        modalRegion.destroy();
        //FIXME: ugly hack to refresh the server rendered page once
        //a user has added tags to a room
        //jp 3/9/15
        window.location.reload();
    },

    onNavigateTags: function(roomId){
      require.ensure(['views/modals/edit-tags-view'], function(require) {
        var EditTagsView = require('views/modals/edit-tags-view');
        modalRegion.show(new EditTagsView({ roomId: roomId }));
      });
    }
  });

  new Router();
  Backbone.history.start({ silent: true });
});
