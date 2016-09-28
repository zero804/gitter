import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import moment from 'moment';

export default React.createClass({

  displayName: 'FeedItem',
  propTypes: {
    children: React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    footerChildren: React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    item: PropTypes.shape({
      sent: PropTypes.string,
    }),
    primaryLabel: PropTypes.string,
    secondaryLabel: PropTypes.string,
    primaryValue: PropTypes.number,
    secondaryValue: PropTypes.number,
    onPrimaryClicked: PropTypes.func,
    onSecondaryClicked: PropTypes.func,
  },

  render(){

    const {item, children, footerChildren} = this.props;
    const {user} = item;
    const avatarDims = 30;
    const formattedSentDate = item.sent && moment(item.sent).format('MMM Do');

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
          {footerChildren}
        </footer>
        {children}
      </article>
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
