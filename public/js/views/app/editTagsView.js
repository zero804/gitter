"use strict";

var Marionette = require('backbone.marionette');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var ModalView = require('views/modal');
var TagCollection = require('../../collections/tagCollection');

var editTagsTemplate = require('./tmpl/editTagsTemplate.hbs');
var tagTemplate = require('./tmpl/tagTemplate.hbs');


require('views/behaviors/isomorphic');


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
      tagList: { el: '#tag-list', init: 'initTagList' }
    }
  },

  initialize: function() {
    this.model = context.troupe();
    this.tagCollection = new TagCollection([{ value: 'tag1'}, { value: 'tag2'}]);
  },

  initTagList: function(optionsForRegion){
    return new TagListView(optionsForRegion({ collection: this.tagCollection }));
  }

  /*
  save: function(e) {
    if(e) e.preventDefault();

    var tags = this.$el.find("#tags").val();

    apiClient.room.put('', { tags: tags })
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
    this.view = new View({ });
    console.log(this.$el);
  },
  menuItems: [
    { action: "save", text: "Save", className: "trpBtnGreen"}
  ]
});

module.exports = Modal;
