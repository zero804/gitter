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

  /* Use the compact views */
  var compactView = window.navigator.userAgent.indexOf("Mobile/") !== -1;

  TroupeViews.Base = Backbone.View.extend({
    template: null,
    autoClose: true,
    compactView: compactView,

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
      if(data) {
        data.compactView = compactView;
      }

      var dom = this.renderInternal(data);
      if(this.model) {
        var id = this.model.get('id');
        if(!id) id = this.model.cid;
        var e = this.$el;

        e.addClass('model-id-' + id);
        if(this.model.get('unread')) {
          e.addClass('unread');
          e.data('itemId', id);
          if(this.unreadItemType) {
            e.data('itemType', this.unreadItemType);
            console.log("itemType", this.unreadItemType);
          }
        }
      }

      if(this.afterRender) { this.afterRender(data); }

      this.$el.addClass("view");

      // Bit dodgy this next line as it could cause IE circular ref problems
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
        menuItems: [],
        disableClose: false
      };
      _.bindAll(this, 'hide', 'onMenuItemClicked');
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

    onMenuItemClicked: function(id) {
      console.log("Menu Item ", id);
      this.view.trigger('menuItemClicked', id);
    },

    afterRender: function() {
      var self = this;
      this.$el.hide();

      var modalBody = this.$el.find('.modal-body');
      modalBody.append(this.view.render().el);
      this.$el.find('.close').on('click', this.hide);

      /* Render menu items */
      if(this.options.menuItems) {
        var menuItems = this.$el.find(".frame-menu-items");
        var all = [];
        _.each(this.options.menuItems, function(item) {
          var menuItem = $(self.make("a", {"href": "#" }));
          menuItem.text(item.text);
          all.push(menuItem);

          menuItem.on('click', function(e) {
            e.preventDefault();
            self.onMenuItemClicked(item.id);
          });

          menuItems.append(menuItem);

          self.addCleanup(function() {
            _.each(all, function(i) { i.off(); });
          });
        });
      }
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
            that.trigger('shown');
           });
        } else {
          that.$el.trigger('shown');
          that.trigger('shown');
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
      $('body, html').on('click', this.hideMenu);
      $('.trpMenuIcon, .trpNotifyBadge').on('click', this.hideMenu);
      this.triggerEl = $(options.triggerEl);
      this.triggerEl.on('click', this.toggleMenu);
    },

    onClose: function() {
      this.triggerEl.off();
    },

    toggleMenu: function(){
      if (this.$el.is(':hidden')) {
        this.showMenu();
        return false;
      } else {
        this.hideMenu();
      }
    },

    showMenu: function() {
      $(this.triggerEl).css('background-color', 'white');
      this.$el.slideDown('fast', function() {
          // Animation complete.
          $('body').on('click', this.hideMenu);
      });
    },

    hideMenu: function() {
      $(this.triggerEl).css('background-color', 'transparent');
      $('body').off('click', this.hideMenu);
      this.$el.slideUp('fast', function() {
          // Animation complete.
      });
    }
  });

  // Used for switching from a single param comparator to a double param comparator
  function sortByComparator(sortByFunction) {
    return function(left, right) {
      var l = sortByFunction(left);
      var r = sortByFunction(right);

      if (l === void 0) return 1;
      if (r === void 0) return -1;

      return l < r ? -1 : l > r ? 1 : 0;
    };
  }

  function reverseComparatorFunction(comparatorFunction) {
    return function(left, right) {
      return -1 * comparatorFunction(left, right);
    };
  }

  /* This should go somewhere better */
  TroupeViews.sortByComparator = sortByComparator;
  TroupeViews.reverseComparatorFunction = reverseComparatorFunction;

  TroupeViews.Collection = TroupeViews.Base.extend({

    constructor: function(options) {
      var self = this;
      TroupeViews.Base.prototype.constructor.apply(this, arguments);
      if(!options) options = {};

      if(options.itemView) {
        this.itemView = options.itemView;
      }
      this.itemViewOptions = options.itemViewOptions ? options.itemViewOptions : {};
      this.sortMethods = options.sortMethods ? options.sortMethods : {};

      if (this.options.defaultSort) {
        this.sortBy(this.options.defaultSort);
      }

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
      this.collection.each(function(item, index) {
        var options = _.extend(self.itemViewOptions, { model: item, index: index });
        self.$el.append(new self.itemView(options).render().el);
      });
    },

    events: {
    },

    sortMethods: {

    },

    sortBy: function(field) {
      var reverse = false;

      // Sort by the same field twice switches the direction
      if(field === this.currentSortByField) {
        if(field.indexOf("-") === 0) {
          field = field.substring(1);
        } else {
          field = "-" + field;
        }
      }

      var fieldLookup;
      if(field.indexOf("-") === 0) {
        fieldLookup = field.substring(1);
        reverse = true;
      } else {
        fieldLookup = field;
      }

      var sortByMethod = this.sortMethods[fieldLookup];
      if(!sortByMethod) return;

      this.currentSortByField = field;

      var comparator = sortByComparator(sortByMethod);
      if(reverse) {
        comparator = reverseComparatorFunction(comparator);
      }

      this.collection.comparator = comparator;
      this.collection.sort();
    },

    checkForNoItems: function() {
      if(this.options.noItemsElement) {
        if(this.collection.length === 0) {
            $(this.options.noItemsElement).show();
          }
        else {
            $(this.options.noItemsElement).hide();
        }
      }
    },

    onCollectionReset: function() {
      var el = this.$el;
      var self = this;
      el.empty();
      this.removeSubViews(el);
      this.collection.each(function(item, index) {
        var options = _.extend(self.itemViewOptions, { model: item, index: index });
        el.append(new self.itemView(options).render().el);
      });
      this.checkForNoItems();

      $(document).trigger('collectionReset', { });
    },

    onCollectionAdd: function(model, collection, options) {
      var index = collection.indexOf(model);
      var o = _.extend(this.itemViewOptions, { model: model, index: index });
      var el = new this.itemView(o).render().el;

      if(options.index === 0) {
        this.$el.prepend(el);
      } else if(options.index >= collection.length - 1) {
        this.$el.append(el);
      } else {
        // TODO: correct place in-collection!
        this.$el.append(el);
      }
      this.checkForNoItems();
      $(document).trigger('collectionAdd', { });
    },

    onCollectionRemove: function(item) {
      console.log("onCollectionRemove", item);

      var id = item.get('id');
      if(!id) id= item.cid;

      this.$el.find('.model-id-' + id).each(function(index, item) {
        if(item._view) item._view.remove();
      });
      this.checkForNoItems();
    }

  });

  return TroupeViews;
});
