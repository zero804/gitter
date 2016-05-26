'use strict';

var Backbone = require('backbone');
var moment = require('moment');

module.exports = Backbone.Collection.extend({

  model: Backbone.Model.extend({
    url: function(){
      return ' ';
    }
  }),
  initialize: function() {

    //fake a snapshot event
    setTimeout(function() {
      this.add([
        { id: 1, name: 'gitterHQ', githubType: 'ORG', favourite: 1, url: '/gitterHQ' },
        { id: 2, name: 'troupe', githubType: 'ORG', url: '/troupe' },
        { id: 3, name: 'gitterHQ/test1', githubType: 'ORG_CHANNEL', favourite: 2, url: '/gitterHQ/test1' },
        { id: 4, name: 'gitterHQ/test2', githubType: 'ORG_CHANNEL', url: '/gitterHQ/test2' },
        { id: 5, name: 'troupe/test1', githubType: 'ORG_CHANNEL', favourite: 3, url: '/troupe/test1' },
        { id: 6, name: 'troupe/test2', githubType: 'ORG_CHANNEL', url: '/troupe/test2' },
        { id: 7, name: 'someusername', githubType: 'ONETOONE', url: '/someusername' },
        { id: 8, name: 'someotherusername', githubType: 'ONETOONE', favourite: 4, url: '/someotherusername' },
        { id: 9, name: 'username', githubType: 'ONETOONE', url: '/username' },
      ]);
      this.trigger('snapshot');

    }.bind(this), 0);
  },

});
