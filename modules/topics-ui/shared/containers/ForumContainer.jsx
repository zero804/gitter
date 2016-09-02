import React from 'react';
import CategoryList from './components/forum/category-list.jsx';
import { dispatch } from '../dispatcher/index';
import navigateToCategory from '../action-creators/forum/navigate-to-category';

import CreateTopicContainer from './CreateTopicContainer.jsx';
import ForumTableControl from './components/forum/table-control.jsx';
import TopicsTable from './components/forum/topics-table.jsx';
import SearchHeader from './components/search/search-header.jsx';

import navigateToFilter from '../action-creators/forum/navigate-to-filter';
import navigateToSort from '../action-creators/forum/navigate-to-sort';
import navigateToTag from '../action-creators/forum/navigate-to-tag';

import * as forumCatConstants from '../constants/forum-categories';
import * as forumTagConstants from '../constants/forum-tags';
import * as forumFilterConstants from '../constants/forum-filters';
import * as forumSortConstants from '../constants/forum-sorts';
import * as navConstants from '../constants/navigation';

export default React.createClass({
  displayName: 'ForumContainer',

  propTypes: {
    //Route parameters ---
    groupName: React.PropTypes.string.isRequired,
    categoryName: React.PropTypes.string.isRequired,
    filterName: React.PropTypes.string,
    tagName: React.PropTypes.string,
    sortName: React.PropTypes.string,
    createTopic: React.PropTypes.bool.isRequired,

    //Client side only
    router: React.PropTypes.shape({
      on: React.PropTypes.func.isRequired,
      off: React.PropTypes.func.isRequired,
    }),

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

    //New Topic
    newTopicStore: React.PropTypes.shape({
      get: React.PropTypes.func.isRequired,
    }).isRequired,
  },

  getDefaultProps(){
    return {
      filterName: navConstants.DEFAULT_FILTER_NAME,
      tagName: navConstants.DEFAULT_TAG_NAME,
      sortName: navConstants.DEFAULT_SORT_NAME
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
    const { categoryStore, tagStore, router, topicsStore } = this.props;
    topicsStore.onChange(this.onTopicsUpdate, this);
    categoryStore.on(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate);
    tagStore.on(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);
    router.on(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    router.on(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
    router.on('change:createTopic', this.onCreateTopicChange, this);
  },

  componentWillUnmount(){
    const { categoryStore, tagStore, router, topicsStore } = this.props;
    topicsStore.removeListeners();
    categoryStore.off(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate);
    tagStore.off(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);
    router.off(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    router.off(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
    router.off('change:createTopic', this.onCreateTopicChange, this);
  },

  render() {
    const { categories, categoryName, tags, filterName, tagName, sortName, createTopic, topics } = this.state;
    const { groupName, newTopicStore, topicsStore } = this.props;
    return (
      <main>
        <SearchHeader groupName={groupName}/>
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

        <TopicsTable topics={topics} groupName={groupName}/>

        <CreateTopicContainer
          groupName={groupName}
          active={createTopic}
          newTopicStore={newTopicStore}
          topicsStore={topicsStore}/>
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
    this.setState((state) => Object.assign(state, {
      categories: categoryStore.getCategories(),
      categoryName: categoryStore.getActiveCategoryName(),
    }));
  },

  onTagUpdate(){
    const { tagStore } = this.props;
    this.setState((state) => Object.assign(state, {
      tags: tagStore.getTags(),
      tagName: tagStore.getActiveTagName(),
    }));
  },

  onFilterUpdate(data){
    this.setState((state) => Object.assign(state, {
      filterName: data.filter,
    }));
  },

  onSortUpdate(data) {
    this.setState((state) => Object.assign(state, {
      sortName: data.sort,
    }));
  },

  onCreateTopicChange(){
    const {router} = this.props;
    this.setState((state) => Object.assign(state, {
      createTopic: router.get('createTopic')
    }));
  },

  onTopicsUpdate(){
    const {topicsStore} = this.props;
    this.setState((state) => Object.assign(state, {
      topics: topicsStore.getTopics(),
    }))
  }

});
