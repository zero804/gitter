import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';

export default React.createClass({

  displayName: 'TopicBody',
  propTypes: {
    topic: PropTypes.shape({
      body: PropTypes.shape({
        html: PropTypes.string
      }).isRequired,
    }).isRequired
  },

  render(){

    const { topic } = this.props;

    return (
      <Container className="container--topic-body">
        <Panel className="panel--topic-body">
          <div
            className="topic-body__content"
            dangerouslySetInnerHTML={{ __html: topic.body.html}}>
          </div>
        </Panel>
      </Container>
    );
  }

});
