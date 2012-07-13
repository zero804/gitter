define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!./modal'
], function($, _, Backbone, modalTemplate) {
  /*jshint trailing:false */
  /*global require:true console:true setTimeout:true*/
  "use strict";

  var TroupeViews = {};

  TroupeViews.Base = Backbone.View.extend({
    template: null,
    autoClose: true,

    constructor: function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);
      if(!options) options = {};
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

  TroupeViews.Modal =   TroupeViews.Base.extend({
    template: modalTemplate,

    initialize: function(options) {
      this.view = options.view;
    },

    getRenderData: function() {
      return {
        title: "Modal"
      };
    },

    afterRender: function() {
      // attach the view here
      var modalBody = this.$el.find('.modal-body');
      modalBody.replaceWith(this.view.render().el);
    },

    show: function() {
      var that = this;
      if (this.isShown) return;

      this.render();
      this.$el.hide();

      $('body').addClass('modal-open');

      this.isShown = true;
      this.$el.trigger('show');

      this.escape();
      this.backdrop(function () {
        var transition = $.support.transition && that.$el.hasClass('fade');

        if(!that.$el.parent().length) {
          that.$el.appendTo(document.body); //don't move modals dom position
        }

        that.$el.show();

        if (transition) {
          that.$el[0].offsetWidth; // force reflow
        }

        that.$el.addClass('in');

        if(transition) {
          that.$el.one($.support.transition.end, function () { 
            that.$el.trigger('shown');
           });
        } else {
          that.$el.trigger('shown');
        }
      });
    },

    /* Modal private methods */
    hideWithTransition: function() {
      var that = this;
      var timeout = setTimeout(function () {
            that.$el.off($.support.transition.end);
            that.hideModal(that);
          }, 500);

      this.$el.one($.support.transition.end, function() {
        clearTimeout(timeout);
        that.hideModal(that);
      });
    },

    hideModal: function () {
      this.$el
        .hide()
        .trigger('hidden');

      this.backdrop(this);
    },

    backdrop: function( callback ) {
      var that = this;
      var animate = this.$el.hasClass('fade') ? 'fade' : '';

      if (this.isShown && this.options.backdrop) {
        var doAnimate = $.support.transition && animate;

        this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
          .appendTo(document.body);

        if (this.options.backdrop != 'static') {
          this.$backdrop.click($.proxy(this.hide, this));
        }

        if (doAnimate) { this.$backdrop[0].offsetWidth; } // force reflow

        this.$backdrop.addClass('in');

        if(doAnimate) {
          this.$backdrop.one($.support.transition.end, callback);
        } else {
          callback();
        }

      } else if (!this.isShown && this.$backdrop) {
        this.$backdrop.removeClass('in');

        if($.support.transition && this.$el.hasClass('fade')) {
          this.$backdrop.one($.support.transition.end, $.proxy(removeBackdrop, this));
        } else {
          this.removeBackdrop(this);
        }

      } else if (callback) {
        callback();
      }
    },

    removeBackdrop: function() {
      this.$backdrop.remove();
      this.$backdrop = null;
    },

    escape: function () {
      var that = this;
      if (this.isShown && this.options.keyboard) {
        $(document).on('keyup.dismiss.modal', function ( e ) {
          if(e.which == 27) that.hide();
        });
      } else if (!this.isShown) {
        $(document).off('keyup.dismiss.modal');
      }
    }
  });



  return TroupeViews;
});
