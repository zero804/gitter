import React, { PropTypes } from 'react';

import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';
import SubscribeButton from './subscribe-button.jsx';



export default React.createClass({

  displayName: 'FollowButton',

  propTypes: {
    className: PropTypes.string,
    itemClassName: PropTypes.string,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onClick: PropTypes.func,
  },

  render() {
    const { className, itemClassName, onClick, subscriptionState } = this.props;

    return (
      <SubscribeButton
        className={ className }
        itemClassName={ itemClassName }
        onClick={onClick}
        subscriptionState={subscriptionState}
        subscribedText="Unfollow"
        unsubscribedText="Follow"
        pendingText="..."/>
    );
  },

});
