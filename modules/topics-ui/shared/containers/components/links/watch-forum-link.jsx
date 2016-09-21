import _ from 'underscore';
import React, { PropTypes } from 'react';
import classNames from 'classnames';
import {dispatch} from '../../../dispatcher';

import attemptUpdateForumWatchState from '../../../action-creators/forum/attempt-update-forum-watch-state';
import { FORUM_WATCH_STATE } from '../../../constants/forum.js';


export default React.createClass({

  displayName: 'WatchForumLink',

  propTypes: {
    forumId: PropTypes.string.isRequired,
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

    var watchNodes = [
      <span
        key="unfollow"
        className={classNames({
          [itemClassName]: true,
          hidden: watchState !== FORUM_WATCH_STATE.WATCHING
        })}>
        Unfollow
      </span>,
      <span
        key="follow"
        className={classNames({
          [itemClassName]: true,
          hidden: watchState !== FORUM_WATCH_STATE.NOT_WATCHING
        })}>
        Follow
      </span>,
      <span
        key="pending"
        className={classNames({
          [itemClassName]: true,
          hidden: watchState !== FORUM_WATCH_STATE.PENDING
        })}>
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
    const {forumId, onClick, watchState} = this.props;
    if(onClick) { return onClick(...arguments); }

    var desiredIsWatching = (watchState !== FORUM_WATCH_STATE.WATCHING);
    dispatch(attemptUpdateForumWatchState(forumId, desiredIsWatching));
  }

});
