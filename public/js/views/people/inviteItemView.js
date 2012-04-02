define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/people/invite-item.mustache',
  'views/confirmDialog',

  ], function($, _, Backbone, Mustache, template, ConfirmDialog) {
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
        console.dir(this.model);
        var compiledTemplate = Mustache.render(template, this.model.toJSON());
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
