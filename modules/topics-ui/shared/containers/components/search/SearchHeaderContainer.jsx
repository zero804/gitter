import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import Container from '../container.jsx';
import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';
import requestUpdateForumSubscriptionState from '../../../action-creators/forum/request-update-forum-subscription-state';

import SearchHeader from './search-header.jsx';

export default React.createClass({

  displayName: 'SearchHeaderContainer',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired
  },

  render(){
    const {groupUri, subscriptionState } = this.props;

    return (
      <SearchHeader
        groupUri={groupUri}
        subscriptionState={subscriptionState}
        onSubscribeButtonClick={this.onSubscribeButtonClick}/>
    );
  },


  onSubscribeButtonClick() {
    const {subscriptionState} = this.props;

    const desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);
    dispatch(requestUpdateForumSubscriptionState(desiredIsSubscribed));
  }

});
