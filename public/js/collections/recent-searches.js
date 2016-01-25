'use strict';

var Backbone = require('backbone');
var localStorageSync = require('../utils/local-storage-sync');

var Model = Backbone.Model.extend({
  defaults: { name: '', avatarUrl: null }
});

module.exports = Backbone.Collection.extend({

  model: Model,

  initialize: function(){
    this.cid = 'left-menu-saved-searches';
    this.fetch();
  },

  comparator: function(a, b){
    return a.get('time') < b.get('time');
  },

  add: function(model){
    if(!!this.where(model).length) { return }
    model.time = +new Date();
    Backbone.Collection.prototype.add.apply(this, arguments);
  },

  set: function(){
    Backbone.Collection.prototype.set.apply(this, arguments);
    this.sync('create', this);
  },

  sync: localStorageSync.sync
});
