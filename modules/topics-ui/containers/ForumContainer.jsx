var react = require('react');
var backbone = require('backbone');
var underscore = require('underscore');

module.exports = react.createClass({
  render(){
    const { groupName } = this.props;
    return(<h1>Welcome to { groupName }'s topics</h1>);
  }
});
