'use strict';

var React = require('react');
var Backbone = require('backbone');
var ForumContainer = require('../../containers/ForumContainer.jsx');
var router = require('./routers/index');

Backbone.history.start({ pushState: true });

module.exports = React.createClass({

  render(){
    switch(router.get('route')) {
      case 'forum':
      return <ForumContainer {...this.props} {...this.state} />
    }
  },

});
