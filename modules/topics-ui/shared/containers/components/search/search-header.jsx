import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import H1 from '../text/h-1.jsx';

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
              category={{ category: 'All', slug: 'all'}}>
                Topics
            </ForumCategoryLink>
          </H1>
        </Panel>
      </Container>
    );
  }

});
