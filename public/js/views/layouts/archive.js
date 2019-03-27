'use strict';

var context = require('../../utils/context');
var ChatLayout = require('./chat');
var HeaderView = require('../app/headerView');
var ArchiveNavigationView = require('../archive/archive-navigation-view');

require('../behaviors/isomorphic');

module.exports = ChatLayout.extend({
  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },
      navigation: {
        el: '#archive-navigation',
        init: 'initArchiveNavigation'
      },
      header: {
        el: '#header-wrapper',
        init: 'initHeaderRegion'
      }
    }
  },

  initArchiveNavigation: function(optionsForRegion) {
    var archiveContext = context().archive;

    // TODO: pass the whole archive context as a model
    return new ArchiveNavigationView(
      optionsForRegion({
        archiveDate: archiveContext.archiveDate,
        nextDate: archiveContext.nextDate,
        previousDate: archiveContext.previousDate
      })
    );
  },

  initHeaderRegion: function(optionsForRegion) {
    return new HeaderView(
      optionsForRegion({
        model: context.troupe()
      })
    );
  }
});
