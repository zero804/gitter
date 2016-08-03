"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';

module.exports = React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {},

  render(){
    return (
      <Container>
        <Panel className="panel--table-control">
          {this.props.children}
        </Panel>
      </Container>
    );
  }

});
