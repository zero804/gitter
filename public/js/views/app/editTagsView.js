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

require('views/behaviors/isomorphic');


//TODO --> Break the bigger components into their own files
//jp 3/9/15
var TagInputView = Marionette.ItemView.extend({

  template: tagInputTemplate,

  //TODO figure out why submit event does not fire
  //but a click event does, event for keypress... odd
  events: {
    'click': 'onTagSubmit',
    'input': 'onTagInput'
  },

  initialize: function(){
    this.model = new TagModel();
    this.listenTo(this.model, 'invalid', this.onModelInvalid);
    this.listenTo(this.model, 'change', this.onModelChange);
  },

  onTagSubmit: function(e){
    e.preventDefault();
    if(this.model.isValid()){
      this.collection.add(this.model);
      this.model = new TagModel();
      this.$el.find('input').val('');
    }
  },

  onTagInput: function(e){
    e.preventDefault();
    this.model.set('value', e.target.value, {validate: true});
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


var View = Marionette.LayoutView.extend({
  template: editTagsTemplate,

  behaviors: {
    Isomorphic: {
      tagList:  { el: '#tag-list', init: 'initTagList' },
      tagInput: { el: '#tag-input', init: 'initTagListEdit' }
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

  save: function(e) {
    if(e) e.preventDefault();
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
