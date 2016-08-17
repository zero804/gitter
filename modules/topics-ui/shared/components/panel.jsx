"use strict";

import React, {PropTypes, createClass} from 'react';
import classNames from 'classnames';

module.exports = createClass({

  displayName: 'Panel',

  propTypes: {
    className: PropTypes.string,
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('panel', className);

    return (
      <div className={compiledClass}>{ this.props.children }</div>
    );
  }
});
