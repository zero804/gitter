import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import SubscribeButton from '../forum/subscribe-button.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';
import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';
import requestUpdateForumSubscriptionState from '../../../action-creators/forum/request-update-forum-subscription-state';


export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    userId: PropTypes.string.isRequired,
    forumId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired
  },

  render(){
    const {groupName, subscriptionState} = this.props;

    return (
      <Container>
        <Panel className="panel--topic-search">
          <H1>
            <ForumCategoryLink
              className="topic-search__all-topics-link"
              groupName={groupName}
              category={{ category: 'All', slug: DEFAULT_CATEGORY_NAME}}>
                Topics
            </ForumCategoryLink>
          </H1>
          <Input
            name="Search Topics"
            placeholder="Search for topics, replies and comments"
            onChange={this.onSearchUpdate}
            className="topic-search__search-input"/>

          <SubscribeButton
            subscriptionState={subscriptionState}
            className="topic-search__watch-forum-button"
            itemClassName="topic-search__watch-forum-button-text-item"
            subscribedText="Unfollow"
            unsubscribedText="Follow"
            pendingText="..."
            onClick={this.onSubscribeButtonClick}/>
          <CreateTopicLink groupName={groupName} className="topic-search__create-topic-link">
            Create Topic
          </CreateTopicLink>
        </Panel>
      </Container>
    );
  },

  onSearchUpdate(){

  },

  onSubscribeButtonClick() {
    const {userId, forumId, subscriptionState} = this.props;

    var desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);
    dispatch(requestUpdateForumSubscriptionState(forumId, userId, desiredIsSubscribed));
  }

});
