/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!./tmpl/modal',
  '../template/helpers/all',
  'hbs!./tmpl/confirmationView',
  'backbone-keys' // no ref
], function($, _, Backbone, modalTemplate, helpers, confirmationViewTemplate) {
  /*jshint trailing:false */
  /*global require:true console:true setTimeout:true*/
  "use strict";

  /* From http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
  Backbone.View.prototype.close = function () {
    if (this.beforeClose) {
      this.beforeClose();
    }
    this.remove();
    this.unbind();
  };

  var TroupeViews = {};

  /* Use the compact views */
  // var compactView = window.navigator.userAgent.indexOf("Mobile/") !== -1;


  // Need to do some testing on Android tablets to get this more accurate
  var userAgentFragment = navigator.userAgent.match(/(iPhone|iPod|Android|BlackBerry)/);
  var isIE9 = window.navigator.userAgent.indexOf("MSIE 9.0") !== -1;
  var userAgentTabletFragment = navigator.userAgent.match(/(iPad)/);

  /* This value is used by the dialogFragment Handlebars helper */
  if (userAgentFragment) {
    var compactView = true;
    window._troupeCompactView = true;
  }

  window._troupeIsIE9 = isIE9;
  if (userAgentTabletFragment) window._troupeIsTablet = true;

  var cachedWidgets = {};
  TroupeViews.preloadWidgets = function(widgets) {
    var keys = _.keys(widgets);
    _.each(keys, function(key) {
      var value = widgets[key];
      cachedWidgets[key] = value;
    });
  };

  TroupeViews.Base = Backbone.View.extend({
    template: null,
    autoClose: true,
    compactView: compactView,

    constructor: function(options) {
      Backbone.View.prototype.constructor.apply(this, arguments);
      if(!options) options = {};
      if(options.template) this.template = options.template;

      var self = this;

      if(this.model) {
        this.listenTo(this.model, 'syncStatusChange', function(newState) {
          var e = self.$el.find('.view').first();
          if(newState != 'synced')  e.removeClass('synced');
          if(newState != 'syncing')  e.removeClass('syncing');
          if(newState != 'syncerror')  e.removeClass('syncerror');

          if(newState) e.addClass(newState);

        });
      }

      this.addCleanup(function() {
        self.stopListening();
      });
    },

    setRerenderOnChange: function() {
      this.listenTo(this.model, 'change', this.rerenderOnChange);
    },

    rerenderOnChange: function() {
      this.removeSubViews(this.$el);
      if (this.$el.tooltip)
        this.$el.tooltip('destroy');
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
      if (this.data) {
        return this.data;
      }

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

      if(this.model && this.model.syncState) {
        dom.addClass(this.model.syncState);
      }

      this.$el.html(dom);
      return dom;
    },

    render: function() {
      var data = this.getRenderData() || {};
      data.compactView = compactView;
      data.isIE9 = isIE9;
      this.renderInternal(data);
      if(this.afterRender) { this.afterRender(data); }

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
          var menuItem = $(self.make("a", {"href": "#!" }));
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
          currentFragment = '#!';
        } else {
          currentFragment = hash.split('|', 1)[0];
          if (currentFragment == "#") {
            currentFragment = "#!";
          }
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
      //if (typeof console != "undefined") console.log("Inserting new item ", itemView, " at index ", index);

      function findViewAtPos(i) {
        if (i >= collectionView.collection.length)
          return;

        return collectionView.children.findByModel(collectionView.collection.at(i));
      }

      if (this.isRendering) {
        // if this is during rendering, then the views always come in sort order, so just append
        collectionView.$el.append(itemView.el);
      }
      else {
        // we are inserting views after rendering, find the adjacent view if there is one already
        var adjView;

        if (index === 0) {
          // find the view that comes after the first one (sometimes there will be a non view that is the first child so we can't prepend)
          adjView = findViewAtPos(index + 1);
          if (adjView) {
            itemView.$el.insertBefore(adjView.el);
          } else {
            // there are no existing views after the first,
            // we append (keeping the place of non-view children already present in the container)
            itemView.$el.appendTo(collectionView.el);
          }
        } else {
          // find the view that comes before this one
          adjView = findViewAtPos(index - 1);
          if(adjView) {
            itemView.$el.insertAfter(adjView.$el);
          } else {
            // It could be the case that n-1 has not yet been inserted,
            // so we try find whatever is at n+1 and insert before
            adjView = findViewAtPos(index + 1);
            if(adjView) {
              itemView.$el.insertBefore(adjView.el);
            } else {
              // We can't find an item before, we can't find an item after,
              // just give up and insert at the end. (hopefully this will never happen eh?)
              itemView.$el.appendTo(collectionView.el);
            }
          }
        }
      }
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
