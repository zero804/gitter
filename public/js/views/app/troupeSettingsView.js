define([
  'views/base',
  'hbs!./troupeSettingsTemplate'
], function(TroupeViews, troupeSettingsTemplate) {

  return TroupeViews.Modal.extend({

    initialize: function(options) {

      var viewOptions = {
        body: troupeSettingsTemplate(window.troupeContext.troupe),
        buttons: [
          {
            id: "save-troupe-settings",
            text: "Save"
          },
          {
            id: "cancel-troupe-settings",
            text: "Cancel"
          }
        ]
      };

      options.title = "Settings for this Troupe";
      options.view = new TroupeViews.ConfirmationView(viewOptions);
      TroupeViews.Modal.prototype.initialize.call(this,options);

      var self = this;
      options.view.on('button.click', function(id) {
        switch(id) {
          case 'save-troupe-settings':
            self.saveSettings();
            break;
          case 'cancel-troupe-settings':
            self.hide();
            break;
        }
      });
    },

    saveSettings: function() {
      var troupeName = this.$el.find('input[name=name]').val(), self = this;
      window.troupeContext.troupe.name = troupeName;
      $.ajax({
        url: '/troupes/' + window.troupeContext.troupe.id,
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ name: troupeName }),
        success: function() {
          self.hide();
        }
      });
    }
  });

});