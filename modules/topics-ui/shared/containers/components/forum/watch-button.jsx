import React, { PropTypes } from 'react';
import IconButton from '../buttons/icon-button.jsx';

import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  SUBSCRIPTION_STATE_PENDING
} from '../../../constants/forum.js';

import {ICONS_WATCH_SELECTED, ICONS_WATCH} from '../../../constants/icons';

export default React.createClass({

  displayName: 'WatchButton',

  propTypes: {
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onClick: PropTypes.func,
    children: PropTypes.node
  },

  render() {
    const { onClick, subscriptionState, children } = this.props;

    let type;
    if(subscriptionState === SUBSCRIPTION_STATE_SUBSCRIBED) {
      type = ICONS_WATCH_SELECTED;
    }
    else {
      type = ICONS_WATCH;
    }

    return (
      <IconButton
        onClick={onClick}
        type={type}>
        {children}
      </IconButton>
    );
  },

});
