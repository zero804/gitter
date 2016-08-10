"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Input',
  propTypes: {
    name: PropTypes.string.isRequired,
  },

  render(){

    const { name } = this.props;

    console.log(name);

    return (
      <input className="input" name={name}/>
    );
  }

});
