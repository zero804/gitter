define([
  'require',
  'jquery',
  'underscore',
  'backbone',
  'utils/appevents',
  'marionette',
  'hbs!./tmpl/modal',
  'hbs!./tmpl/loading',
  'hbs!./tmpl/confirmationView',
  'log!base-views',
  'utils/detect-compact',
  '../template/helpers/all' // No ref
], function(require, $, _, Backbone, appEvents, Marionette, modalTemplate,
  loadingTemplate, confirmationViewTemplate, log, detectCompact) {
  "use strict";

  /* From http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
  Backbone.View.prototype.close = function () {
    if (this.beforeClose) {
      this.beforeClose();
    }
    this.remove();
    this.stopListening();
    this.unbind();
  };

  var TroupeViews = {};

  /* Use the compact views */
  var compactView = window._troupeCompactView = detectCompact();

  // Need to do some testing on Android tablets to get this more accurate
  var isIE9 = window.navigator.userAgent.indexOf("MSIE 9.0") !== -1;
  var userAgentTabletFragment = navigator.userAgent.match(/(iPad)/);

  if (compactView) {
    $('body').addClass('trpCompactView');
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

      if(this.model) {
        if(this.rerenderOnChange) this.setRerenderOnChange();

        // TODO: move this into the
        this.listenTo(this.model, 'syncStatusChange', function(newState) {
          var e = this.$el.find('.view').first();
          if(newState != 'synced')  e.removeClass('synced');
          if(newState != 'syncing')  e.removeClass('syncing');
          if(newState != 'syncerror')  e.removeClass('syncerror');

          if(newState) e.addClass(newState);

        });
      }

      this.addCleanup(function() {
        this.stopListening();
      });
    },

    setRerenderOnChange: function() {
      this.listenTo(this.model, 'change', this.rerender);
    },

    rerender: function() {
      this.removeSubViews(this.$el);
      if (this.$el.tooltip)
        this.$el.tooltip('destroy');
      this.render();
    },

    addCleanup: function(callback) {
      this.once('cleanup', callback.bind(this));
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
      var generatedText = this.template(data);
      var dom = $($.parseHTML(generatedText));
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

      if(this.onDomRender) this.onDomRender(dom);

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
          log('Removing ', viewElement._view);

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
    },

    disableForm: function($form) {
      $form = $form || this.$el.find('form');
      $form.find('button, input[type=submit]').attr('disabled', true);
    },

    enableForm: function($form) {
      $form = $form || this.$el.find('form');
      $form.find('button, input[type=submit]').removeAttr('disabled');
    }

  });

  TroupeViews.Modal =   TroupeViews.Base.extend({
    template: modalTemplate,
    className: "modal",

    events: {
      'click .button': 'onMenuItemClicked'
    },

    initialize: function(options) {
      this.options = {
        keyboard: true,
        backdrop: true,
        fade: true,
        autoRemove: true,
        menuItems: [],
        disableClose: false,
        hideHeader: false,
        title: null,
        navigable: false
      };
      _.bindAll(this, 'hide', 'onMenuItemClicked');
      _.extend(this.options, options);

      this.view = this.options.view || this.view;
    },

    getRenderData: function() {
      var menuItems = this.menuItems || this.options.menuItems;
      return {
        hideHeader: this.options.hideHeader,
        customTitle: !!this.options.title,
        title: this.options.title,
        hasMenuItems: !!menuItems.length,
        menuItems: menuItems,
        disableClose: this.options.disableClose
      };
    },

    onMenuItemClicked: function(e) {
      e.preventDefault();

      var action = $(e.target).attr('data-action');
      this.view.trigger('menuItemClicked', action);
      this.trigger('menuItemClicked', action);
    },

    afterRender: function() {
      var self = this;
      this.$el.hide();

      var modalBody = this.$el.find('.modal-body');
      modalBody.append(this.view.render().el);
      this.$el.find('.close').on('click', this.hide);

      if(!compactView && !this.disableAutoFocus) {
        window.setTimeout(function() {
          try {
            var v = self.$el.find('input[type=text], input[type=url], input[type=tel], input[type=number], input[type=color], input[type=email]')[0];
            if(v) {
              v.focus();
              v.select();
            }
          } catch(e) {
          }
        }, 100);

      }
    },

    setButtonState: function(name,state) {
      var $s = this.$el.find('.modal-footer button[data-action=' + name + ']');
      if(state) {
        $s.removeAttr('disabled');
      } else {
        $s.attr('disabled', true);
      }
    },

    onClose: function() {
      this.view.close();
      this.view.dialog = null;
      this.$el.find('.close').off('click');
    },

    prepare: function() {
      if(!this.rendered) {
        this.render();
        this.rendered = true;
      }
    },

    setTitle: function(title) {
      this.options.title = title;
      // cant seem to call render() twice...
      this.$el.find('.trpModalTitleHeader').text(title);
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
          o++;
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
        window.location = '#';
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

        if (doAnimate) { var x = this.$backdrop[0].offsetWidth; x++; } // force reflow

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
        $(document).on('keydown', keydown);
      } else if (!this.isShown) {
        $(document).off('keydown', keydown);
      }

      function keydown( e ) {
        if(e.which == 27) that.hide();
      }

    }
  });

  TroupeViews.Modal.wrapView = function(View, customisations) {
    var Modal = TroupeViews.Modal.extend(customisations);

    Modal.prototype.initialize = function(options) {
      options = options || {};
      // todo let the caller to wrapView specify their own initialize which is called instead of below
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View(options);
    };

    return Modal;
  };

  /* This is a mixin for Marionette.CollectionView */
  TroupeViews.SortableMarionetteView = {
    initialize: function() {
      this.listenTo(this, 'before:render', this.onBeforeRenderSort);
      this.listenTo(this, 'render', this.onRenderSort);
    },

    onBeforeRenderSort: function() {
      this.isRendering = true;

      // set footerElement before rendering, used by appendHtml()
      if(this.footer) {
        this.footerElement = this.$el.find(this.footer)[0];
      } else {
        this.footerElement = null;
      }
    },

    onRenderSort: function() {
      delete this.isRendering;
    },

    appendHtml: function(collectionView, itemView, index) {
      var footerElement = this.footerElement;
      var el = collectionView.itemViewContainer || collectionView.el;
      var $el = collectionView.itemViewContainer ? $(collectionView.itemViewContainer) : collectionView.$el;

      // Shortcut - just place at the end!
      if (this.isRendering) {
        // if this is during rendering, then the views always come in sort order,
        // so just append
        if(footerElement) {
          itemView.$el.insertBefore(footerElement);
        } else {
          $el.append(itemView.el);
        }
        return;
      }

      // we are inserting views after rendering, find the adjacent view if there
      // is one already
      var adjView;

      if (index === 0) {
        // find the view that comes after the first one (sometimes there will be a
        // non view that is the first child so we can't prepend)
        adjView = findViewAfter(0);

        if (adjView) {
          itemView.$el.insertBefore(adjView.el);
        } else {
          // there are no existing views after the first,
          // we append (keeping the place of non-view children already present in the
          // container)
          if(footerElement) {
            itemView.$el.insertBefore(footerElement);
          } else {
            itemView.$el.appendTo(el);
          }
        }

        return;
      }

      if(index == collectionView.collection.length - 1) {
        if(footerElement) {
          itemView.$el.insertBefore(footerElement);
        } else {
          itemView.$el.appendTo(el);
        }
        return;
      }

      // find the view that comes before this one
      adjView = findViewAtPos(index - 1);
      if(adjView) {
        itemView.$el.insertAfter(adjView.$el);
      } else {
        // It could be the case that n-1 has not yet been inserted,
        // so we try find whatever is at n+1 and insert before
        adjView = findViewAfter(index);

        if(adjView) {
          itemView.$el.insertBefore(adjView.el);
        } else {
          log("Inserting *after* the bottom for collection ", collectionView.collection.url, adjView, itemView);
          /* in this case, the itemViews are not coming in any sequential order  */
          // We can't find an item before, we can't find an item after,
          // just give up and insert at the end. (hopefully this will never happen eh?)
          //
          if(footerElement) {
            itemView.$el.insertBefore(footerElement);
          } else {
            itemView.$el.appendTo(el);
          }
        }
      }

      function findViewAfter(i) {
        var nearestI = 1;
        var adjView = findViewAtPos(i + 1);

        // find the nearest view that comes after this view
        while (!adjView && ((i + nearestI + 1) < collectionView.collection.length)) {
          nearestI += 1;
          adjView = findViewAtPos(i + nearestI);
        }

        return adjView;
      }

      function findViewAtPos(i) {
        if (i >= collectionView.collection.length)
          return;

        var view = collectionView.children.findByModel(collectionView.collection.at(i));
        return view;
      }
    }
  };

  TroupeViews.LoadingView =  TroupeViews.Base.extend({
    template: loadingTemplate
  });

  // Mixin for Marionette.CollectionView classes
  TroupeViews.LoadingCollectionMixin = {
    loadingView: TroupeViews.LoadingView,
    initialize: function() {
      this.showEmptyView = this.showLoadingView;
    },
    showLoadingView: function() {
      if(this.collection.loading) {
        var LoadingView = Marionette.getOption(this, "loadingView");

        if(!this.loadingModel) {
          this.loadingModel = new Backbone.Model();
        }

        var v = this.children.findByModel(this.loadingModel);

        if (LoadingView && !v) {
          this.addItemView(this.loadingModel, LoadingView, 0);
          this.listenToOnce(this.collection, 'loaded', function() {
            this.removeItemView(this.loadingModel);

            if(this.collection.length === 0) {
              this.constructor.prototype.showEmptyView.call(this);
              return true;
            }
          });
        }
        return true;
      }

      this.constructor.prototype.showEmptyView.call(this);
      return true;
    }
  };

  TroupeViews.DelayedShowLayoutMixin = {

    show: function(regionName, view) {
      var c = view.collection, self = this;
      if (c.hasLoaded && !c.hasLoaded()) {
        // delay showing the view until the collection is loaded.
        c.once('sync reset', function() {
          self[regionName].show(view);
        });

        return;
      }

      self[regionName].show(view);
    }

  };

  TroupeViews.ConfirmationView = TroupeViews.Base.extend({
    template: confirmationViewTemplate,

    initialize: function(options) {
      if(options.body) this.body = options.body;
      if(options.confirmationView) this.confirmationView = options.confirmationView;
    },

    getRenderData: function() {
      return {
        body: this.body
      };
    },

    afterRender: function() {
      if(this.confirmationView) {
        this.$el.find('#confirmation').append(this.confirmationView.render().el);
      }
    }
  });


  TroupeViews.confirm = function (message, handlers) {
    var events = handlers || {};

    events['click #cancel'] = events['click #cancel'] || function() {
      modal.hide();
    };

    var modal = new TroupeViews.Modal({
      view: new TroupeViews.ConfirmationView({
        body: message,
        buttons: [ { id: 'ok', text: 'OK'} , { id: 'cancel', text: 'Cancel' } ],
        events: events
      })
    });

    modal.show();
  };

   TroupeViews.ConfirmationModal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options.view = new TroupeViews.ConfirmationView(options);
      TroupeViews.Modal.prototype.initialize.call(this, options);
    }

   });

  // appEvents.once('firstCollectionLoaded', function hideLoadingAmusement() {
  //   var h = $('html'), b = $('.trpContentPanel');
  //   b.fadeOut({ complete: function() {
  //     h.removeClass('loading');
  //   }});
  //   b.fadeIn({ duration: 'fast' });
  // });

  return TroupeViews;
});
