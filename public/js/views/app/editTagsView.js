"use strict";

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
  template: tagTemplate
});

var TagListView = Marionette.CollectionView.extend({
  childView: TagView
});


var View = Marionette.LayoutView.extend({
  template: editTagsTemplate,

  behaviors: {
    Isomorphic: {
      tagList: { el: '#tag-list', init: 'initTagList' },
      tagInput: { el: '#tag-list-edit', init: 'initTagListEdit' }
    }
  },

  initialize: function() {
    this.model = context.troupe();
    this.tagCollection = new TagCollection([{ value: 'tag1'}, { value: 'tag2'}]);
  },

  initTagList: function(optionsForRegion){
    return new TagListView(optionsForRegion({ collection: this.tagCollection }));
  },

  initTagListEdit: function(optionsForRegion){
    return new TagInputView(optionsForRegion({ collection: this.tagCollection }));
  }

  /*
  save: function(e) {
    if(e) e.preventDefault();

    var tags = this.$el.find("#tags").val();

    apiClient.put('/v1/rooms/' + this.options.roomId, { tags: tags })
    .then(function() {
      this.dialog.hide();
    }.bind(this));


  },

  menuItemClicked: function (button) {
    switch (button) {
      case 'save':
        this.save();
        break;
    }
  }
  */

});

var Modal = ModalView.extend({
  initialize: function(options) {
    options.title = "Edit tags";
    ModalView.prototype.initialize.apply(this, arguments);
    this.view = new View({roomId: options.roomId});
  },
  menuItems: [
    { action: "save", text: "Save", className: "trpBtnGreen"}
  ]
});

module.exports = Modal;
