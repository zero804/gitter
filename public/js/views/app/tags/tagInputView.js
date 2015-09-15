'use strict';

var Marionette = require('backbone.marionette');
var TagModel   = require('../../../collections/tag-collection.js').TagModel;

var tagInputTemplate = require('./tmpl/tagInputTemplate.hbs');

var ENTER_KEY_CODE     = 13;
var BACKSPACE_KEY_CODE = 8;
var DELETE_KEY_CODE    = 46;

var TagInputView = Marionette.ItemView.extend({

  template: tagInputTemplate,

  events: {
    'submit': 'onTagSubmit',
    'input': 'onTagInput',
    'keyup': 'onKeyPressed',
  },

  initialize: function() {
    this.model = new TagModel();
    this.bindToModel();
  },

  bindToModel: function() {
    this.stopListening(this.model);
    this.listenTo(this.model, 'invalid', this.onModelInvalid);
    this.listenTo(this.model, 'change', this.onModelChange);
  },

  onTagSubmit: function(e) {
    if (e) e.preventDefault();

    //TODO --> what happens if the model is invalid??
    //jp 3/9/15

    if (this.model.isValid()) {
      this.collection.addModel(this.model);
      this.model = new TagModel();
      this.bindToModel();
      this.$el.find('input').val('');
      this.triggerMethod('tag:added');
    }
  },

  onTagInput: function(e) {
    if (e) e.preventDefault();

    //guard against manual invocation of this function
    var val =  e ? e.target.value : this.$el.find('input').val();
    this.model.set('value', val, {validate: true});
    if (val.length === 0) {
      this.triggerMethod('tag:warning:empty');
    }
  },

  onKeyPressed: function(e) {
    switch (e.keyCode) {

      //submit tag by pressing enter
      case ENTER_KEY_CODE :

        //manually trigger tag submission
        this.onTagInput();
        this.onTagSubmit();
        break;

      //if a user presses (meta+backspace)/delete
      //and the input is empty
      //remove the last tag
      case DELETE_KEY_CODE :
        this.removeLastTag();
        break;

      case BACKSPACE_KEY_CODE :
        if (e.metaKey || e.ctrlKey) {
          this.removeLastTag();
        }

        break;
    }
  },

  removeLastTag: function() {
    var val =  this.$el.find('input').val();
    if (val === '') this.collection.pop();
    this.triggerMethod('tag:removed');
  },

  onModelChange: function(model) {
    this.$el.find('input').removeClass('invalid');
    this.triggerMethod('tag:valid', model.get('value'));
  },

  onModelInvalid: function() {
    this.$el.find('input').addClass('invalid');

    //if the tag is empty we want to show a message not error
    this.triggerMethod('tag:error');
  },

  focus: function() {
    this.$el.find('input').focus();
  },

});

module.exports = TagInputView;
