import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import UserAvatar from '../user/user-avatar.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import ForumTagLink from '../links/forum-tag-link.jsx';
import {AVATAR_SIZE_LARGE} from '../../../constants/avatar-sizes';

export default React.createClass({

  displayName: 'TopicHeader',
  propTypes: {
    groupUri: PropTypes.string.isRequired,

    tags: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })).isRequired,

    topic: PropTypes.shape({
      title: PropTypes.string,
      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired
      }).isRequired,
    }).isRequired,

    category: PropTypes.shape({
      category: PropTypes.string.isRequired,
    }).isRequired,
  },

  render(){

    const { category, groupUri, topic, tags } = this.props;
    const { title, user } = topic;
    const { displayName } = user;
    return (
      <Container className="container--topic-header">
        <Panel>
          <header>
            <section className="topic-header">
            <UserAvatar
              className="topic-header__avatar"
              user={user}
              size={AVATAR_SIZE_LARGE} />
              <div>
                <span className="topic-header__username">{displayName}</span>
                <H1 className="topic-header__title">{title}</H1>
              </div>
            </section>
            <section className="topic-header__control-row">
              <ForumCategoryLink
                className="topic-header__category-link"
                category={category}
                groupUri={groupUri}>{category.category}</ForumCategoryLink>
              <ul className="topic-header__tag-list">{tags.map((tag, i) => this.buildTagView(tag, i))}</ul>
            </section>
          </header>
        </Panel>
      </Container>
    );
  },

  buildTagView(tag, index){
    const {groupUri} = this.props;
    return (
      <li key={`topic-header-tag-link-${index}`}>
        <ForumTagLink
          groupUri={groupUri}
          tag={tag}
          className="topic-header__tag-link">
            {tag.label}
        </ForumTagLink>
      </li>
    );
  },

});
