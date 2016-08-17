"use strict";

var React = require('react');
var classNames = require('classnames');

module.exports = React.createClass({

  displayName: 'Panel',

  propTypes: {
    className: React.PropTypes.string,
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('panel', className);

    return (
      <div className={compiledClass}>{ this.props.children }</div>
    );
  }
});
