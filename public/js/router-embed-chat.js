"use strict";

var ChatLayout = require('views/layouts/chat');
var chatModels = require('collections/chat');
var onready = require('./utils/onready');

require('components/statsc');
require('views/widgets/preload');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

var chatCollection = new chatModels.ChatCollection(null, { listen: true });
chatCollection.on('add', function (item) {
  setTimeout(item.set.bind(item, 'unread', false), 500);
});

onready(function() {
  var appView = new ChatLayout({ template: false, el: 'body', chatCollection: chatCollection });
  appView.render();
});
