import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isNil, map, max, isFunction, get } from 'lodash';

import { addTranslatePREFIX } from '../utils/dom';

export default class ToolTip extends Component {
  static propTypes = {
    position: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    active: PropTypes.bool,
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    points: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })
    ),
    moveDuration: PropTypes.number,
    moveTiming: PropTypes.string,
    moveBox: PropTypes.object,
    formatter: PropTypes.shape({
      label: PropTypes.func,
      name: PropTypes.func,
      value: PropTypes.func,
    }),
  };

  static defaultProps = {
    position: {
      x: -1000,
      y: -1000,
    },
    active: false,
    label: '',
    moveDuration: 400,
    moveTiming: 'ease',
    points: null,
    moveBox: null,
    formatter: null,
  };

  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
  }

  renderContent = () => {
    const { points } = this.props;
    const formatterName = get(this.props, ['formatter', 'name']);
    const formatterValue = get(this.props, ['formatter', 'value']);
    const ulStyle = { padding: 0, margin: 0 };
    const liStyle = {
      display: 'block',
      padding: '2px',
      fontSize: '14px',
    };
    const colorIconStyle = {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      marginRight: '5px',
    };
    if (!isNil(points) && !!points.length) {
      const tooltipLists = map(points, (point, index) => {
        const { value, name, color } = point;
        colorIconStyle.backgroundColor = color;
        return (
          <li
            className="tendency-tooltip-li"
            key={`tendency-tooltip-li-${index}`}
            style={{ ...liStyle }}
          >
            <span
              className="tendency-tooltip-li-color"
              style={{ ...colorIconStyle }}
            />
            <span className="tendency-tooltip-li-name">
              {isFunction(formatterName) ? formatterName(name) : name || index}
            </span>
            <span className="tendency-tooltip-li-separator"> : </span>
            <span className="tendency-tooltip-li-value">
              {isFunction(formatterValue) ? formatterValue(value) : value}
            </span>
          </li>
        );
      });
      return (
        <ul className="tendency-tooltip-ul" style={{ ...ulStyle }}>
          {tooltipLists}
        </ul>
      );
    }
    return null;
  };

  /**
   * 获取tooltip宽高
   */
  getWrapperSize = () => {
    const wrapper = this.wrapperRef.current;
    if (!isNil(wrapper)) {
      const rect = wrapper.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
      };
    }
    return {
      width: -1,
      height: -1,
    };
  };

  /**
   * 计算translate值
   * @param {object} position
   * @param {object} moveBox
   * @param {string} direction
   */
  getTranslate = (position, moveBox, direction) => {
    const offset = 10;
    const wrapperSize = this.getWrapperSize();
    const { top, left, width, height } = moveBox;

    let boundary = 0;
    let tooltipBoundary = 0;
    let positionWhenBeyondBoundary = 0;
    let moveBoxBoundary = 0;
    let tooltipCoordinate = 0;

    if (direction === 'x') {
      tooltipCoordinate = position.x + offset;

      boundary = left + width;
      tooltipBoundary = position.x + wrapperSize.width + offset;
      positionWhenBeyondBoundary = position.x - offset - wrapperSize.width;
      moveBoxBoundary = left;
    } else if (direction === 'y') {
      tooltipCoordinate = position.y + offset;

      boundary = top + height;
      tooltipBoundary = position.y + wrapperSize.height + offset;
      positionWhenBeyondBoundary = position.y - offset - wrapperSize.height;
      moveBoxBoundary = top;
    }

    if (tooltipBoundary > boundary) {
      return max([positionWhenBeyondBoundary, moveBoxBoundary]);
    }

    return tooltipCoordinate;
  };

  render() {
    const {
      position,
      active,
      label,
      moveDuration,
      moveTiming,
      moveBox,
    } = this.props;

    const formatterLabel = get(this.props, ['formatter', 'label'], null);

    const labelStyle = {
      padding: 0,
      marginTop: 0,
      marginBottom: '10px',
    };
    let wrapperStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      padding: '5px',
      width: 'auto',
      height: 'auto',
      borderRadius: '5px',
      color: '#ffffff',
      backgroundColor: '#676363',
      opacity: 0.9,
    };
    const visibility = active ? 'visible' : 'hidden';

    const translateX = this.getTranslate(position, moveBox, 'x');
    const translateY = this.getTranslate(position, moveBox, 'y');

    const transformStyle = addTranslatePREFIX(
      'transform',
      `translate(${translateX}px, ${translateY}px)`
    );
    const transitionStyle = addTranslatePREFIX(
      'transition',
      `transform ${moveDuration}ms ${moveTiming}`
    );

    wrapperStyle = {
      ...wrapperStyle,
      visibility,
      ...transformStyle,
      ...transitionStyle,
    };

    return (
      <div
        style={{ ...wrapperStyle }}
        className="tendency-tooltip-wrapper"
        ref={this.wrapperRef}
      >
        <p className="tendency-tooltip-label" style={{ ...labelStyle }}>
          {isFunction(formatterLabel) ? formatterLabel(label) : label}
        </p>
        {this.renderContent()}
      </div>
    );
  }
}
