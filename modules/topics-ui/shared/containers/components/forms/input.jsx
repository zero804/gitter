"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Input',
  propTypes: {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
  },

  render(){

    const { name, className, placeholder } = this.props;
    const compiledClass = !!className ? `input ${className}` : 'input';

    return (
      <input className={compiledClass} name={name} placeholder={placeholder}/>
    );
  }

});
