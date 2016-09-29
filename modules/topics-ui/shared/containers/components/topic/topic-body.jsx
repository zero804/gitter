import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import WatchButton from '../forum/watch-button.jsx';
import ReactionButton from '../forum/reaction-button.jsx';

export default React.createClass({

  displayName: 'TopicBody',
  propTypes: {
    topic: PropTypes.shape({
      body: PropTypes.shape({
        html: PropTypes.string
      }).isRequired,
    }).isRequired,
    onSubscribeButtonClick: PropTypes.func,
    onReactionPick: PropTypes.func
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
            <ReactionButton
              key="reactions"
              className="topic-body__footer__reaction-action"
              onReactionPick={this.onReactionPick}/>
            <WatchButton
              subscriptionState={subscriptionState}
              className="topic-body__footer__subscribe-action"
              itemClassName="topic-body__footer__subscribe-action-text-item"
              onClick={onSubscribeButtonClick}/>
            <button className="topic-body__footer__action">Share</button>
          </footer>
        </Panel>
      </Container>
    );
  },


  onReactionPick(reactionKey, isReacting) {
    const {topic, onReactionPick} = this.props;
    if(onReactionPick) {
      onReactionPick(topic.id, reactionKey, isReacting);
    }
  },


});
