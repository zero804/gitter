define([
  'marionette',
  '../chat/chatItemView',
  'hbs!./tmpl/searchView',
  'utils/multi-debounce',
], function (Marionette, ChatItemView, template, multiDebounce) {
  "use strict";

  var View = Marionette.CompositeView.extend({

    itemViewContainer: '#search-results',

    itemView: ChatItemView.ChatItemView,

    template: template,

    ui: {
      input: '.js-search-input'
    },

    events: {
      'cut @ui.input': 'changeDebounce',
      'paste @ui.input': 'changeDebounce',
      'change @ui.input': 'changeDebounce',
      'input @ui.input': 'changeDebounce'
    },

    initialize: function () {
      this.bindUIElements(); // FIXME this is already called by default?
      this.chatView = this.options.chatView;
      this.chatCollection = this.options.chatCollection;

      this.changeDebounce = multiDebounce({ }, function () {
        var text = this.ui.input.val();
        // search server - text messages
        this.collection.fetchSearch(text);
        // search server - rooms
        // search local - rooms
      }, this);
    },

    onItemviewSelected: function (childView, model) {
      this.chatCollection.fetchAtPoint({ aroundId: model.id }, {}, function() {
        try {
          this.chatView.scrollToChatId(model.id);
        } catch (e) {
          // TODO: do something with error? @suprememoocow
        }
      }, this);
      // window.alert('CLICKED');
    }

  });

  return View;
});
