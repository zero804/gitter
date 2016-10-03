import React, { PropTypes } from 'react';

import CommentEditor from './comment-editor.jsx';
import CommentItem from './comment-item.jsx';
import FeedItem from './feed-item.jsx';
import WatchButton from '../forum/watch-button.jsx';
import ReactionButton from '../forum/reaction-button.jsx';

export default React.createClass({

  displayName: 'TopicReplyListItem',
  propTypes: {
    reply: PropTypes.shape({
      id: PropTypes.string,
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
    user: PropTypes.object.isRequired,

    newCommentContent: PropTypes.string,
    submitNewComment: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    onCommentsClicked: PropTypes.func.isRequired,

    onSubscribeButtonClick: PropTypes.func,
    onReactionPick: PropTypes.func,
    onCommentReactionPick: PropTypes.func,

    onReplyEditClick: PropTypes.func.isRequired,
    onReplyEditUpdate: PropTypes.func.isRequired,
    onReplyEditCancel: PropTypes.func.isRequired,
    onReplyEditSaved: PropTypes.func.isRequired,

    onCommentEditClick: PropTypes.func.isRequired,
    onCommentEditUpdate: PropTypes.func.isRequired,
    onCommentEditCancel: PropTypes.func.isRequired,
    onCommentEditSave: PropTypes.func.isRequired
  },

  render(){
    const {reply} = this.props;

    return (
      <FeedItem
        item={reply}
        onEditClick={this.onReplyEditClick}
        onChange={this.onEditUpdate}
        onCancel={this.onEditCancel}
        onSave={this.onEditSaved}
        footerChildren={this.getFeedItemFooterChildren()}>
        {this.getComments()}
      </FeedItem>
    );
  },

  getFeedItemFooterChildren(){
    const {reply} = this.props;
    const subscriptionState = reply.subscriptionState;

    return [
      <button
        key="comments"
        className="feed-item__comments"
        onClick={this.onCommentsClicked}>
        2 Comments
      </button>,
      <WatchButton
        key="subscribe"
        subscriptionState={subscriptionState}
        className="topic-reply-list-item__footer__subscribe-action"
        itemClassName="topic-reply-list-item__footer__subscribe-action-text-item"
        onClick={this.onSubscribeButtonClick}/>,
      <ReactionButton
        key="reactions"
        reactionCountMap={reply.reactions}
        ownReactionMap={reply.ownReactions}
        onReactionPick={this.onReactionPick}/>
    ];
  },

  getComments(){
    const {reply, newCommentContent, user} = this.props;
    if(!reply.isCommenting) { return; }
    return (
      <section className="reply-comment-list">
        <ul className="reply-comment-list__comments">
          {this.getCommentList()}
        </ul>
        <CommentEditor
          autoFocus={true}
          user={user}
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
        onReactionPick={this.onCommentReactionPick}
        onChange={this.onCommentEditUpdate.bind(this, comment.id)}
        onCancel={this.onCommentEditCancel.bind(this, comment.id)}
        onSave={this.onCommentEditSave.bind(this, comment.id, reply.id)}
        onEditClick={this.onCommentEditClick.bind(this, comment.id)} />
    );
  },

  onCommentsClicked(e){
    e.preventDefault();
    const {reply} = this.props;
    this.props.onCommentsClicked(reply.id);
  },

  onSubscribeButtonClick(e) {
    const {reply, onSubscribeButtonClick} = this.props;
    if(onSubscribeButtonClick) {
      onSubscribeButtonClick(e, reply.id);
    }
  },

  onReactionPick(reactionKey, isReacting) {
    const {reply, onReactionPick} = this.props;
    if(onReactionPick) {
      onReactionPick(reply.id, reactionKey, isReacting);
    }
  },

  onCommentReactionPick(commentId, reactionKey, isReacting) {
    // TODO: pass it up further
    const {reply, onCommentReactionPick} = this.props;
    if(onCommentReactionPick) {
      onCommentReactionPick(reply.id, commentId, reactionKey, isReacting);
    }
  },

  onNewCommentUpdate(val) {
    const {reply} = this.props;
    this.props.onNewCommentUpdate(reply.id, val);
  },

  submitNewComment(){
    this.props.submitNewComment();
  },

  onReplyEditClick() {
    const { reply, onReplyEditClick } = this.props;
    const { id } = reply;
    if(onReplyEditClick) {
      onReplyEditClick(id);
    }
  },

  onEditUpdate(value) {
    const { reply } = this.props;
    const { id } = reply;
    this.props.onReplyEditUpdate(id, value);
  },

  onEditCancel() {
    const { reply } = this.props;
    const { id } = reply;
    this.props.onReplyEditCancel(id);
  },

  onEditSaved() {
    const { reply } = this.props;
    const { id } = reply;
    this.props.onReplyEditSaved(id)
  },

  onCommentEditClick(commentId) {
    const { onCommentEditClick } = this.props;
    if(onCommentEditClick) {
      onCommentEditClick(commentId);
    }
  },

  onCommentEditUpdate(commentId, value){
    this.props.onCommentEditUpdate(commentId, value);
  },

  onCommentEditCancel(commentId){
    this.props.onCommentEditCancel(commentId);
  },

  onCommentEditSave(commentId, replyId){
    this.props.onCommentEditSave(commentId, replyId);
  },


});
