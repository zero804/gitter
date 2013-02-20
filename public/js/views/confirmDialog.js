/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/confirm-dialog'
], function($, _, Backbone, template) {
  var ConfirmDialog = Backbone.View.extend({
    tagName: "div",
    className: "modal hide fade",

    events: {
      "click .button":     "onButtonPress"
    },

    initialize: function(options) {
      this.options = options;
    },

    show: function() {
      var r = this.render();
      var el = r.el;

      $('body').append(el);

      var self = this;
      this.$el.on('hidden', function () {
        self.remove();
      });

      this.$el.modal('show');
    },

    onButtonPress: function(e) {
      var value = $(e.target).data("value");
      if(this.options.onButtonPress) {
        this.options.onButtonPress(value);
      }
      this.$el.modal('hide');
      return false;
    },

    render: function() {
      var compiledTemplate = template({
        title: this.options.title,
        message: this.options.message
      });
      $(this.el).html(compiledTemplate);

      return this;
    }

  });

  return ConfirmDialog;
});
