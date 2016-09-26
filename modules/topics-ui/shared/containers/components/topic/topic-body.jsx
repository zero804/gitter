import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import SubscribeButton from '../forum/subscribe-button.jsx';

export default React.createClass({

  displayName: 'TopicBody',
  propTypes: {
    topic: PropTypes.shape({
      body: PropTypes.shape({
        html: PropTypes.string
      }).isRequired,
    }).isRequired,
    onSubscribeButtonClick: PropTypes.func
  },

  render() {

    const { topic, onSubscribeButtonClick } = this.props;
    const subscriptionState = topic.subscriptionState;

    return (
      <Container className="container--topic-body">
        <Panel className="panel--topic-body">
          <section
            className="topic-body__content"
            dangerouslySetInnerHTML={{ __html: topic.body.html}}>
          </section>
          <footer className="topic-body__footer">
            <button className="topic-body__footer__action">Share</button>
            <SubscribeButton
              subscriptionState={subscriptionState}
              className="topic-body__footer__subscribe-action"
              itemClassName="topic-body__footer__subscribe-action-text-item"
              subscribedText="Stop Watching"
              unsubscribedText="Watch"
              pendingText="..."
              onClick={onSubscribeButtonClick}/>
          </footer>
        </Panel>
      </Container>
    );
  },


});
