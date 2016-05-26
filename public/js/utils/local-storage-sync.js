'use strict';

var store = require('components/local-store');

module.exports = {
  sync: function(method, model, options) {//jshint unused: true

    var attrs;

    //save
    if (method === 'create' || method === 'update' || method === 'patch') {
      attrs = JSON.stringify(this);
      return store.set(this.cid, attrs);
    }

    //read
    attrs = store.get(this.cid);
    if(!attrs) { return }
    attrs = (attrs || '{}');
    attrs = JSON.parse(attrs);

    model.set(attrs);

    if(options.success) options.success();
  },
};
