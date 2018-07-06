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
    const {
      groupUri,
      groupName,
      groupAvatarUrl,
      deprecatedBlogUrl
    } = this.props;

    return (
      <Container className="container--search">
        <Panel className="panel--topic-search">
          <H1 className="topic-search__heading">
            <img
              src={groupAvatarUrl}
              width="36"
              height="36"
              className="topics-search__avatar" />
            <ForumCategoryLink
              className="topic-search__all-topics-link"
              groupUri={groupUri}
              category={{ category: 'All', slug: DEFAULT_CATEGORY_NAME}}>
                {groupName} Topics
            </ForumCategoryLink>
            <a
              className="topic-search__deprecated-decoration"
              href={deprecatedBlogUrl}
              target="_blank"
            >
              Deprecated
            </a>
          </H1>

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

});
