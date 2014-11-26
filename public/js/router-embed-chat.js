"use strict";
var ChatNliIntegratedView = require('views/app/chatNliIntegratedView');
var chatModels = require('collections/chat');
var onready = require('./utils/onready');

require('components/statsc');
require('views/widgets/preload');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

var chatCollection = new chatModels.ChatCollection(null, { listen: true });

onready(function() {

  new ChatNliIntegratedView({ el: 'body', chatCollection: chatCollection });

  chatCollection.on('add', function (item) {
    setTimeout(item.set.bind(item, 'unread', false), 500);
  });

});
