'use strict';

var Backbone = require('backbone');
var localStorageSync = require('../utils/local-storage-sync');

var Model = Backbone.Model.extend({
  defaults: { name: null, avatarUrl: null }
});

module.exports = Backbone.Collection.extend({

  model: Model,

  constructor: function (){
    Backbone.Collection.prototype.constructor.apply(this, arguments);
  },

  initialize: function(){
    this.cid = 'left-menu-saved-searches';
    this.fetch();
  },

  comparator: function(a, b){
    return a.get('time') < b.get('time') ? 1 : -1;
  },

  add: function(model){
    if(!!this.where(model).length) { return }
    if(!model.name) { return }
    model.time = +new Date();
    Backbone.Collection.prototype.add.apply(this, arguments);
  },

  set: function(){
    Backbone.Collection.prototype.set.apply(this, arguments);
    this.sync('create', this);
  },

  sync: localStorageSync.sync
});
