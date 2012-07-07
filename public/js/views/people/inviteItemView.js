define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/people/invite-item',
  'views/confirmDialog'
  ], function($, _, Backbone, template, ConfirmDialog) {
    var InviteItemView = Backbone.View.extend({

      tagName:  "tr",

      events: {
        "click a.destroy" : "destroy"
      },

      initialize: function() {
        this.model.bind('change', this.render, this);
        this.model.bind('destroy', this.remove, this);
      },

      render: function() {
        var compiledTemplate = template(this.model.toJSON());
        this.$el.html(compiledTemplate);

        return this;
      },

      destroy: function() {
        var self = this;
        var c = new ConfirmDialog({
          title: "Are you sure?",
          message: "Are you sure you want to remove user....",
          onButtonPress: function(button) {
            if(button == "yes") {
              self.model.destroy();
            }
          }
        });
        c.show();
      }

    });

  return InviteItemView;
});
