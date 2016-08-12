"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Avatar',
  propTypes: {
    src: PropTypes.string.isRequired,
  },

  render(){
    const { src } = this.props;
    return (
      <img src={src}/>
    );
  }

});
