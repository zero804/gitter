import React, { PropTypes } from 'react';
import classNames from 'classnames';
import {
  ICONS_LIKE,
  ICONS_LIKE_SELECTED,
  ICONS_COMMENT,
  ICONS_EDIT,
  ICONS_WATCH,
  ICONS_WATCH_SELECTED,
} from '../../../constants/icons';

export default React.createClass({

  displayName: 'IconButton',
  propTypes: {
    children: PropTypes.node,
    type: PropTypes.oneOf([
      ICONS_LIKE,
      ICONS_LIKE_SELECTED,
      ICONS_COMMENT,
      ICONS_EDIT,
      ICONS_WATCH,
      ICONS_WATCH_SELECTED,
    ]),
    className: PropTypes.string,
    onClick: PropTypes.func,
  },

  render(){
    const {children, type, onClick, className} = this.props;

    let iconClassName;
    if(type === ICONS_LIKE) { iconClassName = 'icon-button-like'; }
    else if(type === ICONS_LIKE_SELECTED) { iconClassName = 'icon-button-like-selected'; }
    else if (type === ICONS_COMMENT) { iconClassName = 'icon-button-comment'}
    else if (type === ICONS_EDIT) { iconClassName = 'icon-button-edit'}
    else if (type === ICONS_WATCH) { iconClassName = 'icon-button-watch'}
    else if (type === ICONS_WATCH_SELECTED) { iconClassName = 'icon-button-watch-selected'}

    const compiledClassName = classNames(className, iconClassName);

    return (
      <button
        onClick={onClick}
        className={compiledClassName}>
        {children}
      </button>
    );
  }

});
