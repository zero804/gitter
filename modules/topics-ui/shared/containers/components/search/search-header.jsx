import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import FollowButton from '../forum/follow-button.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';
import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';


export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onSubscribeButtonClick: PropTypes.func.isRequired
  },

  render(){
    const {groupUri, subscriptionState, onSubscribeButtonClick} = this.props;

    return (
      <Container>
        <Panel className="panel--topic-search">
          <H1>
            <ForumCategoryLink
              className="topic-search__all-topics-link"
              groupUri={groupUri}
              category={{ category: 'All', slug: DEFAULT_CATEGORY_NAME}}>
                Topics
            </ForumCategoryLink>
          </H1>
          <Input
            name="Search Topics"
            placeholder="Search for topics, replies and comments"
            onChange={this.onSearchUpdate}
            className="topic-search__search-input"/>

          <FollowButton
            subscriptionState={subscriptionState}
            className="topic-search__watch-forum-button"
            itemClassName="topic-search__watch-forum-button-text-item"
            onClick={onSubscribeButtonClick}/>
          <CreateTopicLink
            groupUri={groupUri}
            className="topic-search__create-topic-link">
            Create Topic
          </CreateTopicLink>
        </Panel>
      </Container>
    );
  },

  onSearchUpdate(){

  },

});
