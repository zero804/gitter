define([
  'marionette',
  'views/base',
  'utils/context',
  'components/apiClient',
  './repoSelectView',
  'hbs!./tmpl/createRepoRoom',
  'utils/appevents'
], function (Marionette, TroupeViews, context, apiClient, RepoSelectView, template, appEvents) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,

    ui: {
      'modalFailure': '#modal-failure',
      'addBadge': '.js-add-badge'
    },

    regions: {
      repoSelectRegion: '#repo-select',
    },

    initialize: function() {
      this.repoSelectView = new RepoSelectView({ collection: RepoSelectView.createCollection() });
      this.listenTo(this.repoSelectView, 'selected', this.repoSelected);
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    repoSelected: function(r) {
      if(!r) return;
      var self = this;
      var uri = r.get('uri');
      var addBadge = this.ui.addBadge.prop('checked');

      apiClient.post('/api/v1/rooms', { uri: uri, addBadge: addBadge })
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
    },

    onRender: function() {
      if(!this.repoSelectRegion.currentView) {
        this.repoSelectRegion.show(this.repoSelectView);
      }
    }

  });

  var Modal = TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a repository chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
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

});
