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

    childEvents: {
      'selected': function () {
        window.alert('CLICKED');
      }
    },

    initialize: function() {
      this.bindUIElements();

      this.changeDebounce = multiDebounce({ }, function() {
        var text = this.ui.input.val();
        this.collection.fetchSearch(text);
      }, this);

    }

  });

  return View;
});
