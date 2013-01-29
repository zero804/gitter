/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!./tmpl/modal',
  '../template/helpers/all',
  'hbs!./tmpl/confirmationView'
], function($, _, Backbone, modalTemplate, helpers, confirmationViewTemplate) {
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

  /* This value is used by the dialogFragment Handlebars helper */
  window._troupeCompactView = compactView;

  var cachedWidgets = {};

  TroupeViews.Base = Backbone.View.extend({
    template: null,
    autoClose: true,
    compactView: compactView,

    constructor: function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);
      if(!options) options = {};
      if(options.template) this.template = options.template;
    },

    setRerenderOnChange: function() {
      var self = this;
      this.model.on('change', this.rerenderOnChange, this);

      this.addCleanup(function() {
        self.model.off('change', self.rerenderOnChange, this);
      });
    },

    rerenderOnChange: function() {
      this.removeSubViews(this.$el);
      this.render();
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
      function replaceElementWithWidget(element, Widget, options) {
          var widget = new Widget(options.model);
          widget.render();
          $(element).replaceWith(widget.el);
      }


      var dom = $(this.template(data));
      dom.addClass("view");

      if(data.renderViews) {
        dom.find('view').each(function () {
          var id = this.getAttribute('data-id'),
          attrs = data.renderViews[id];
          var self = this;
          var CachedWidget = cachedWidgets[attrs.widgetName];
          if(CachedWidget) {
            replaceElementWithWidget(this, CachedWidget, attrs);
          } else {
            require(['views/widgets/' + attrs.widgetName], function(Widget) {
              cachedWidgets[attrs.widgetName] = Widget;
              replaceElementWithWidget(self, Widget, attrs);
            });
          }
        });
      }

      if(this.model && this.unreadItemType) {
        var id = this.model.get('id');
        if(!id) id = this.model.cid;

        dom.addClass('model-id-' + id);
        if(this.model.get('unread')) {
          dom.addClass('unread');
          dom.data('itemId', id);
          dom.data('itemType', this.unreadItemType);
          $(document).trigger('unreadItemDisplayed');
        }
      }

      this.$el.html(dom);
      return dom;
    },

    render: function() {
      var data = this.getRenderData();
      if(data) {
        data.compactView = compactView;
      }

      console.log("Before RenderInternal");
      this.renderInternal(data);
      if(this.afterRender) { this.afterRender(data); }
      console.log("After Render", this.$el);

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
        disableClose: false,
        title: null,
        navigable: false
      };
      _.bindAll(this, 'hide', 'onMenuItemClicked');
      _.extend(this.options, options);

      this.view = this.options.view;
    },

    getRenderData: function() {
      return {
        customTitle: !!this.options.title,
        title: this.options.title,
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

    supportsModelReplacement: function() {
      return this.view &&
              this.view.supportsModelReplacement &&
              this.view.supportsModelReplacement();
    },

    replaceModel: function(model) {
      return this.view.replaceModel(model);
    },

    show: function() {
      this.view.dialog = this;

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
          var o = that.$el[0].offsetWidth; // force reflow
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
      if(this.navigable) {
        var hash = window.location.hash;
        var currentFragment;
        if(!hash) {
          currentFragment = '#';
        } else {
          currentFragment = hash.split('|', 1)[0];
        }

        window.location = currentFragment;
        return;
      }
      this.hideInternal();
    },

    /* Called after navigation to close an navigable dialog box */
    navigationalHide: function() {
      this.options.fade = false;
      this.hideInternal();
    },

    hideInternal: function() {
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
        console.log("Closing dialog with transition");
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

        if (doAnimate) { var x = this.$backdrop[0].offsetWidth; } // force reflow

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
    },

    onCollectionRemove: function(item) {
      console.log("onCollectionRemove", item);

      var cid = item.cid;
      if(cid) {
        this.$el.find('.model-id-' + cid).each(function(index, item) {
          if(item._view) item._view.remove();
        });
      } else {
        var id = item.id;
        if(id) {
          this.$el.find('.model-id-' + id).each(function(index, item) {
            if(item._view) item._view.remove();
          });
        }

      }
      this.checkForNoItems();
    }

  });

  /* This is a mixin for Marionette.CollectionView */
  TroupeViews.SortableMarionetteView = {

    initializeSorting: function() {
      this.on('before:render', this.onBeforeRenderSort, this);
      this.on('render', this.onRenderSort, this);
    },

    onBeforeRenderSort: function() {
      this.isRendering = true;
    },
    onRenderSort: function() {
      this.isRendering = false;
    },

    appendHtml: function(collectionView, itemView, index) {

      if (this.isRendering || index >= collectionView.collection.length - 1) {
        collectionView.$el.append(itemView.el);
        return;
      }

      if (index === 0) {
        collectionView.$el.prepend(itemView.el);
        return;
      }

      var prevModel = this.collection.at(index - 1);
      var view = collectionView.children.findByModel(prevModel);
      itemView.$el.insertAfter(view.$el);
    }

  };

  TroupeViews.ConfirmationView = TroupeViews.Base.extend({
    template: confirmationViewTemplate,

    initialize: function(options) {
      this.options = options;
    },

    getRenderData: function() {
      return this.options;
    },

    events: {
      "click .button": "buttonClicked"
    },

    buttonClicked: function(e) {
      e.preventDefault();

      var id = $(e.target).attr('id');

      if(this.dialog) {
        this.dialog.trigger('button.click', id);
      }
      this.trigger('button.click', id);
    }
  });

   TroupeViews.ConfirmationModal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options.view = new TroupeViews.ConfirmationView(options);
      TroupeViews.Modal.prototype.initialize.call(this, options);
    }

   });

  return TroupeViews;
});
