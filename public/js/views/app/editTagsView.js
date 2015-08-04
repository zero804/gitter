/* jshint node:true  */
"use strict";

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');

var ModalView = require('views/modal');
var TagInputView = require('./tags/tag-input-view.js');
var TagView = require('./tags/tag-view.js');

var TagCollection = require('../../collections/tag-collection').TagCollection;
var TagModel = require('../../collections/tag-collection').TagModel;

var apiClient = require('components/apiClient');

var editTagsTemplate = require('./tmpl/editTagsTemplate.hbs');
var tagErrorTemplate = require('./tmpl/tagErrorTemplate.hbs');

require('views/behaviors/isomorphic');


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
    }.bind(this));

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
