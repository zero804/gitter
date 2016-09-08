import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';

export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    groupName: PropTypes.string.isRequired,
  },

  render(){

    const {groupName} = this.props;

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
            placeholder="🔍  search for topics, replies and comments"
            onChange={this.onSearchUpdate}
            className="topic-search__search-input"/>
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
