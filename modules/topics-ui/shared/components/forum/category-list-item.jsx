"use strict";

var React = require('react');

module.exports = React.createClass({

  displayName: 'CategoryListItem',
  propTypes: {
    category: React.PropTypes.string.isRequired,
    active: React.PropTypes.bool.isRequired,
    onClick: React.PropTypes.func.isRequired,
  },

  render(){

    const { category, active, onClick } = this.props;

    var className = 'subdued-button-clouds--xsmall';
    if(active) { className = 'button-clouds--xsmall'; }

    return (
      <button className={ className } onClick={() => onClick(category)}>{ category }</button>
    );
  }
});
