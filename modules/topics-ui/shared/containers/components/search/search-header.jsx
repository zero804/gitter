import _ from 'underscore';
import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import WatchForumLink from '../links/watch-forum-link.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';
import { FORUM_WATCH_STATE } from '../../../constants/forum.js';

export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    forumId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,
    watchState: PropTypes.oneOf(_.values(FORUM_WATCH_STATE))
  },

  render(){

    const {forumId, groupName, watchState} = this.props;

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

          <WatchForumLink
            forumId={forumId}
            watchState={watchState}
            className="topic-search__watch-forum-link"
            itemClassName="topic-search__watch-forum-link-text-item"/>
          <CreateTopicLink groupName={groupName} className="topic-search__create-topic-link">
            Create Topic
          </CreateTopicLink>
        </Panel>
      </Container>
    );
  },

  onSearchUpdate(){

  }

});
