import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Tooltip',
  propTypes: {
    tooltip: PropTypes.string,
    wrapperClassName: PropTypes.string,
    tooltipClassName: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      PropTypes.arrayOf(React.PropTypes.node),
      PropTypes.node
    ]),
  },

  getDefaultProps() {
    return {
      wrapperClassName: 'tooltip__wrapper',
      tooltipClassName: 'tooltip__overlay'
    };
  },

  getInitialState() {
    return {
      // We store the previous tooltip so we can transition to hidden
      // without a content change jump when they change to an empty string ''
      prevTooltip: ''
    };
  },

  componentWillReceiveProps() {
    const { tooltip } = this.props;
    this.setState({
      prevTooltip: tooltip
    })
  },

  render() {
    const { tooltip, wrapperClassName, tooltipClassName, children } = this.props;
    const { prevTooltip } = this.state;

    const compiledTooltipClassName = classNames({
      [tooltipClassName]: true,
      hidden: !tooltip || (tooltip && tooltip.length === 0)
    })

    return (
      <div className={wrapperClassName}>
        {children}
        <div className={compiledTooltipClassName}>
          {tooltip || prevTooltip}
        </div>
      </div>
    );
  },

});
