var react = require('react');

module.exports = react.createClass({
  render(){
    const { groupName } = this.props;
    return(<h1>Welcome to { groupName }'s topics</h1>);
  }
});
