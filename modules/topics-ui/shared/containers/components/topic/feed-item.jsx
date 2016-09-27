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
    onPrimaryClicked: PropTypes.func,
    onSecondaryClicked: PropTypes.func,
  },

  render(){

    const {item} = this.props;
    const {user} = item;
    const avatarDims = 30;
    const formattedSentDate = moment(item.sent).format('MMM Do')

    return (
      <article className="feed-item">
        <div className="feed-item__content">
          <div className="feed-item__user-details">
            <UserAvatar
              className="feed-item__avatar"
              user={user}
              width={avatarDims}
              height={avatarDims}/>
            <span className="feed-item__sent">{formattedSentDate}</span>
          </div>
          {this.getItemContent()}
        </div>
        <footer className="feed-item__footer">
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
      <span
        className="feed-item__likes"
        onClick={this.props.onPrimaryClicked}>
        {primaryValue} {primaryLabel}
      </span>
    );
  },

  getSecondaryContent(){
    const {secondaryLabel, secondaryValue} = this.props;
    if(!secondaryLabel){ return; }

    return (
      <button
        className="feed-item__comments"
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
          className="feed-item__body"
          dangerouslySetInnerHTML={{ __html: body.html }} />
      );
    }
    return (
      <section className="feed-item__body">
        {item.text}
      </section>
    );
  },

});
