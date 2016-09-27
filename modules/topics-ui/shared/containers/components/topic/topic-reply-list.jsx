import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TopicReplyListItem from './topic-reply-list-item.jsx';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    userId: PropTypes.string.isRequired,
    user: PropTypes.object.isRequired,
    forumId: PropTypes.string.isRequired,
    topicId: PropTypes.string.isRequired,
    replies: PropTypes.array.isRequired,
    newCommentContent: PropTypes.string,
    onReplyCommentsClicked: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    submitNewComment: PropTypes.func.isRequired,
    onItemSubscribeButtonClick: PropTypes.func
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
    const {userId, forumId, topicId, newCommentContent, user, onItemSubscribeButtonClick} = this.props;
    return (
      <li key={`reply-list-item-${index}`}>
        <TopicReplyListItem
          userId={userId}
          forumId={forumId}
          topicId={topicId}
          reply={reply}
          user={user}
          newCommentContent={newCommentContent}
          submitNewComment={this.submitNewComment}
          onNewCommentUpdate={this.onNewCommentUpdate}
          onCommentsClicked={this.onReplyCommentsClicked}
          onSubscribeButtonClick={onItemSubscribeButtonClick}/>
      </li>
    );
  },

  onReplyCommentsClicked(replyId){
    this.props.onReplyCommentsClicked(replyId);
  },

  onNewCommentUpdate(replyId, val) {
    this.props.onNewCommentUpdate(replyId, val);
  },

  submitNewComment(){
    this.props.submitNewComment();
  }

});
