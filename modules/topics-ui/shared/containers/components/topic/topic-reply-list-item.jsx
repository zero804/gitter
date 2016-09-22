import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import UserAvatar from '../user/user-avatar.jsx';
import SubscribeButton from '../forum/subscribe-button.jsx';
import { SUBSCRIPTION_STATE } from '../../../constants/forum.js';
import requestUpdateReplySubscriptionState from '../../../action-creators/forum/request-update-reply-subscription-state';

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
  },

  render(){

    const {reply} = this.props;
    const {user} = reply;
    const avatarDims = 30;
    const subscriptionState = reply.subscriptionState;

    return (
      <article className="topic-reply-list-item">
        <div className="topic-reply-list-item__content">
          <div className="topic-reply-list-item__user-details">
            <UserAvatar
              className="topic-reply-list-item__avatar"
              user={user}
              width={avatarDims}
              height={avatarDims}/>
            <span className="topic-reply-list-item__sent">{reply.formattedSentDate}</span>
          </div>
          {this.getReplyContent(reply)}
        </div>
        <footer className="topic-reply-list-item__footer">
          <span className="topic-reply-list-item__likes">10 Likes</span>
          <span className="topic-reply-list-item__comments">2 Comments</span>
          <SubscribeButton
            subscriptionState={subscriptionState}
            className="topic-reply-list-item__footer__subscribe-action"
            itemClassName="topic-reply-list-item__footer__subscribe-action-text-item"
            subscribedText="Stop Watching"
            unsubscribedText="Watch"
            pendingText="..."
            onClick={this.onSubscribeButtonClick}/>
        </footer>
      </article>
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


  onSubscribeButtonClick() {
    const {userId, forumId, topicId, reply} = this.props;
    const replyId = reply.id;
    const subscriptionState = reply.subscriptionState;

    var desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE.SUBSCRIBED);
    dispatch(requestUpdateReplySubscriptionState(forumId, topicId, replyId, userId, desiredIsSubscribed));
  }

});
