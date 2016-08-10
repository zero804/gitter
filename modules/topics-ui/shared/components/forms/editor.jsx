"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Editor',
  propTypes: {
    className: PropTypes.string,
  },

  render(){

    const { className } = this.props;
    const compiledClass = !!className ? `editor ${className}` : 'editor';

    return (
      <textarea className={compiledClass}>
        { this.props.children }
      </textarea>
    );
  }

});
