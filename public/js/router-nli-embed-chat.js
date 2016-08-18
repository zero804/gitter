"use strict";

var ChatLayout = require('./views/layouts/chat');
var chatModels = require('./collections/chat');
var onready = require('./utils/onready');
var $ = require('jquery');

/* Set the timezone cookie */
require('./components/timezone-cookie');

require('./components/statsc');
require('./views/widgets/preload');
require('./components/dozy');
require('./template/helpers/all');
require('./components/bug-reporting');
require('./components/ping');

// Preload widgets
require('./views/widgets/avatar');

var chatCollection = new chatModels.ChatCollection(null, { listen: true });
chatCollection.on('add', function (item) {
  setTimeout(item.set.bind(item, 'unread', false), 500);
});

onready(function() {
  var appView = new ChatLayout({ template: false, el: 'body', chatCollection: chatCollection });
  appView.render();

  // FIXME: this is pretty shit but it's being rendered server side so...
  $('#login').click(function(evt) {
    evt.preventDefault();
    window.open('/login?action=signup&source=embedded&returnTo=/login/embed', '', 'width=1100, height=600');
  });
});


// When the login is complete in the popup it'll post a message back
window.addEventListener('message', function(event) {
  if (event.origin !== location.origin) return;
  if (event.data === 'login_complete') {
    location.hash = '#autojoin';
    location.reload();
  }
});
