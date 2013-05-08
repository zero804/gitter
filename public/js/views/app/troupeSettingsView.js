define([
  'views/base',
  'hbs!./tmpl/troupeSettingsTemplate'
], function(TroupeViews, troupeSettingsTemplate) {

  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'submit #troupeSettings': 'saveSettings'
    },

    initialize: function(options) {
      var self = this;
      this.on('button.click', function(id) {
        switch(id) {
          case 'save-troupe-settings':
            self.saveSettings();
            break;
          case 'cancel-troupe-settings':
            self.dialog.hide();
            self.dialog = null;
            break;
        }
      });

    },

    getRenderData: function() {
      return window.troupeContext.troupe;
    },

    saveSettings: function(e) {
      if(e) e.preventDefault();

      var troupeName = this.$el.find('input[name=name]').val().trim();
      var self = this;

      if(window.troupeContext.troupe.name === troupeName) {
        self.dialog.hide();
        self.dialog = null;
        return;
      }

      window.troupeContext.troupe.name = troupeName;

      $.ajax({
        url: '/troupes/' + window.troupeContext.troupe.id,
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ name: troupeName }),
        success: function() {
          self.dialog.hide();
          self.dialog = null;
        }
      });
    }
  });

  return TroupeViews.ConfirmationModal.extend({
    initialize: function(options) {
      options.title = "Settings for this Troupe";
      options.buttons = [{
        id: "save-troupe-settings",
        text: "Save"
      }, {
        id: "cancel-troupe-settings",
        text: "Cancel"
      }];
      options.confirmationView = new View({});
      options.confirmationView.dialog = this;
      TroupeViews.ConfirmationModal.prototype.initialize.apply(this, arguments);
    }
  });
});