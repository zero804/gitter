"use strict";

var React = require('react');
var Container = require('../container.jsx');

module.exports = React.createClass({
  render(){
    return (
      <Container>
        { this.props.children }
      </Container>
    );
  }
});
