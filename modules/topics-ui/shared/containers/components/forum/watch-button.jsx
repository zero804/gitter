import React, { PropTypes } from 'react';

import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  SUBSCRIPTION_STATE_PENDING
} from '../../../constants/forum.js';

import SubscribeButton from './subscribe-button.jsx';

export default React.createClass({

  displayName: 'WwatchButton',

  propTypes: {
    className: PropTypes.string,
    itemClassName: PropTypes.string,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onClick: PropTypes.func,
    children: PropTypes.node
  },

  render() {
    const { className, itemClassName, onClick, subscriptionState, children } = this.props;

    return (
      <SubscribeButton
        className={ className }
        itemClassName={ itemClassName }
        onClick={onClick}
        subscriptionState={subscriptionState}
        subscribedText="Stop Watching"
        unsubscribedText="Watch"
        pendingText="...">
        {children}
        </SubscribeButton>
    );
  },

});
