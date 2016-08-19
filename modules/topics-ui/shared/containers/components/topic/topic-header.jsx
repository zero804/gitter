import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicHeader',
  propTypes: {
    topic: PropTypes.shape({
      title: PropTypes.string,
      category: PropTypes.string,
      tags: PropTypes.array,
      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired
      }).isRequired,
    }).isRequired
  },

  render(){

    const { title, user, category, tags } = this.props.topic;
    const { displayName } = user;

    return (
      <Container className="container--topic-header">
        <Panel>
          <header>
            <section className="topic-header">
              <UserAvatar user={user} width={44} height={44}/>
              <div>
                <span className="topic-header__username">{displayName}</span>
                <H1 className="topic-header__title">{title}</H1>
              </div>
            </section>
            <section className="topic-header__control-row">
              <a className="topic-header__category-link" title="More {category} topics">{category.name}</a>
              <ul className="topic-header__tag-list">{tags.map((tag, i) => this.buildTagView(tag, i))}</ul>
            </section>
          </header>
        </Panel>
      </Container>
    );
  },

  buildTagView(tag, i){
    return <a className="topic-header__tag-link" href="#">{tag}</a>
  },

});
