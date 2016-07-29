'use strict';

var React = require('react');
var ForumContainer = require('../../containers/ForumContainer.jsx');

module.exports = React.createClass({

  render(){
    return <ForumContainer {...this.props} {...this.state} />
  },

});
