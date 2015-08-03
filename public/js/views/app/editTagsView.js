"use strict";

var Marionette = require('backbone.marionette');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var ModalView = require('views/modal');
var editTagsTemplate = require('./tmpl/editTagsTemplate.hbs');

var View = Marionette.ItemView.extend({
  template: editTagsTemplate,

  initialize: function() {
    this.model = context.troupe();
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

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
