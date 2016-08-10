'use strict';

import React from 'react';
import raf from 'raf';
import {subscribe, unsubscribe, dispatch} from '../browser/js/dispatcher';

import CategoryList from '../shared/components/forum/category-list.jsx';
import ForumTableControl from '../shared/components/forum/table-control.jsx';
import CreateTopicModal from '../shared/components/topic/create-topic-modal.jsx';
import TopicsTable from '../shared/components/forum/topics-table.jsx';

import navigateToCategory from '../browser/js/action-creators/forum/navigate-to-category';
import navigateToFilter from '../browser/js/action-creators/forum/navigate-to-filter';
import navigateToSort from '../browser/js/action-creators/forum/navigate-to-sort';
import navigateToTag from '../browser/js/action-creators/forum/navigate-to-tag';

import forumCatConstants from '../browser/js/constants/forum-categories';
import forumTagConstants from '../browser/js/constants/forum-tags';
import forumFilterConstants from '../browser/js/constants/forum-filters';
import forumSortConstants from '../browser/js/constants/forum-sorts';
import navConstants from '../browser/js/constants/navigation';

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    //Route parameters ---
    groupName: React.PropTypes.string.isRequired,
    categoryName: React.PropTypes.string.isRequired,
    filterName: React.PropTypes.string,
    tagName: React.PropTypes.string,
    sortName: React.PropTypes.string,
    createTopic: React.PropTypes.bool,

    //Categories ---
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getCategories: React.PropTypes.func.isRequired
    }).isRequired,

    //Tags -----
    tagStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getTags: React.PropTypes.func.isRequired
    }).isRequired,

    //Topics
    topicsStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getTopics: React.PropTypes.func.isRequired
    }).isRequired,
  },

  getDefaultProps(){
    return {
      filterName: navConstants.DEFAULT_FILTER_NAME,
      tagName: navConstants.DEFAULT_TAG_NAME,
      sortName: navConstants.DEFAULT_SORT_NAME,
      createTopic: false,
    };
  },

  getInitialState(){
    const { categoryStore, tagStore, topicsStore } = this.props;
    return {
      categoryName: this.props.categoryName,
      filterName: this.props.filterName,
      tagName: this.props.tagName,
      sortName: this.props.sortName,
      createTopic: this.props.createTopic,
      categories: categoryStore.getCategories(),
      tags: tagStore.getTags(),
      topics: topicsStore.getTopics(),
    };
  },

  componentDidMount(){
    const { categoryStore } = this.props;
    subscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
    subscribe(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);
    subscribe(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    subscribe(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
  },

  componentWillUnmount(){
    unsubscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
    unsubscribe(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);
    unsubscribe(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    unsubscribe(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
  },

  render() {
    const { categories, categoryName, tags, filterName, tagName, sortName, createTopic, topics } = this.state;
    const { groupName } = this.props;
    return (
      <main>
        <CategoryList
          groupName={ groupName }
          categories={ categories }
          //Change this attribute name to categoryChange
          onCategoryClicked={ this.onCategoryClicked } />

        <ForumTableControl
          groupName={groupName}
          categoryName={categoryName}
          filterName={filterName}
          tagName={tagName}
          sortName={sortName}
          tags={tags}
          filterChange={this.onFilterChange}
          sortChange={this.onSortChange}
          tagChange={this.onTagChange}/>

        <TopicsTable topics={topics}/>

        <CreateTopicModal active={createTopic} />
      </main>
    );
  },

  onCategoryClicked(category){
    dispatch(navigateToCategory(category));
  },

  onFilterChange(filter){
    dispatch(navigateToFilter(filter));
  },

  onSortChange(sort) {
    dispatch(navigateToSort(sort));
  },

  onTagChange(tag){
    dispatch(navigateToTag(tag));
  },

  onCategoryUpdate(){
    const { categoryStore } = this.props;
    raf(() => this.setState((state) => _.extend(state, {
      categories: categoryStore.getCategories(),
      categoryName: categoryStore.getActiveCategoryName(),
    })));
  },

  onTagUpdate(){
    const { tagStore } = this.props;
    raf(() => this.setState((state) => Object.assign(state, {
      tags: tagStore.getTags(),
      tagName: tagStore.getActiveTagName(),
    })));
  },

  onFilterUpdate(data){
    raf(() => this.setState((state) => Object.assign(state, {
      filterName: data.filter,
    })));
  },

  onSortUpdate(data) {
    raf(() => this.setState((state) => Object.assign(state, {
      sortName: data.sort,
    })));
  },

});
