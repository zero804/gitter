"use strict";

//var ChatLayout = require('views/layouts/chat');
var onready = require('./utils/onready');
var context = require('utils/context');


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


//var chatModels = require('collections/chat');
//var chatCollection = new chatModels.ChatCollection(null, { listen: true });
//chatCollection.on('add', function (item) {
//  setTimeout(item.set.bind(item, 'unread', false), 500);
//});


onready(function() {
  var itemCollections = require('collections/instances/integrated-items');
  var EmbedLayout = require('views/layouts/chat-embed');
  var appView = new EmbedLayout({ model: context.troupe(), template: false, el: 'body', chatCollection: itemCollections.chats });
  appView.render();

  //var appView = new ChatLayout({ template: false, el: 'body', chatCollection: chatCollection });
  //appView.render();
});
