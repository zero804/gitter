"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TableControlButton from './table-control-button.jsx';
import TableControlSelect from './table-control-select.jsx';

module.exports = React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {
    //Route params
    groupName: PropTypes.string.isRequired,
    categoryName: PropTypes.string.isRequired,
    filterName: PropTypes.string,
    tagName: PropTypes.string,
    sortName: PropTypes.string,

    //Collections
    sortBy: PropTypes.array,
    tags: PropTypes.array.isRequired,
    //Event handles
    filterChange: PropTypes.func.isRequired,
    tagChange: PropTypes.func.isRequired,
    sortChange: PropTypes.func.isRequired,
  },

  getDefaultProps(){
    return {
      filterName: 'none',
      tagName: 'all-tags',
      sortName: 'none',
      sortBy: [
        { name: 'Most Recent', value: 'most-recent', selected: true },
        { name: 'Most Replies', value: 'most-replies' },
        { name: 'Most Watchers', value: 'most-watchers' },
        { name: 'Most Likes', value: 'most-likes' },
      ]
    }
  },

  render(){

    const { groupName, sortBy, tags, sortChange, tagChange } = this.props;

    return (
      <Container className="container--table-control">
        <Panel className="panel--table-control">
          <nav>
            <ul className="table-control">
              <li>{this.getChildTableControlButton('Activity', 'activity')}</li>
              <li>{this.getChildTableControlButton('My Topics', 'my-topics')}</li>
              <li className="tabel-control__divider">{this.getChildTableControlButton('Watched', 'watched')}</li>
              <li><TableControlSelect options={tags} onChange={(tag) => tagChange(tag)} /></li>
              <li><TableControlSelect options={sortBy} onChange={(sort) => sortChange(sort)} /></li>
            </ul>
          </nav>
        </Panel>
      </Container>
    );
  },

  getChildTableControlButton(title, value, active=false){
    const { groupName, categoryName, filterChange } = this.props;
    return (
      <TableControlButton
        title={title}
        value={value}
        groupName={groupName}
        category={categoryName}
        active={active}
        onClick={(filter) => filterChange(filter)}/>
    );
  },
});
