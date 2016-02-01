'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Collection.extend({

  model: Backbone.Model.extend({
    url: function(){
      return  ' ';
    }
  }),
  initialize: function() {

    //fake a snapshot event
    setTimeout(function() {
      this.add([
        { name: 'gitterHQ', githubType: 'ORG', favourite: 1, url: '/gitterHQ' },
        { name: 'troupe', githubType: 'ORG', url: '/troupe' },
        { name: 'gitterHQ/test1', githubType: 'ORG_CHANNEL', favourite: 2, url: '/gitterHQ/test1' },
        { name: 'gitterHQ/test2', githubType: 'ORG_CHANNEL', url: '/gitterHQ/test2' },
        { name: 'troupe/test1', githubType: 'ORG_CHANNEL', favourite: 3, url: '/troupe/test1' },
        { name: 'troupe/test2', githubType: 'ORG_CHANNEL', url: '/troupe/test2' },
        { name: 'someusername', githubType: 'ONETOONE', url: '/someusername' },
        { name: 'someotherusername', githubType: 'ONETOONE', favourite: 4, url: '/someotherusername' },
        { name: 'username', githubType: 'ONETOONE', url: '/username' },
      ]);
      this.trigger('snapshot');

    }.bind(this), 0);
  },

});
