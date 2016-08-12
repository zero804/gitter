"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Avatar',
  propTypes: {
    src: PropTypes.string.isRequired,
    title: PropTypes.string
  },

  render(){
    const { src, title } = this.props;
    return (
      <img src={src} title={title}/>
    );
  }

});
