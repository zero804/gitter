'use strict';

var React = require('react');

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired
    })
  },

  render() {
    const { groupName } = this.props;
    return (
      <h1>Welcome to { groupName }s topics</h1>
    );
  }
});
