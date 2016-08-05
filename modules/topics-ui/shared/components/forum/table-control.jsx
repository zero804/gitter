"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TableControlButton from './table-control-button.jsx';
import TableControlSelect from './table-control-select.jsx';

module.exports = React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    sortBy: PropTypes.array,
    tags: PropTypes.array.isRequired,
    filterChange: PropTypes.func.isRequired,
    tagChange: PropTypes.func.isRequired,
    sortChange: PropTypes.func.isRequired,
  },

  getDefaultProps(){
    return {
      sortBy: [
        { name: 'Most Recent', value: 'most-recent', selected: true },
        { name: 'Most Replies', value: 'most-replies' },
        { name: 'Most Watchers', value: 'most-watchers' },
        { name: 'Most Likes', value: 'most-likes' },
      ]
    }
  },

  render(){

    const { groupName, category, sortBy, tags, sortChange, tagChange } = this.props;

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

  getChildTableControlButton(title, value){
    const { groupName, category, filterChange } = this.props;
    return (
      <TableControlButton
        title={title}
        value={value}
        groupName={groupName}
        category={category}
        active={false}
        onClick={(filter) => filterChange(filter)}/>
    );
  },

  onSortChange(sort){
    const { sortChange } = this.props;
    sortChange(sort);
  },

  onTagChange(tag) {
    const { tagChange } = this.props;
    tagChange(tag);
  }

});
