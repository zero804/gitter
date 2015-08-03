"use strict";

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var ModalView = require('views/modal');
var TagCollection = require('../../collections/tag-collection').TagCollection;
var TagModel = require('../../collections/tag-collection').TagModel;

var editTagsTemplate = require('./tmpl/editTagsTemplate.hbs');
var tagTemplate = require('./tmpl/tagTemplate.hbs');
var tagInputTemplate = require('./tmpl/tagEditTemplate.hbs');
var tagErrorTemplate = require('./tmpl/tagErrorTemplate.hbs');

require('views/behaviors/isomorphic');


var ENTER_KEY_CODE = 13;
var BACKSPACE_KEY_CODE = 8;
var DELETE_KEY_CODE = 46;


//TODO --> Break the bigger components into their own files
//jp 3/9/15
var TagInputView = Marionette.ItemView.extend({

  template: tagInputTemplate,

  events: {
    'submit': 'onTagSubmit',
    'input': 'onTagInput',
    'keypress': 'onKeyPressed'
  },

  initialize: function(){
    this.model = new TagModel();
    this.listenTo(this.model, 'invalid', this.onModelInvalid);
    this.listenTo(this.model, 'change', this.onModelChange);
  },

  onTagSubmit: function(e){
    if(e) e.preventDefault();
    //TODO --> what happens if the model is invalid??
    //jp 3/9/15
    if(this.model.isValid()){
      this.collection.addModel(this.model);
      this.model = new TagModel();
      this.$el.find('input').val('');
    }
  },

  onTagInput: function(e){
    if(e) e.preventDefault();
    //guard against manual invocation of this function
    var val =  e ? e.target.value : this.$el.find('input').val();
    this.model.set('value', val, {validate: true});
  },

  onKeyPressed: function(e){
    switch(e.keyCode) {

      //submit tag by pressing enter
      case ENTER_KEY_CODE :
        //manually trigger tag submission
        this.onTagInput();
        this.onTagSubmit();
        break;

      //if a user presses backspace/delete
      //and the input is empty
      //remove the last tag
      case BACKSPACE_KEY_CODE :
      case DELETE_KEY_CODE :
        var val =  this.$el.find('input').val();
        if(val === '') this.collection.pop();
        break;
    }
  },

  onModelChange: function(){
    this.$el.find('input').removeClass('invalid');
  },

  onModelInvalid: function(){
    this.$el.find('input').addClass('invalid');
  }

});

var TagView = Marionette.ItemView.extend({
  template: tagTemplate,
  events: {
    'click': 'onTagClicked'
  },
  onTagClicked: function(){
    this.triggerMethod('remove:tag', this.model);
  }
});

var TagListView = Marionette.CollectionView.extend({
  childView: TagView,
  childEvents: {
    'remove:tag': 'onRemoveTag'
  },
  onRemoveTag: function(view, model){
    this.collection.remove(model);
  }
});

var TagErrorView = Marionette.ItemView.extend({

  template: tagErrorTemplate,

  model: new Backbone.Model({tag: ''}),

  initialize: function(){
    this.hide();
    this.listenTo(this.collection, 'tag:error:duplicate', this.show);
    this.listenTo(this.collection, 'tag:added', this.hide);
    this.listenTo(this.model, 'change', this.render);
  },

  hide: function(){
    this.$el.hide();
  },

  show: function(tag){
    this.model.set({'tag': tag });
    this.$el.show();
  },

  onRender: function(){
    console.log('render');
  }

});

var View = Marionette.LayoutView.extend({
  template: editTagsTemplate,

  behaviors: {
    Isomorphic: {
      tagList:  { el: '#tag-list',  init: 'initTagList' },
      tagInput: { el: '#tag-input', init: 'initTagListEdit' },
      tagError: { el: '#tag-error', init: 'initTagError'}
    }
  },

  initialize: function() {
    this.model = new Backbone.Model({
      tagCollection: new TagCollection()
    });

    //get existing tags
    ////TODO need to add error states to the below request
    apiClient.get('/v1/rooms/' + this.options.roomId)
    .then(function(data){
      this.model.set(data);
      this.model.get('tagCollection').add(data.tags);
    }.bind(this));

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  initTagList: function(optionsForRegion){
    return new TagListView(optionsForRegion({ collection: this.model.get('tagCollection') }));
  },

  initTagListEdit: function(optionsForRegion){
    return new TagInputView(optionsForRegion({ collection: this.model.get('tagCollection') }));
  },

  initTagError: function(optionsForRegion){
    return new TagErrorView(optionsForRegion({ collection: this.model.get('tagCollection') }));
  },

  save: function(e) {
    if(e) e.preventDefault();
    //TODO --> need to add error states here jp 3/9/15
    apiClient.put('/v1/rooms/' + this.options.roomId, { tags: this.model.get('tagCollection').toJSON() })
    .then(function() {
      this.dialog.hide();
    }.bind(this))

  },

  menuItemClicked: function (button) {
    switch (button) {
      case 'save':
        this.save();
        break;
    }
  }

});

var Modal = ModalView.extend({
  initialize: function(options) {
    options.title = "Edit tags";
    ModalView.prototype.initialize.apply(this, arguments);
    this.view = new View({roomId: options.roomId });
  },
  menuItems: [
    { action: "save", text: "Save", className: "trpBtnGreen"}
  ]
});

module.exports = Modal;
