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

      function replaceElementWithWidget(element, options) {
          require(['views/widgets/' + options.widgetName], function(Widget) {
            var widget = new Widget(options.model);
            widget.render();
            $(element).replaceWith(widget.el);
          });
      }


      var dom = $(this.template(data));
      if(data.renderViews) {
        dom.find('view').each(function () {
          var id = this.getAttribute('data-id'),
              attrs = data.renderViews[id];
              replaceElementWithWidget(this, attrs);
      });

      }
      console.log("DOM Generated", data);
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
