"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';

module.exports = React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {},

  render(){
    return (
      <Container>{this.props.children}</Container>
    );
  }

});
