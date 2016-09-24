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
    onCommentEditUpdate: PropTypes.func.isRequired,
    onCommentEditCancel: PropTypes.func.isRequired,
    onCommentEditSave: PropTypes.func.isRequired,
  },

  render(){
    const {reply} = this.props;
    return (
      <FeedItem
        item={reply}
        onChange={this.onReplyEditUpdate}
        onCancel={this.onReplyEditCancel}
        onSave={this.onReplyEditSaved}
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
        comment={comment}
        onChange={this.onCommentEditUpdate.bind(this, comment.id)}
        onCancel={this.onCommentEditCancel.bind(this, comment.id)}
        onSave={this.onCommentEditSave.bind(this, comment.id)}/>
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

  onReplyEditUpdate(value){
    const {reply} = this.props;
    const {id} = reply;
    this.props.onReplyEditUpdate(id, value);
  },

  onReplyEditCancel(){
    const {reply} = this.props;
    const {id} = reply;
    this.props.onReplyEditCancel(id);
  },

  onReplyEditSaved(){
    const {reply} = this.props;
    const {id} = reply;
    this.props.onReplyEditSaved(id)
  },

  onCommentEditUpdate(commentId, value){
    this.props.onCommentEditUpdate(commentId, value);
  },

  onCommentEditCancel(commentId){
    this.props.onCommentEditCancel(commentId);
  },

  onCommentEditSave(commentId){
    this.props.onCommentEditSave(commentId);
  },

});
