"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Editor',
  propTypes: {
    className: PropTypes.string,
    name: PropTypes.string
  },

  render(){

    const { className, name } = this.props;
    const compiledClass = !!className ? `editor ${className}` : 'editor';

    return (
      <textarea className={compiledClass} name={name}>
        { this.props.children }
      </textarea>
    );
  }

});
