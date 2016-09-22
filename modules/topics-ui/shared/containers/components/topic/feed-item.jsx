import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import moment from 'moment';

export default React.createClass({

  displayName: 'FeedItem',
  propTypes: {
    children: PropTypes.node,
    item: PropTypes.shape({
      sent: PropTypes.string.isRequired,
    }),
    primaryLabel: PropTypes.string,
    secondaryLabel: PropTypes.string,
    primaryValue: PropTypes.number,
    secondaryValue: PropTypes.number,
    onSecondaryClicked: PropTypes.func,
  },

  render(){

    const {item} = this.props;
    const {user} = item;
    const avatarDims = 30;
    const formattedSentDate = moment(item.sent).format('MMM Do')

    return (
      <article className="topic-reply-list-item">
        <div className="topic-reply-list-item__content">
          <div className="topic-reply-list-item__user-details">
            <UserAvatar
              className="topic-reply-list-item__avatar"
              user={user}
              width={avatarDims}
              height={avatarDims}/>
            <span className="topic-reply-list-item__sent">{formattedSentDate}</span>
          </div>
          {this.getItemContent()}
        </div>
        <footer className="topic-reply-list-item__footer">
          {this.getPrimaryContent()}
          {this.getSecondaryContent()}
        </footer>
        {this.props.children}
      </article>
    );
  },

  getPrimaryContent(){
    const {primaryLabel, primaryValue} = this.props;
    if(!primaryLabel){ return; }
    return (
      <span className="topic-reply-list-item__likes">
        {primaryValue} {primaryLabel}
      </span>
    );
  },

  getSecondaryContent(){
    const {secondaryLabel, secondaryValue} = this.props;
    if(!secondaryLabel){ return; }

    return (
      <button
        className="topic-reply-list-item__comments"
        onClick={this.props.onSecondaryClicked}>
        {secondaryValue} {secondaryLabel}
      </button>
    );
  },

  getItemContent(){
    const {item} = this.props;
    const body = (item.body || {});
    if(body.html) {
      return (
        <div
          className="topic-reply-list-item__body"
          dangerouslySetInnerHTML={{ __html: body.html }} />
      );
    }
    return (
      <section className="topic-reply-list-item__body">
        {item.text}
      </section>
    );
  },

});
