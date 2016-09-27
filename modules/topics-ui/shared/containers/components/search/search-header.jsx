import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import CreateTopicLink from '../links/create-topic-link.jsx';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';
import requestSignIn from '../../../action-creators/forum/request-sign-in';

const CREATE_TOPIC_LINK_SOURCE = 'topics-header-create-topic-link';

export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    isSignedIn: PropTypes.bool
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
            placeholder="Search for topics, replies and comments"
            onChange={this.onSearchUpdate}
            className="topic-search__search-input"/>
          <CreateTopicLink
            groupName={groupName}
            className="topic-search__create-topic-link">
            Create Topic
          </CreateTopicLink>
        </Panel>
      </Container>
    );
  },

  onSearchUpdate(){

  },

  onCreateTopicSignInLinkClick(e) {
    //requestSignIn(CREATE_TOPIC_LINK_SOURCE);
    e.preventDefault();
  }

});
