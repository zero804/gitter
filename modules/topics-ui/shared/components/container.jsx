"use strict";

var React = require('react');

module.exports = React.createClass({

  displayName: 'Container',
  propTypes: {
    className: React.PropTypes.string,
  },

  render(){

    const { className } = this.props;
    const compiledClass = !!className ? `container ${className}` : 'container';

    return (
      <section className={compiledClass} >{this.props.children}</section>
    );
  }
})
