import _ from 'underscore';
import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import WatchForumButton from '../forum/watch-forum-button.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';
import { FORUM_WATCH_STATE } from '../../../constants/forum.js';
import attemptUpdateForumWatchState from '../../../action-creators/forum/attempt-update-forum-watch-state';


export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    userId: PropTypes.string.isRequired,
    forumId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,
    watchState: PropTypes.oneOf(_.values(FORUM_WATCH_STATE))
  },

  render(){
    const {groupName, watchState} = this.props;

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

          <WatchForumButton
            watchState={watchState}
            className="topic-search__watch-forum-button"
            itemClassName="topic-search__watch-forum-button-text-item"
            onClick={this.onWatchForumButtonClick}/>
          <CreateTopicLink groupName={groupName} className="topic-search__create-topic-link">
            Create Topic
          </CreateTopicLink>
        </Panel>
      </Container>
    );
  },

  onSearchUpdate(){

  },

  onWatchForumButtonClick() {
    const {userId, forumId, watchState} = this.props;

    var desiredIsWatching = (watchState !== FORUM_WATCH_STATE.WATCHING);
    dispatch(attemptUpdateForumWatchState(forumId, userId, desiredIsWatching));
  }

});
