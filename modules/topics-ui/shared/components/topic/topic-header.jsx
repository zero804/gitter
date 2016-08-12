"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';

export default React.createClass({

  displayName: 'TopicHeader',
  propTypes: {
    topic: PropTypes.shape({
      title: PropTypes.string
    }).isRequired
  },

  render(){

    const { title } = this.props.topic;

    return (
      <Container>
        <Panel>
          <header>
            <H1>{title}</H1>
          </header>
        </Panel>
      </Container>
    );
  }

});
