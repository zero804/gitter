import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TopicReplyListItem from './topic-reply-list-item.jsx';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    userId: PropTypes.string.isRequired,
    forumId: PropTypes.string.isRequired,
    topicId: PropTypes.string.isRequired,
    replies: PropTypes.array.isRequired,
  },

  render(){
    const {replies} = this.props;
    return (
      <Container>
        <Panel className="panel--topic-reply-list">
          <ul className="topic-reply-list">
            {replies.map((reply, i) => this.buildReplyListItem(reply, i))}
          </ul>
        </Panel>
      </Container>
    );
  },

  buildReplyListItem(reply, index) {
    const {userId, forumId, topicId} = this.props;

    return (
      <li key={`reply-list-item-${index}`}>
        <TopicReplyListItem
          userId={userId}
          forumId={forumId}
          topicId={topicId}
          reply={reply} />
      </li>
    );
  }

});
