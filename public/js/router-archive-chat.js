'use strict';
var $ = require('jquery');
var context = require('./utils/context');
var clientEnv = require('gitter-client-env');
var onready = require('./utils/onready');
var HeaderView = require('./views/app/headerView');
var ArchiveNavigationView = require('./views/archive/archive-navigation-view');
var ArchiveLayout = require('./views/layouts/archive');
var rightToolbarModel = require('./models/right-toolbar-model');
var chatCollection = require('./collections/instances/chats-cached');

/* Set the timezone cookie */
require('./components/timezone-cookie');

require('./views/widgets/preload');
require('./components/dozy');
require('./template/helpers/all');
require('./components/bug-reporting');
require('./utils/tracking');
require('./components/ping');

// Preload widgets
require('./views/widgets/avatar');

require('@gitterhq/styleguide/css/components/buttons.css');

onready(function() {
  $(document).on('click', 'a', function(e) {
    if (this.href) {
      var href = $(this).attr('href');
      if (href.indexOf('#') === 0) {
        e.preventDefault();
        window.location = href;
      }
    }
    return true;
  });

  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on('click', 'a.link', function(e) {
    var basePath = clientEnv['basePath'];
    var href = e.target.getAttribute('href');
    if (!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

  var appView = new ArchiveLayout({
    model: context.troupe(),
    template: false,
    el: 'body',
    chatCollection
  });

  appView.render();
});
