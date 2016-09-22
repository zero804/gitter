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

  render() {

    const { topic } = this.props;

    return (
      <Container className="container--topic-body">
        <Panel className="panel--topic-body">
          <section
            className="topic-body__content"
            dangerouslySetInnerHTML={{ __html: topic.body.html}}>
          </section>
          <footer className="topic-body__footer">
            <button className="topic-body__footer__action">Share</button>
            <button className="topic-body__footer__action">Watch</button>
          </footer>
        </Panel>
      </Container>
    );
  }

});
