"use strict";

import React, {PropTypes, createClass} from 'react';
import classNames from 'classnames';

module.exports = createClass({

  displayName: 'Container',
  propTypes: {
    className: PropTypes.string,
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('container', className);

    return (
      <section className={compiledClass} >{this.props.children}</section>
    );
  }
})
