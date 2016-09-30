import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TopicReplyListItem from './topic-reply-list-item.jsx';

export default React.createClass({

  displayName: 'TopicReplyList',
  propTypes: {
    replies: PropTypes.array.isRequired,
    user: PropTypes.object.isRequired,

    newCommentContent: PropTypes.string,
    submitNewComment: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    onCommentsClicked: PropTypes.func.isRequired,

    onReplySubscribeButtonClick: PropTypes.func,
    onReplyReactionPick: PropTypes.func,
    onCommentReactionPick: PropTypes.func,

    onReplyEditUpdate: PropTypes.func.isRequired,
    onReplyEditCancel: PropTypes.func.isRequired,
    onReplyEditSaved: PropTypes.func.isRequired,
    onCommentEditUpdate: PropTypes.func.isRequired,
    onCommentEditCancel: PropTypes.func.isRequired,
    onCommentEditSave: PropTypes.func.isRequired
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
    const {
      user,
      newCommentContent,
      submitNewComment,
      onNewCommentUpdate,
      onCommentsClicked,
      onReplySubscribeButtonClick,
      onReplyReactionPick,
      onCommentReactionPick,
      onReplyEditUpdate,
      onReplyEditCancel,
      onReplyEditSaved,
      onCommentEditUpdate,
      onCommentEditCancel,
      onCommentEditSave
    } = this.props;

    return (
      <li key={`reply-list-item-${index}`}>
        <TopicReplyListItem
          reply={reply}
          user={user}
          newCommentContent={newCommentContent}
          submitNewComment={submitNewComment}
          onNewCommentUpdate={onNewCommentUpdate}
          onCommentsClicked={onCommentsClicked}
          onSubscribeButtonClick={onReplySubscribeButtonClick}
          onReactionPick={onReplyReactionPick}
          onCommentReactionPick={onCommentReactionPick}
          onEditUpdate={onReplyEditUpdate}
          onEditCancel={onReplyEditCancel}
          onEditSaved={onReplyEditSaved}
          onCommentEditUpdate={onCommentEditUpdate}
          onCommentEditCancel={onCommentEditCancel}
          onCommentEditSave={onCommentEditSave} />
      </li>
    );
  },

});
