require([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'components/chat/chat-component',
  'components/unread-items-client'
], function($, _, Backbone, TroupeViews, chat, unreadItemsClient) {
  "use strict";

  var AppRouter = Backbone.Router.extend({
    initialize: function() {

      //this.appView = new AppView({ router: this });

      chat.connect();
    },

    routes: {
      // Default
      '*actions': 'showChatView'
    },

    // TODO: FIX This method is fishy!
    resetIcons: function() {
      function removeSelected(selector) {
        var s = $(selector);
        if(s.length === 0) return;
        var src = s.attr("src").replace('-selected.png', ".png");
        s.attr("src", src);
      }
      removeSelected('#chat-icon');
      removeSelected('#file-icon');
      removeSelected('#mail-icon');
      removeSelected('#people-icon');
    },

    navIcon: function(iconId) {
      this.resetIcons();
      //var iconSrc = $(iconId).attr("src").match(/[^\.]+/) + "-selected.png";
      //$(iconId).attr("src", iconSrc);
    },

    /* Taken from http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
    showView: function(selector, view) {
        if (this.currentView)
            this.currentView.close();

        $(selector).html(view.render().el);

        $(window).scrollTop(0);

        this.currentView = view;
        return view;
    },

    showAsync: function(file, params) {
      var self = this;
      require([file],
          function (View) {
            var view = new View({ router: self, params: params });
            self.showView( '#primary-view', view);
          });
    },

    defaultAction: function(actions){
      // this.showView( '#primary-view', new MainHomeView({}) );
      this.showChatView();
    },

    showChatView: function() {
      this.navIcon('#chat-icon');
      this.showAsync('views/chat/chatView');
    }

  });

  var troupeApp = new AppRouter();

  // THESE TWO LINES WILL NOT REMAIN HERE FOREVER
  //$('.dp-tooltip').tooltip();
  //$('.chat-bubble').tooltip();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });

  return troupeApp;
});
