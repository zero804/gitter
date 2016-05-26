"use strict";
var Marionette = require('backbone.marionette');
var ModalView = require('./modal');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var RepoSelectView = require('../createRoom/repoSelectView.js');
var template = require('./tmpl/create-repo-room.hbs');
var appEvents = require('utils/appevents');

require('views/behaviors/isomorphic');


var View = Marionette.LayoutView.extend({
  template: template,

  ui: {
    'modalFailure': '#modal-failure',
    'addBadge': '.js-add-badge'
  },

  behaviors: {
    Isomorphic: {
      repoSelectRegion: {
        el: '#repo-select',
        init: function(optionsForRegion) {
          return new RepoSelectView.View(optionsForRegion({ collection: RepoSelectView.createCollection() }));
        }
      }
    }
  },

  events: {
    'click #upgrade-auth': 'upgradeAuthClicked'
  },

  childEvents: {
    'selected': 'repoSelected'
  },

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  repoSelected: function(child, r) { // jshint unused:true
    if(!r) return;
    var self = this;
    var uri = r.get('uri');
    var addBadge = this.ui.addBadge.prop('checked');

    apiClient.post('/v1/rooms', { uri: uri, addBadge: addBadge })
      .then(function (res) {
        if (res.extra.hookCreationFailedDueToMissingScope) {
          setTimeout(promptForHook, 1500);
        }
        self.dialog.hide();
        appEvents.trigger('navigation', '/' + uri, 'chat', uri, null);
      })
      .catch(function(/*err*/) {
        self.ui.modalFailure.text('Unable to create room.');
        self.ui.modalFailure.slideDown(250);
        setTimeout(function () {
          self.ui.modalFailure.slideUp(250);
        }, 4000);
      });
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'back':
        window.location.hash = "#createroom";
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  upgradeAuthClicked: function(e) {
    // don't also click the closest room..
    e.stopPropagation();
    window.addEventListener('message', oauthUpgradeAfterRequestedCallback, false);
  },

  serializeData: function () {
    return {
      privateRepoScope: !!context.getUser().scopes.private_repo
    };
  }

});

var Modal = ModalView.extend({
  disableAutoFocus: true,
  initialize: function(options) {
    options = options || {};
    options.title = options.title || "Create a repository chat room";

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: [
    { action: "back", text: "Back", className: "modal--default__footer__link", pull: 'left'},
  ]
});

module.exports = {
  View: View,
  Modal: Modal
};

function promptForHook() {
  appEvents.trigger('user_notification', {
    click: function(e) {
      e.preventDefault();
      window.addEventListener('message', oauthUpgradeAfterRoomCreationCallback, false);
      window.open('/login/upgrade?scopes=public_repo');
    },

    title: 'Authorisation',
    text: 'Your room has been created, but we weren\'t able ' +
      'to integrate with the repository as we need write ' +
      'access to your GitHub repositories. Click here to ' +
      'give Gitter access to do this.',
    timeout: 12000,
  });
}

function oauthUpgradeAfterRoomCreationCallback(e) {
  if (e.data !== 'oauth_upgrade_complete') return;

  window.removeEventListener('message', oauthUpgradeAfterRoomCreationCallback, false);

  apiClient.room.put('', { autoConfigureHooks: 1 })
  .then(function() {
    appEvents.trigger('user_notification', {
      title: 'Thank You',
      text: 'Your integrations have been setup.',
    });
  });
}

function oauthUpgradeAfterRequestedCallback(e) {
  if (e.data !== 'oauth_upgrade_complete') return;

  window.removeEventListener('message', oauthUpgradeAfterRequestedCallback, false);

  window.location.reload();
}
