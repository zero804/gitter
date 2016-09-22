import _ from 'underscore';
import React, { PropTypes } from 'react';
import classNames from 'classnames';

import { FORUM_WATCH_STATE } from '../../../constants/forum.js';


export default React.createClass({

  displayName: 'WatchForumButton',

  propTypes: {
    children: PropTypes.node,
    onClick: PropTypes.func,
    className: PropTypes.string,
    itemClassName: PropTypes.string,
    href: PropTypes.string,
    watchState: PropTypes.oneOf(_.values(FORUM_WATCH_STATE))
  },

  render() {
    const {children, className, href, itemClassName, watchState} = this.props;

    var compiledClassNames = className + ' ' + classNames({
      pending: watchState === FORUM_WATCH_STATE.PENDING
    })

    var unfollowCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: watchState !== FORUM_WATCH_STATE.WATCHING
    });

    var followCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: watchState !== FORUM_WATCH_STATE.NOT_WATCHING
    });

    var pendingCompiledClassNames = classNames({
      [itemClassName]: true,
      hidden: watchState !== FORUM_WATCH_STATE.PENDING
    });

    var watchNodes = [
      <span
        key="unfollow"
        className={unfollowCompiledClassNames}>
        Unfollow
      </span>,
      <span
        key="follow"
        className={followCompiledClassNames}>
        Follow
      </span>,
      <span
        key="pending"
        className={pendingCompiledClassNames}>
        ...
      </span>
    ];

    return (
      <button
        href={href}
        className={compiledClassNames}
        onClick={this.onClick}>
        {children || watchNodes}
      </button>
    );
  },


  onClick(e){
    e.preventDefault();
    const {onClick} = this.props;
    if(onClick) { return onClick(...arguments); }
  }

});
