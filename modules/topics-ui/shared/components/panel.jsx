"use strict";

var React = require('react');

module.exports = React.createClass({

  displayName: 'Panel',

  propTypes: {
    className: React.PropTypes.string,
  },

  render(){

    const { className } = this.props;
    const compiledClass = !!className ? `panel ${className}` : 'panel';

    return (
      <div className={compiledClass}>{ this.props.children }</div>
    );
  }
});
