import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';


export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    groupName: PropTypes.string,
    groupAvatarUrl: PropTypes.string,
  },

  render(){
    const {groupUri, groupName, groupAvatarUrl } = this.props;

    return (
      <Container className="container--search">
        <Panel className="panel--topic-search">
          <img
            src={groupAvatarUrl}
            width="36"
            height="36"
            className="topics-search__avatar" />
          <H1 className="topic-search__heading">
            <ForumCategoryLink
              className="topic-search__all-topics-link"
              groupUri={groupUri}
              category={{ category: 'All', slug: DEFAULT_CATEGORY_NAME}}>
                {groupName} Topics
                <div className="topic-search__beta-decoration">
                  Beta
                </div>
            </ForumCategoryLink>
          </H1>
          <Input
            name="Search Topics"
            placeholder="Search for topics, replies and comments"
            onChange={this.onSearchUpdate}
            className="topic-search__search-input"/>

          <CreateTopicLink
            groupUri={groupUri}
            className="topic-search__create-topic-link">
            <span className="hide-only-small">Create Topic</span>
            <span className="only-small">+</span>
          </CreateTopicLink>
        </Panel>
      </Container>
    );
  },

  onSearchUpdate(){

  },

});
