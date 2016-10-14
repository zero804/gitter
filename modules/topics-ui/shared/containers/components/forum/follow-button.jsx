import React, { PropTypes } from 'react';

import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';

export default React.createClass({

  displayName: 'FollowButton',

  propTypes: {
    groupName: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onClick: PropTypes.func,
  },

  render() {
    const { subscriptionState, groupName } = this.props;

    let buttonText, className;

    if(subscriptionState === SUBSCRIPTION_STATE_SUBSCRIBED) {
      buttonText = `Unwatch ${groupName} topics`;
      className = "follow-button--subscribed"
    }
    else {
      buttonText = `Watch ${groupName} topics`;
      className = "follow-button--unsubscribed"
    }

    return (
      <button
        className={className}
        onClick={this.onClick}>
        {buttonText}
      </button>
    );

  },

  onClick(e){
    e.preventDefault();
    const {onClick} = this.props;
    onClick();
  }

});
