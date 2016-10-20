import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TableControlButton from './table-control-button.jsx';
import TableControlSelect from './table-control-select.jsx';
import * as navConstants from '../../../constants/navigation';
import * as forumSortConstants from '../../../constants/forum-sorts';
import * as forumFilterConstants from '../../../constants/forum-filters';

export default React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {
    //Route params
    groupUri: PropTypes.string.isRequired,
    categoryName: PropTypes.string.isRequired,
    filterName: PropTypes.string,
    tagName: PropTypes.string,
    sortName: PropTypes.string,

    tags: PropTypes.array.isRequired,
    //Event handles
    filterChange: PropTypes.func.isRequired,
    tagChange: PropTypes.func.isRequired,
    sortChange: PropTypes.func.isRequired,
  },

  getDefaultProps(){
    return {
      filterName: navConstants.DEFAULT_FILTER_NAME,
      tagName: navConstants.DEFAULT_TAG_NAME,
      sortName: navConstants.DEFAULT_SORT_NAME,
    }
  },

  getInitialState(){
    const { sortName } = this.props;
    return {
      sortBy: [
        { label: 'Most Recent', value: forumSortConstants.MOST_RECENT_SORT, active: (sortName === forumSortConstants.MOST_RECENT_SORT) },
        { label: 'Most Replies', value: forumSortConstants.MOST_REPLY_SORT, active: (sortName === forumSortConstants.MOST_REPLY_SORT) },
        { label: 'Most Likes', value: forumSortConstants.MOST_LIKES_SORT, active: (sortName === forumSortConstants.MOST_LIKES_SORT) },
      ]
    }
  },

  render(){
    const { groupUri, tags, sortChange, tagChange, filterName, tagName, sortName } = this.props;
    const { sortBy } = this.state;
    return (
      <Container className="container--table-control">
        <Panel className="panel--table-control">
          <nav>
            <ul className="table-control">
              <li>{this.getChildTableControlButton('Activity', navConstants.DEFAULT_FILTER_NAME, filterName === navConstants.DEFAULT_FILTER_NAME)}</li>
              <li className="tabel-control__divider">{this.getChildTableControlButton('My Topics', forumFilterConstants.FILTER_BY_TOPIC, filterName === forumFilterConstants.FILTER_BY_TOPIC)}</li>
              {/*<li className="tabel-control__divider">{this.getChildTableControlButton('Watched', forumFilterConstants.FILTER_BY_WATCHED, filterName === forumFilterConstants.FILTER_BY_WATCHED)}</li>*/}
              <li><TableControlSelect options={tags} onChange={(tag) => tagChange(tag)} /></li>
              <li><TableControlSelect options={sortBy} onChange={(sort) => sortChange(sort)} /></li>
            </ul>
          </nav>
        </Panel>
      </Container>
    );
  },

  getChildTableControlButton(title, value, active=false){
    const { groupUri, categoryName, filterChange } = this.props;
    return (
      <TableControlButton
        title={title}
        value={value}
        groupUri={groupUri}
        category={categoryName}
        active={active}
        onClick={(filter) => filterChange(filter)}/>
    );
  },
});
