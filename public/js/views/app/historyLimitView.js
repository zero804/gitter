/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'utils/context',
  'hbs!./tmpl/limitBannerTemplate'
  ], function(Backbone, context, template)  {
  "use strict";

  return Backbone.View.extend({
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
      });
    },
    showHide: function() {
      if(this.atLimit && this.nearTop) {
        this.showBanner();
      } else {
        this.hideBanner();
      }
    },
    render: function() {
      return this;
    },
    showBanner: function() {
      if(this.showing) return;
      this.showing = true;
      var $banner = this.$el;
      var message = 'You have more messages in your history. Upgrade your plan to see them';

      $banner.html(template({ message: message }));
      $banner.parent().show();

      // cant have slide away animation on the same render as a display:none change
      setTimeout(function() {
        $banner.removeClass('slide-away');
      }, 0);
    },
    hideBanner: function() {
      if(!this.showing) return;
      this.showing = false;

      var $banner = this.$el;

      $banner.addClass('slide-away');

      setTimeout(function() {
        $banner.parent().hide();
      }, 500);
    },
    onMainButtonClick: function() {
      window.open(context.env('billingUrl') + '/bill/' + context.troupe().get('uri'));
    }
  });


});
