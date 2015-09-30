"use strict";

var onready = require('./utils/onready');
var context = require('utils/context');
var itemCollections = require('collections/instances/integrated-items');
var EmbedLayout = require('views/layouts/chat-embed');

/* Set the timezone cookie */
require('components/timezone-cookie');

require('components/statsc');
require('views/widgets/preload');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

onready(function() {
  var appView = new EmbedLayout({
    el: 'body', 
    model: context.troupe(), 
    template: false, 
    chatCollection: itemCollections.chats 
  });
  appView.render();
});
