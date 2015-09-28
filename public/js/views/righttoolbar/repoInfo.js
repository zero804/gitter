"use strict";

var repoInfoTemplate = require('./tmpl/repoInfo.hbs');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var RepoInfoModel = require('collections/repo-info');


module.exports = Marionette.ItemView.extend({

  template: repoInfoTemplate,

  modelEvents: {
    "change": "render"
  },

  constructor: function (){
    this.model = new RepoInfoModel();
    this.roomModel = context.troupe();
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  initialize: function repoInfoViewInit(attrs, options){
    if(this.roomModel.get('githubType') === 'REPO') {
      this.model.fetch({
        data: {
          repo: this.roomModel.get('uri')
        }
      });
    }
    this.listenTo(this.roomModel, 'change:id', this.onRoomChange, this);
  },

  //update when  room changes
  onRoomChange: function repoInfoRoomChange(roomModel){
    if(roomModel.get('githubType') === 'REPO') {
      var uri = roomModel.get('uri');
      this.model.fetch({
        data: {
          repo: uri
        }
      });
    }
  }

});
