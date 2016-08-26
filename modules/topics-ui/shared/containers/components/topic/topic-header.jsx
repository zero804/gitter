import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import UserAvatar from '../user/user-avatar.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import ForumTagLink from '../links/forum-tag-link.jsx';

export default React.createClass({

  displayName: 'TopicHeader',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    topic: PropTypes.shape({
      title: PropTypes.string,
      tags: PropTypes.array,
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

    const { category, groupName, topic } = this.props;
    const { title, user, tags } = topic;
    const { displayName } = user;

    return (
      <Container className="container--topic-header">
        <Panel>
          <header>
            <section className="topic-header">
              <UserAvatar className="topic-header__avatar" user={user} width={44} height={44}/>
              <div>
                <span className="topic-header__username">{displayName}</span>
                <H1 className="topic-header__title">{title}</H1>
              </div>
            </section>
            <section className="topic-header__control-row">
              <ForumCategoryLink
                className="topic-header__category-link"
                category={category}
                groupName={groupName}>
                  {category.category}
              </ForumCategoryLink>
              <ul className="topic-header__tag-list">{tags.map((tag, i) => this.buildTagView(tag, i))}</ul>
            </section>
          </header>
        </Panel>
      </Container>
    );
  },

  buildTagView(tag, index){
    const {groupName} = this.props;
    return (
      <li key={`topic-header-tag-link-${index}`}>
        <ForumTagLink
          groupName={groupName}
          tag={tag}
          className="topic-header__tag-link">
            {tag.name}
        </ForumTagLink>
      </li>
    );
  },

});
