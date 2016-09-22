import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import SubscribeButton from '../forum/subscribe-button.jsx';
import { SUBSCRIPTION_STATE } from '../../../constants/forum.js';
import requestUpdateTopicSubscriptionState from '../../../action-creators/forum/request-update-topic-subscription-state';

export default React.createClass({

  displayName: 'TopicBody',
  propTypes: {
    userId: PropTypes.string.isRequired,
    forumId: PropTypes.string.isRequired,
    topic: PropTypes.shape({
      body: PropTypes.shape({
        html: PropTypes.string
      }).isRequired,
    }).isRequired
  },

  render() {

    const { topic } = this.props;
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
              onClick={this.onSubscribeButtonClick}/>
          </footer>
        </Panel>
      </Container>
    );
  },


  onSubscribeButtonClick() {
    const {userId, forumId, topic} = this.props;
    const topicId = topic.id;
    const subscriptionState = topic.subscriptionState;

    var desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE.SUBSCRIBED);
    dispatch(requestUpdateTopicSubscriptionState(forumId, topicId, userId, desiredIsSubscribed));
  }


});
