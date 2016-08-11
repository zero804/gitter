"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';

export default React.createClass({

  displayName: 'TopicHeader',
  propTypes: {
    title: PropTypes.string.isRequired
  },

  render(){
    return (
      <Container>
        <Panel>
          <header>This is the news</header>
        </Panel>
      </Container>
    );
  }

});
