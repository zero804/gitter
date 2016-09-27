import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import CommentEditor from './comment-editor.jsx';
import CommentItem from './comment-item.jsx';
import FeedItem from './feed-item.jsx';

export default React.createClass({

  displayName: 'TopicReplyListItem',
  propTypes: {
    reply: PropTypes.shape({
      text: PropTypes.string,
      body: PropTypes.shape({
        html: PropTypes.string,
        text: PropTypes.string,
      }),
      formattedSentDate: PropTypes.string.isRequired,
      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
      }).isRequired

    }).isRequired,
    currentUser: PropTypes.object.isRequired,
    onCommentsClicked: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    submitNewComment: PropTypes.func.isRequired,
    newCommentContent: PropTypes.string
  },

  render(){
    const {reply} = this.props;
    return (
      <FeedItem
        item={reply}
        primaryLabel="Likes"
        primaryValue={10}
        secondaryLabel="Comments"
        secondaryValue={2}
        onSecondaryClicked={this.onCommentsClicked}>
        {this.getComments()}
      </FeedItem>
    );
  },

  getReplyContent(){
    const {reply} = this.props;
    const body = (reply.body || {});
    if(body.html) {
      return (
        <div
          className="topic-reply-list-item__body"
          dangerouslySetInnerHTML={{ __html: body.html }} />
      );
    }
    return (
      <section className="topic-reply-list-item__body">
        {reply.text}
      </section>
    );
  },

  getComments(){
    const {reply, newCommentContent, currentUser} = this.props;
    if(!reply.isCommenting) { return; }
    return (
      <section className="reply-comment-list">
        <ul className="reply-comment-list__comments">
          {this.getCommentList()}
        </ul>
        <CommentEditor
          autoFocus={true}
          currentUser={currentUser}
          value={newCommentContent}
          onEnter={this.submitNewComment}
          onChange={this.onNewCommentUpdate} />
      </section>
    );
  },

  getCommentList(){
    const {reply} = this.props;
    return reply.comments.map((comment, i) => this.getComment(comment, i))
  },

  getComment(comment, index){
    const {reply} = this.props;
    return (
      <CommentItem
        key={`comment-list-item-${reply.id}-${index}`}
        comment={comment} />
    );
  },

  onCommentsClicked(e){
    e.preventDefault();
    const {reply} = this.props;
    this.props.onCommentsClicked(reply.id);
  },

  onNewCommentUpdate(val){
    const {reply} = this.props;
    this.props.onNewCommentUpdate(reply.id, val);
  },

  submitNewComment(){
    this.props.submitNewComment();
  },

});
