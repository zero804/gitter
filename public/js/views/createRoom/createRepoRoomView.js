"use strict";
var Marionette = require('backbone.marionette');
var ModalView = require('views/modal');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var RepoSelectView = require('./repoSelectView');
var template = require('./tmpl/createRepoRoom.hbs');
var appEvents = require('utils/appevents');
require('views/behaviors/isomorphic');

module.exports = (function() {

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
            return new RepoSelectView(optionsForRegion({ collection: RepoSelectView.createCollection() }));
          }
        }
      }
    },

    childEvents: {
      'selected': 'repoSelected'
    },

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    repoSelected: function(r) {
      if(!r) return;
      var self = this;
      var uri = r.get('uri');
      var addBadge = this.ui.addBadge.prop('checked');

      apiClient.post('/v1/rooms', { uri: uri, addBadge: addBadge })
        .then(function() {
          self.dialog.hide();
          appEvents.trigger('navigation', '/' + uri, 'chat', uri, null);
        })
        .fail(function(/*xhr*/) {
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
      { action: "back", text: "Back", className: "trpBtnLightGrey"},
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };


})();
