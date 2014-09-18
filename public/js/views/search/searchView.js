define([
  'marionette',
  '../chat/chatItemView',
  'hbs!./tmpl/searchView',
  'utils/multi-debounce',
], function(Marionette, ChatItemView, template, multiDebounce) {
  "use strict";

  var View = Marionette.CompositeView.extend({
    itemViewContainer: '#search-results',
    itemView: ChatItemView.ChatItemView,
    template: template,

    ui: {
      input: 'input'
    },

    events: {
      'cut @ui.input': 'changeDebounce',
      'paste @ui.input': 'changeDebounce',
      'change @ui.input': 'changeDebounce',
      'input @ui.input': 'changeDebounce'
    },

    initialize: function(options) {
      this.bindUIElements();

      this.chatView = options.chatView;
      this.chatCollection = options.chatCollection;

      this.changeDebounce = multiDebounce({ }, function() {
        var text = this.ui.input.val();
        this.collection.fetchSearch(text);
      }, this);

    },

    onItemviewSelected: function(childView) {
      var id = childView.model.id;
      var inCollection = !!this.chatCollection.get(id);

      if(inCollection) {
        this.chatView.scrollToChatId(id);
        return;
      }

      this.chatCollection.fetchAtPoint({ aroundId: id }, {}, function() {
        this.chatView.scrollToChatId(id);
      }, this);
    }

  });

  return View;
});
