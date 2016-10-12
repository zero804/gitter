import React, { PropTypes } from 'react';
import _ from 'lodash';
import classNames from 'classnames';

const Tooltip = React.createClass({

  displayName: 'Tooltip',
  propTypes: {
    tooltip: PropTypes.string,
    elementType: PropTypes.string,
    tooltipClassName: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      PropTypes.arrayOf(React.PropTypes.node),
      PropTypes.node
    ]),
  },

  getDefaultProps() {
    return {
      elementType: 'div',
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
    const { tooltip, elementType, tooltipClassName, children } = this.props;
    const restOfProps = _.omit(this.props, Object.keys(Tooltip.propTypes));
    const { prevTooltip } = this.state;

    const ElementType = elementType;
    const compiledTooltipClassName = classNames({
      [tooltipClassName]: true,
      //This active element actually HIDES the element
      //so the naming here is wrong
      active: tooltip && tooltip.length > 0
    });

    return (
      <ElementType {...restOfProps}>
        {children}
        <div className={compiledTooltipClassName}>
          {tooltip || prevTooltip}
        </div>
      </ElementType>
    );
  },

});


export default Tooltip;
