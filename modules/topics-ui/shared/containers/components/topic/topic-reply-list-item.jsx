import React, { PropTypes } from 'react';
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
    onCommentsClicked: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    submitNewComment: PropTypes.func.isRequired,
    newCommentContent: PropTypes.string,
    onReplyEditUpdate: PropTypes.func.isRequired,
    onReplyEditCancel: PropTypes.func.isRequired,
    onReplyEditSaved: PropTypes.func.isRequired,
  },

  render(){
    const {reply} = this.props;
    return (
      <FeedItem
      item={reply}
      onChange={(value) => this.onReplyEditUpdate(reply.id, value)}
      onCancel={() => this.onReplyEditCancel(reply.id)}
      onSave={() => this.onReplyEditSaved(reply.id)}
      primaryLabel="Likes"
      primaryValue={10}
      secondaryLabel="Comments"
      secondaryValue={2}
      onSecondaryClicked={this.onCommentsClicked}>
      {this.getComments()}
      </FeedItem>
    );
  },

  getComments(){
    const {reply, newCommentContent} = this.props;
    if(!reply.isCommenting) { return; }
    return (
      <section className="reply-comment-list">
        <ul className="reply-comment-list__comments">
          {this.getCommentList()}
        </ul>
        <CommentEditor
          autoFocus={true}
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
      onChange={(val) => this.onCommentUpdate(comment.id, val)}
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

  onReplyEditUpdate(replyId, value){
    this.props.onReplyEditUpdate(replyId, value);
  },

  onReplyEditCancel(replyId){
    this.props.onReplyEditCancel(replyId);
  },

  onReplyEditSaved(replyId){
    this.props.onReplyEditSaved(replyId)
  },

  onCommentUpdate(commentId, value){
    //console.log('comment', commentId, value);
  }

});
