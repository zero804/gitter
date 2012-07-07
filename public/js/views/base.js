define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  var TroupeViews = {};

  TroupeViews.Base = Backbone.View.extend({
    template: null,
    autoClose: true,

    constructor: function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);
      if(options.template) this.template = options.template;
    },

    getRenderData: function() {
      if (this.model) {
        return this.model.toJSON();
      }

      if (this.collection) {
        return { items: this.collection.toJSON() };
      }

      return {};
    },

    render: function() {
      var data = this.getRenderData();
      data.view = function() {
        return function(inner) {
          return "<view data-viewId='1'></view>";
        };
      };

      var dom = $(this.template(data));
      $(this.el).html(dom);
      if(this.afterRender) { this.afterRender(dom, data); }

      this.$el.addClass("view");
      this.el._view = this;
      return this;
    },

    close: function () {
      console.log("BASE CLOSE");
      if (this.beforeClose) {
        this.beforeClose();
      }

      this.remove();
      this.$el.find('.view').each(function(index, viewElement) {
        if(viewElement._view) {
          viewElement._view.close();
          viewElement._view = null;
        }
      });

      if (this.onClose) { this.onClose(); }
      this.trigger('close');
      this.off();
    }
  });

  return TroupeViews;
});
