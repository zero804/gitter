import React, { PropTypes } from 'react';

import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';

export default React.createClass({

  displayName: 'FollowButton',

  propTypes: {
    className: PropTypes.string,
    groupUri: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onClick: PropTypes.func,
  },

  render() {
    const { className, subscriptionState, groupUri } = this.props;
    const unsubscribedText = `unwatch ${groupUri} topics`;
    const subscribedText = `watch ${groupUri} topics`;

    //When a user is already subscribed
    if(subscriptionState === SUBSCRIPTION_STATE_SUBSCRIBED) {
      return (
        <button
          className="follow-button--subscribed"
          onClick={this.onClick}>
          {unsubscribedText}
        </button>
      );
    }

    return (
      <button
        className="follow-button--unsubscribed"
        onClick={this.onClick}>
        {subscribedText}
      </button>
    )

  },

  onClick(e){
    e.preventDefault();
    const {onClick} = this.props;
    onClick();
  }

});
