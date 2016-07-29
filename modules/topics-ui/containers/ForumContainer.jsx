'use strict';

var React = require('react');

module.exports = React.createClass({
  displayName: 'ForumContainer',
  propTypes: {
    groupName: React.PropTypes.string
  },
  render() {
    const { groupName } = this.props;
    return (
      <h1>Welcome to { groupName }s topics</h1>
    );
  }
});
