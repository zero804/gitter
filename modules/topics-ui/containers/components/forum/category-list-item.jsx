"use strict";

import React from 'react';

export default React.createClass({
  displayName: 'CategoryListItem',
  propTypes: {
    category: React.PropTypes.string.isRequired,
    active: React.PropTypes.bool.isRequired,
    onClick: React.PropTypes.func.isRequired,
    groupName: React.PropTypes.string.isRequired
  },

  shouldComponentUpdate(nextProps) {
    return this.props.active !== nextProps.active;
  },

  render() {
    const { groupName, category, active } = this.props;
    const href = `/${groupName}/topics/categories/${category}`;
    const title = `${category} topics`;

    let className = 'category-list__item';
    if(active) { className = 'category-list__item--active'; }

    return (
      <a href={href} title={title} className={ className } onClick={this.onClick}>{ category }</a>
    );
  },

  onClick(e = { preventDefault: () => {}}) {
    e.preventDefault();
    const { onClick, category } = this.props;
    onClick(category);
  }

});
