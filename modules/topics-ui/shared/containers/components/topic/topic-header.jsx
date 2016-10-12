import React, { PropTypes } from 'react';
import parseCategory from '../../../../shared/parse/category';
import parseCategoryForSelect from '../../../../shared/parse/category-for-select';
import { AVATAR_SIZE_LARGE } from '../../../constants/avatar-sizes';

import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import Input from '../forms/input.jsx';
import UserAvatar from '../user/user-avatar.jsx';
import ForumCategoryLink from '../links/forum-category-link.jsx';
import ForumTagLink from '../links/forum-tag-link.jsx';
import Select from '../forms/select.jsx';

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

    categories: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string,
    })).isRequired,
    onCategoryChange: PropTypes.func.isRequired,
    onTopicTitleEditUpdate: PropTypes.func.isRequired
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
              <div className="topic-header__info-wrapper">
                <span className="topic-header__username">{displayName}</span>
                {this.getTitleView()}
              </div>
            </section>
            <section className="topic-header__control-row">
              {this.buildCategoryView()}
              <ul className="topic-header__tag-list">{tags.map((tag, i) => this.buildTagView(tag, i))}</ul>
            </section>
          </header>
        </Panel>
      </Container>
    );
  },

  buildTagView(tag, index){
    const { groupUri } = this.props;
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

  buildCategoryView() {
   const { groupUri, topic, categories } = this.props;
   const { category, editedCategory, isEditing } = topic;

  let parsedCategory = parseCategory(category);
  if(editedCategory) {
    parsedCategory = parseCategory(editedCategory);
  }

   // Slice "All Tags" out of here for now
   const catOptionsForSelect = categories.slice(1).map(parseCategoryForSelect);

    let categoryControl = (
      <ForumCategoryLink
        className="topic-header__category-link"
        category={parsedCategory}
        groupUri={groupUri}>
        {category.name}
      </ForumCategoryLink>
    );
    if(isEditing) {
      categoryControl = (
        <Select
          options={catOptionsForSelect}
          className="select--topic-category"
          defaultValue={parsedCategory.id}
          onChange={this.onCategoryChange} />
      );
    }

    return categoryControl;
  },

  getTitleView() {
    const { topic } = this.props;
    const { title, editedTitle, isEditing, validationError } = topic;
    const errors = (validationError || new Map());
    const isTitleValid = errors.get('title') === undefined && errors.get('editedTitle') === undefined;

    let displayTitle = title;
    if(editedTitle || editedTitle === '') {
      displayTitle = editedTitle;
    }

    let headerTitle = (
      <H1 className="topic-header__title">
        {displayTitle}
      </H1>
    );
    if(isEditing) {
      headerTitle = (
        <Input
          className="topic-header__title-input"
          value={displayTitle}
          valid={isTitleValid}
          onChange={this.onTopicTitleEditUpdate} />
      );
    }

    return headerTitle;
  },

  onCategoryChange(categoryId) {
    const { onCategoryChange } = this.props;
    onCategoryChange(categoryId);
  },

  onTopicTitleEditUpdate(newValue) {
    const { onTopicTitleEditUpdate } = this.props;
    onTopicTitleEditUpdate(newValue);
  }

});
