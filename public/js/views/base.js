define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!./modal'
], function($, _, Backbone, modalTemplate) {
  /*jshint trailing:false */
  /*global require:true console:true setTimeout:true*/
  "use strict";

  /* From http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
  Backbone.View.prototype.close = function () {
    console.log('Closing view ' + this);
    if (this.beforeClose) {
      this.beforeClose();
    }
    this.remove();
    this.unbind();
  };

  var TroupeViews = {};

  TroupeViews.Base = Backbone.View.extend({
    template: null,
    autoClose: true,

    constructor: function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);
      if(!options) options = {};
      if(options.template) this.template = options.template;
    },

    addCleanup: function(callback) {
      var self = this;
      function t() {
        self.off('cleanup', t);
        callback();
      }
      self.on('cleanup', t);
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

    renderInternal: function(data) {
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
      this.$el.html(dom);
      return dom;
    },

    render: function() {
      var data = this.getRenderData();

      var dom = this.renderInternal(data);
      if(this.model) {
        var id = this.model.get('id');
        this.$el.addClass('model-id-' + id);
      }

      if(this.afterRender) { this.afterRender(data); }

      this.$el.addClass("view");
      this.el._view = this;
      return this;
    },

    removeSubViews: function($el) {
      $el.find('.view').each(function(index, viewElement) {
        if(viewElement._view) {
          viewElement._view.close();
          viewElement._view = null;
        }
      });
    },

    close: function () {
      this.trigger('cleanup');
      if (this.beforeClose) {
        this.beforeClose();
      }

      this.remove();
      this.removeSubViews(this.$el);

      if (this.onClose) { this.onClose(); }
      this.trigger('close');
      this.off();
      this.el._view = null;
    }
  });

  TroupeViews.Modal =   TroupeViews.Base.extend({
    template: modalTemplate,
    className: "modal",
    initialize: function(options) {
      this.options = {
        keyboard: true,
        backdrop: true,
        fade: true,
        autoRemove: true,
        disableClose: false
      };
      _.bindAll(this, 'hide');
      _.extend(this.options, options);
      this.view = this.options.view;
      this.view.dialog = this;
    },

    getRenderData: function() {
      return {
        title: "Modal",
        disableClose: this.options.disableClose 
      };
    },

    afterRender: function() {
      this.$el.hide();

      var modalBody = this.$el.find('.modal-body');
      modalBody.append(this.view.render().el);
      this.$el.find('.close').on('click', this.hide);
    },

    onClose: function() {
      this.view.dialog = null;
      this.$el.find('.close').off('click');
    },

    prepare: function() {
      if(!this.rendered) {
        this.render();
        this.rendered = true;
      }
    },

    show: function() {
      var that = this;
      if (this.isShown) return;

      this.prepare();

      $('body').addClass('modal-open');

      this.isShown = true;
      this.$el.trigger('show');
      this.trigger('show');

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
            this.trigger('shown');
           });
        } else {
          that.$el.trigger('shown');
          this.trigger('shown');
        }
      });
    },

    hide: function ( e ) {
      if(e) e.preventDefault();

      if (!this.isShown) return;

      var that = this;
      this.isShown = false;

      $('body').removeClass('modal-open');

      this.escape();

      this.$el
        .trigger('hide')
        .removeClass('in');
      
      this.trigger('hide');
      
      if($.support.transition && this.options.fade) {
        this.hideWithTransition(this);
      } else {
        this.hideModal();
      }
    },

    transitionTo: function(newDialog) {
      newDialog.options.backdrop = false;
      var backdrop = this.$backdrop;
      this.$backdrop = null;
      this.hide();
      backdrop.modal = newDialog;
      newDialog.show();
      newDialog.$backdrop = backdrop;

    },

    /* Modal private methods */
    hideWithTransition: function() {
      var that = this;
      var timeout = setTimeout(function () {
            that.$el.off($.support.transition.end);
            that.hideModal();
          }, 500);

      this.$el.one($.support.transition.end, function() {
        clearTimeout(timeout);
        that.hideModal();
      });
    },

    hideModal: function () {
      this.$el
        .hide()
        .trigger('hidden');

      this.trigger('hidden');
      this.backdrop();

      if(this.options.autoRemove) {
        this.close();
      }
    },

    backdrop: function( callback ) {
      var that = this;
      var animate = this.options.fade ? 'fade' : '';

      if (this.isShown && this.options.backdrop) {
        var doAnimate = $.support.transition && animate;

        this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
          .appendTo(document.body);

        if (this.options.backdrop != 'static' && !this.options.disableClose) {
          var bd = this.$backdrop;
          this.$backdrop.click(function() {
            bd.modal.hide();
          });
        }
        this.$backdrop.modal = this;

        if (doAnimate) { this.$backdrop[0].offsetWidth; } // force reflow

        this.$backdrop.addClass('in');

        if(doAnimate) {
          this.$backdrop.one($.support.transition.end, callback);
        } else {
          callback();
        }

      } else if (!this.isShown && this.$backdrop) {
        this.$backdrop.removeClass('in');

        if($.support.transition && this.options.fade) {
          this.$backdrop.one($.support.transition.end, $.proxy(this.removeBackdrop, this));
        } else {
          this.removeBackdrop();
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
      if(this.options.disableClose) return;
      var that = this;
      if (this.isShown && this.options.keyboard) {
        $(document).on('keyup', function ( e ) {
          if(e.which == 27) that.hide();
        });
      } else if (!this.isShown) {
        $(document).off('keyup');
      }
    }
  });

  TroupeViews.Menu = Backbone.View.extend({
    initialize: function(options) {
      _.bindAll(this, 'toggleMenu', 'showMenu', 'hideMenu');

      this.triggerEl = $(options.triggerEl);
      this.triggerEl.on('click', this.toggleMenu);
    },

    onClose: function() {
      this.triggerEl.off();
    },

    toggleMenu: function(){
      if (this.$el.is(':hidden')) {
        this.showMenu();
      } else {
        this.hideMenu();
      }
    },

    showMenu: function() {
      this.$el.slideDown('fast', function() {
          // Animation complete.
          $('body').on('click', this.hideMenu);
      });
    },

    hideMenu: function() {
      $('body').off('click', this.hideMenu);
      this.$el.slideUp('fast', function() {
          // Animation complete.
      });
    }
  });

  TroupeViews.Collection = TroupeViews.Base.extend({

    constructor: function(options) {
      var self = this;
      TroupeViews.Base.prototype.constructor.apply(this, arguments);
      if(!options) options = {};

      if(options.itemView) {
        this.itemView = options.itemView;
      }
      this.itemViewOptions = options.itemViewOptions ? options.itemViewOptions : {};

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset', 'onCollectionRemove');
      this.collection.on('add', this.onCollectionAdd);
      this.collection.on('remove', this.onCollectionRemove);
      this.collection.on('reset', this.onCollectionReset);

      this.addCleanup(function() {
        self.collection.off('add', self.onCollectionAdd);
        self.collection.off('remove', self.onCollectionRemove);
        self.collection.off('reset', self.onCollectionReset);
      });
    },

    renderInternal: function() {
      var self = this;
      this.collection.each(function(item) {
        var options = _.extend(this.itemViewOptions, { model: item });
        self.$el.append(new self.itemView(options).render().el);
      });
    },

    events: {
    },

    onCollectionReset: function() {
      this.$el.empty();
      this.removeSubViews(this.$el);
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
      var options = _.extend(this.itemViewOptions, { model: item });
      this.$el.append(new this.itemView(options).render().el);
    },

    onCollectionRemove: function(item) {
      this.$el.find('.model-id-' + item.get('id')).each(function(index, item) {
        if(item._view) item._view.remove();
      });
    }

  });

  return TroupeViews;
});
