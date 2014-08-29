/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  'utils/context',
  'hbs!./tmpl/limitBannerTemplate'
  ], function($, Marionette, context, template)  {
  "use strict";

  return Marionette.ItemView.extend({
    template: template,
    events: {
      'click button.main': 'onMainButtonClick'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;

      this.listenTo(this.chatCollectionView, 'near.top.changed', function(nearTop) {
        this.nearTop = nearTop;
        this.showHide();
      });

      this.listenTo(this.collection, 'limitReached', function(atLimit) {
        this.atLimit = atLimit;
        this.showHide();
      });
    },
    showHide: function() {
      if(this.atLimit && this.nearTop) {
        this.showBanner();
      } else {
        this.hideBanner();
      }
    },
    showBanner: function() {
      if(this.showing) return;
      this.showing = true;
      var $e = this.$el;

      $(document.body).addClass('banner-top');
      $e.parent().show();

      clearTimeout(this.removeTimeout);

      // cant have slide away animation on the same render as a display:none change
      setTimeout(function() {
        $e.removeClass('slide-away');
      }, 0);

    },
    hideBanner: function() {
      if(!this.showing) return;
      this.showing = false;

      var $e = this.$el;

      $e.addClass('slide-away');
      $(document.body).removeClass('banner-top');

      if(this.removeTimeout) return;
      this.removeTimeout = setTimeout(function() {
        $e.parent().hide();
      }, 500);
    },
    onMainButtonClick: function() {
      window.open(context.env('billingUrl') + '/bill/' + context.troupe().get('uri'));
    }
  });


});
