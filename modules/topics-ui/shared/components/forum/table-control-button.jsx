"use strict";

import React, { PropTypes } from 'react';

module.exports = React.createClass({

  displayName: 'TableControlButton',
  propTypes: {
    title: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    active: PropTypes.bool.isRequired,
    groupName: PropTypes.string.isRequired,
    category: PropTypes.string,
    onClick: PropTypes.func.isRequired,
  },

  render(){
    const { title, active, groupName, category, value } = this.props;
    const titleContent = `Filter current topics by ${title}`;

    const className = !!active ?
      'topic-control__button--active' :
      'topic-control__button';

    const href = !!category ?
      `/${groupName}/topics/categories/${category}?filter=${value}` :
      `/${groupName}/topics?filter=${value}`

    return (
      <a className={className} href={href} title={titleContent} onClick={this.onClick}>{title}</a>
    );
  },

  onClick(e = { preventDefault: () => {}}) {
    e.preventDefault();
    const { value, onClick } = this.props;
    onClick(value);
  }

})
