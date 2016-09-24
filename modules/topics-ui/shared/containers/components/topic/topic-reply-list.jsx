import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TopicReplyListItem from './topic-reply-list-item.jsx';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    currentUser: PropTypes.object.isRequired,
    replies: PropTypes.array.isRequired,
    newCommentContent: PropTypes.string,
    onReplyCommentsClicked: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    submitNewComment: PropTypes.func.isRequired,
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
    const {newCommentContent, currentUser} = this.props;
    return (
      <li key={`reply-list-item-${index}`}>
        <TopicReplyListItem
          reply={reply}
          currentUser={currentUser}
          newCommentContent={newCommentContent}
          submitNewComment={this.submitNewComment}
          onNewCommentUpdate={this.onNewCommentUpdate}
          onCommentsClicked={this.onReplyCommentsClicked}/>
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
