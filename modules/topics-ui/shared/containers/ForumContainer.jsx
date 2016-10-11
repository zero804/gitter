import React, { PropTypes } from 'react';
import CategoryList from './components/forum/category-list.jsx';
import { dispatch } from '../dispatcher/index';
import navigateToCategory from '../action-creators/forum/navigate-to-category';

import ForumTableControl from './components/forum/table-control.jsx';
import TopicsTable from './components/forum/topics-table.jsx';
import SearchHeaderContainer from './components/search/SearchHeaderContainer.jsx';
import CreateTopicModal from './components/topic/create-topic-modal.jsx';

import navigateToFilter from '../action-creators/forum/navigate-to-filter';
import navigateToSort from '../action-creators/forum/navigate-to-sort';
import navigateToTag from '../action-creators/forum/navigate-to-tag';
import titleUpdate from '../action-creators/create-topic/title-update';
import bodyUpdate from '../action-creators/create-topic/body-update';
import submitNewTopic from '../action-creators/create-topic/submit-new-topic';
import navigateToTopic from '../action-creators/topic/navigate-to-topic';
import categoryUpdate from '../action-creators/create-topic/category-update';
import tagsUpdate from '../action-creators/create-topic/tags-update'

import * as forumCatConstants from '../constants/forum-categories';
import * as forumTagConstants from '../constants/forum-tags';
import * as forumFilterConstants from '../constants/forum-filters';
import * as forumSortConstants from '../constants/forum-sorts';
import * as navConstants from '../constants/navigation';
import * as consts from '../constants/create-topic';

const ForumContainer = React.createClass({
  displayName: 'ForumContainer',

  propTypes: {
    //Route parameters ---
    categoryName: PropTypes.string.isRequired,
    filterName: PropTypes.string,
    tagName: PropTypes.string,
    sortName: PropTypes.string,
    createTopic: PropTypes.bool.isRequired,

    //Client side only
    router: PropTypes.shape({
      on: PropTypes.func.isRequired,
      off: PropTypes.func.isRequired,
    }),

    //Group
    groupStore: PropTypes.shape({
      getGroupUri: PropTypes.func.isRequired,
      getGroupName: PropTypes.func.isRequired
    }).isRequired,

    //Forum
    forumStore: PropTypes.shape({
      getForumId: PropTypes.func.isRequired,
      getSubscriptionState: PropTypes.func.isRequired
    }).isRequired,

    currentUserStore: PropTypes.shape({
      getCurrentUser: PropTypes.func.isRequired,
      getIsSignedIn: PropTypes.func.isRequired,
    }).isRequired,

    //Categories ---
    categoryStore: PropTypes.shape({
      getCategories: PropTypes.func.isRequired
    }).isRequired,

    //Tags -----
    tagStore: PropTypes.shape({
      getTags: PropTypes.func.isRequired
    }).isRequired,

    //Topics
    topicsStore: PropTypes.shape({
      getTopics: PropTypes.func.isRequired
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
    const { forumStore, categoryStore, tagStore } = this.props;

    return {
      forumId: forumStore.getForumId(),
      forumSubscriptionState: forumStore.getSubscriptionState(),
      categoryName: this.props.categoryName,
      filterName: this.props.filterName,
      tagName: this.props.tagName,
      sortName: this.props.sortName,
      createTopic: this.props.createTopic,
      categories: categoryStore.getCategories(),
      tags: tagStore.getTags()
    };
  },

  componentDidMount(){
    const { forumStore, categoryStore, tagStore, router, topicsStore} = this.props;

    forumStore.onChange(this.onForumUpdate, this);
    topicsStore.onChange(this.onTopicsUpdate, this);
    topicsStore.on(consts.TOPIC_CREATED, this.onTopicCreated, this);

    categoryStore.on(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate);
    tagStore.on(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);

    router.on(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    router.on(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
    router.on('change:createTopic', this.onCreateTopicChange, this);
  },

  componentWillUnmount(){
    const { forumStore, categoryStore, tagStore, router, topicsStore} = this.props;

    forumStore.removeListeners(this.onForumUpdate, this);
    topicsStore.removeListeners(this.onTopicsUpdate, this);
    topicsStore.off(consts.TOPIC_CREATED, this.onTopicCreated, this);

    categoryStore.off(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate);
    tagStore.off(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);

    router.off(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    router.off(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
    router.off('change:createTopic', this.onCreateTopicChange, this);
  },

  render() {
    const {
      forumId,
      forumSubscriptionState,
      categoryName,
      tags,
      filterName,
      tagName,
      sortName,
      createTopic,
    } = this.state;

    const { groupStore, currentUserStore, categoryStore, tagStore, topicsStore } = this.props;

    const groupUri = groupStore.getGroupUri();
    const groupName = groupStore.getGroupName();
    const topics = topicsStore.getTopics();
    const newTopic = topicsStore.getDraftTopic();
    const currentUser = currentUserStore.getCurrentUser();
    const categories = categoryStore.getCategories();
    const tagValues = tagStore.pluckValues();

    return (
      <main className="scroller">
        <SearchHeaderContainer
          userId={currentUser.id}
          forumId={forumId}
          groupName={groupName}
          groupUri={groupUri}
          subscriptionState={forumSubscriptionState}/>
        <CategoryList
          groupUri={ groupUri }
          categories={ categories }/>

        <ForumTableControl
          groupUri={groupUri}
          categoryName={categoryName}
          filterName={filterName}
          tagName={tagName}
          sortName={sortName}
          tags={tags}
          filterChange={this.onFilterChange}
          sortChange={this.onSortChange}
          tagChange={this.onTagsChange}/>

        <TopicsTable topics={topics} groupUri={groupUri}/>

        <CreateTopicModal
          active={createTopic}
          newTopic={newTopic}
          categories={categoryStore.mapForSelectControl()}
          tagValues={tagValues}
          onTitleChange={this.onTitleChange}
          onBodyChange={this.onBodyChange}
          onCategoryChange={this.onCategoryChange}
          onTagsChange={this.onTopicTagsChange}
          onClose={this.onCreateTopicClose}
          onSubmit={this.onSubmit}/>

      </main>
    );
  },

  onCategoryClicked(category){ dispatch(navigateToCategory(category));},
  onFilterChange(filter){ dispatch(navigateToFilter(filter));},
  onSortChange(sort) { dispatch(navigateToSort(sort));},
  onTagsChange(tag){ dispatch(navigateToTag(tag));},
  onTitleChange(title){ dispatch(titleUpdate(title));},
  onBodyChange(body){ dispatch(bodyUpdate(body));},
  onCategoryChange(id) { dispatch(categoryUpdate(id));},
  onTopicTagsChange(tag, isAdding) { dispatch(tagsUpdate(tag, isAdding)); },

  onCreateTopicClose(){
    const {categoryStore} = this.props;
    dispatch(navigateToCategory(categoryStore.getActiveCategoryName()));
  },

  onSubmit(){
    dispatch(submitNewTopic());
  },

  onTopicCreated(topicId, slug){
    const {groupStore} = this.props;
    const groupUri = groupStore.getGroupUri();
    dispatch(navigateToTopic(groupUri, topicId, slug));
  },

  onForumUpdate() {
    const { forumStore } = this.props;
    this.setState((state) => Object.assign(state, {
      forumId: forumStore.getForumId(),
      forumSubscriptionState: forumStore.getSubscriptionState(),
    }));
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
    this.forceUpdate();
  }

});

export default ForumContainer;
