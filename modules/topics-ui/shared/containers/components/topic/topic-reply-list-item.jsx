import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import UserAvatar from '../user/user-avatar.jsx';

import SubscribeButton from '../forum/subscribe-button.jsx';
import { SUBSCRIPTION_STATE_SUBSCRIBED } from '../../../constants/forum.js';
import requestUpdateReplySubscriptionState from '../../../action-creators/forum/request-update-reply-subscription-state';

import CommentEditor from './comment-editor.jsx';
import CommentItem from './comment-item.jsx';
import FeedItem from './feed-item.jsx';

export default React.createClass({

  displayName: 'TopicReplyListItem',
  propTypes: {
    userId: PropTypes.string.isRequired,
    forumId: PropTypes.string.isRequired,
    topicId: PropTypes.string.isRequired,
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
    user: PropTypes.object.isRequired,
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
        footerChildren={this.getFeedItemFooterChildren()}>
        {this.getComments()}
      </FeedItem>
    );
  },

  getFeedItemFooterChildren(){
    const {reply} = this.props;
    const subscriptionState = reply.subscriptionState;

    return [
      <span
        key="likes"
        className="feed-item__likes">
        10 Likes
      </span>,
      <button
        key="comments"
        className="feed-item__comments"
        onClick={this.onCommentsClicked}>
        2 Comments
      </button>,
      <SubscribeButton
        key="subscribe"
        subscriptionState={subscriptionState}
        className="topic-reply-list-item__footer__subscribe-action"
        itemClassName="topic-reply-list-item__footer__subscribe-action-text-item"
        subscribedText="Stop Watching"
        unsubscribedText="Watch"
        pendingText="..."
        onClick={this.onSubscribeButtonClick}/>
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
        comment={comment} />
    );
  },


  onSubscribeButtonClick() {
    const {userId, forumId, topicId, reply} = this.props;
    const replyId = reply.id;
    const subscriptionState = reply.subscriptionState;

    var desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);
    dispatch(requestUpdateReplySubscriptionState(forumId, topicId, replyId, userId, desiredIsSubscribed));
  },

  onCommentsClicked(e){
    e.preventDefault();
    const {reply} = this.props;
    this.props.onCommentsClicked(reply.id);
  },

  onNewCommentUpdate(val) {
    const {reply} = this.props;
    this.props.onNewCommentUpdate(reply.id, val);
  },

  submitNewComment(){
    this.props.submitNewComment();
  }
});
