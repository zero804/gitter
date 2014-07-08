/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'hbs!./tmpl/limitBannerTemplate'
  ], function($, Backbone, context, template)  {
  "use strict";

  var TopBannerView = Backbone.View.extend({
    events: {
      'click button.main': 'onMainButtonClick'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.collection, 'limitReached', this.showBanner);
    },
    render: function() {
      //this.showBanner();
      return this;
    },
    showBanner: function() {
      var $banner = this.$el;
      var message = 'You have more messages in your history. Upgrade your plan to see them';

      $banner.html(template({message: message}));
      $banner.parent().show();

      // cant have slide away animation on the same render as a display:none change
      setTimeout(function() {
        $banner.removeClass('slide-away');
      }, 0);
    },
    hideBanner: function() {
      var $banner = this.$el;
      var self = this;

      $banner.addClass('slide-away');

      setTimeout(function() {
        if(self.getUnreadCount() === 0) {
          $banner.parent().hide();
        }
      }, 500);
    },
    onMainButtonClick: function() {
      window.open(context.env('billingUrl') + '/bill/' + context.troupe().get('uri'));
    }
  });


  return {
    Top: TopBannerView,
  };

});
