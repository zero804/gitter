"use strict";
var _ = require('underscore');
var Marionette = require('marionette');
var template = require('./tmpl/chatSearchInputView.hbs');
var multiDebounce = require('utils/multi-debounce');

module.exports = (function() {


  var InputView = Marionette.ItemView.extend({
    template: template,
    ui: {
      input: "textarea"
    },

    events: {
      'cut @ui.input': 'changeDebounce',
      'paste @ui.input': 'changeDebounce',
      'change @ui.input': 'changeDebounce',
      'input @ui.input': 'changeDebounce'
    },

    initialize: function(options) {
      this.rollers = options.rollers;
      this.changeDebounce = multiDebounce({ }, function() {
        var text = this.ui.input.val();
        this.trigger('search.changed', text);
        this.collection.fetchSearch(text);
      }, this);
    }
  });

  // cocktail.mixin(ChatInputView, KeyboardEventsMixin);

  return { InputView: InputView };

})();

