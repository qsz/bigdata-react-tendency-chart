import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import * as d3Scale from 'd3-scale';
import * as d3Axis from 'd3-axis';
import * as d3Selection from 'd3-selection';
import { isNil, merge, get, isNaN, map } from 'lodash';

import Line from './Line';
import { getTickStep } from '../utils/axis';

export default class YAxis extends PureComponent {
  static propTypes = {
    axis: PropTypes.shape({
      axisObj: PropTypes.func,
      axisG: PropTypes.func,
      scale: PropTypes.func,
      domain: PropTypes.array,
      x: PropTypes.number,
      y: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
      ticks: PropTypes.number,

      axisProps: PropTypes.shape({
        tickNumber: PropTypes.number, // y轴刻度的数量建议值
        axisLine: PropTypes.shape({
          // 坐标轴条和刻度相关属性
          tickStrokeWidth: PropTypes.number, // 刻度线宽度
          tickSize: PropTypes.number, // 内侧和外侧刻度的大小
          tickPadding: PropTypes.number, // 刻度和刻度文本之间的间距
        }),
        splitLine: PropTypes.shape({
          // 网格
          show: PropTypes.bool, // 是否显示
          interval: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // 间隔
          strokeWidth: PropTypes.number, // 线段宽度
          strokeColor: PropTypes.string, // 线段颜色
        }),
      }),
    }),

    offset: PropTypes.shape({
      top: PropTypes.number,
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
    }),
  };

  static defaultProps = {
    axis: null,
    offset: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
    },
  };

  /**
   * 获取y轴信息
   * @param {object} offset
   * @param {array} domain [minY, maxY]
   * @param {object} axisProps 相关属性
   */
  static getAxisInfo(offset, domain, axisProps) {
    const { height, left, top } = offset;
    const yAxisProps = axisProps;

    const tickSize = get(yAxisProps, ['axisLine', 'tickSize']);
    const tickPadding = get(yAxisProps, ['axisLine', 'tickPadding']);
    const ticks = get(yAxisProps, ['tickNumber']);

    const scale = d3Scale
      .scaleLinear()
      .domain(domain)
      .range([height + top, top]);

    const axisObj = d3Axis
      .axisLeft()
      .scale(scale)
      .tickSize(tickSize)
      .tickPadding(tickPadding)
      .ticks(ticks);
    const axis = {
      axisObj,
      axisG: (axisRef) => {
        return isNil(axisRef) ? null : axisRef.current;
      },
      scale,
      domain,
      x: left,
      y: 0,
      width: left,
      height,
      ticks,
      axisProps: yAxisProps,
    };

    return axis;
  }

  /**
   * 根据间隔数量，利用d3中的算法，得到对应的区间
   * @param {number} start
   * @param {number} stop
   * @param {number} count
   */
  static getDomainByStep(start, stop, count = 5) {
    const tickStep = getTickStep(start, stop, count);

    const domainStart = Math.floor(start / tickStep) * tickStep;
    const domainStop = Math.ceil(stop / tickStep) * tickStep;

    return {
      start: isNaN(domainStart) ? 0 : domainStart,
      stop: isNaN(domainStop) ? 0 : domainStop,
    };
  }

  static getMergeAxisProps(yAxisProps) {
    const defaultProps = {
      tickNumber: 5,
      axisLine: {
        tickStrokeWidth: 1,
        tickSize: 8,
        tickPadding: 5,
      },
      splitLine: {
        show: false,
        interval: 'auto',
        strokeWidth: 1, // 线段宽度
        strokeColor: '#ccc', // 线段颜色
      },
    };
    return merge(defaultProps, yAxisProps);
  }

  axisRef = React.createRef();

  componentDidMount() {
    const { axis } = this.props;
    this.renderAxis(axis);
  }

  componentDidUpdate(prevProps) {
    const { axis } = this.props;
    if (prevProps.axis !== axis) {
      this.renderAxis(axis);
    }
  }

  renderAxis = (axis) => {
    if (isNil(axis)) {
      return;
    }
    const { x, y, axisObj } = axis;
    const axisG = axis.axisG(this.axisRef);
    d3Selection
      .select(axisG)
      .attr('transform', `translate(${x}, ${y})`)
      .call(axisObj);
  };

  // 渲染网格线
  renderSplitLine = () => {
    const splitLine = get(this.props, ['axis', 'axisProps', 'splitLine'], {});
    if (!splitLine.show) {
      return null;
    }

    const strokeColor = get(splitLine, ['strokeColor']);
    const strokeWidth = get(splitLine, ['strokeWidth']);
    const interval = get(splitLine, ['interval'], 'auto');

    const { offset, axis } = this.props;
    const { left, width } = offset;
    const { scale } = axis;

    const axisScaleTicks = scale.ticks();
    if (interval === 'auto') {
      return map(axisScaleTicks, (tick) => {
        const points = [
          { x: left + 1, y: scale(tick) + 0.5 },
          {
            x: width + left + 1,
            y: scale(tick) + 0.5,
          },
        ];

        return (
          <Line
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            key={tick}
            className="y-split-line"
          />
        );
      });
    }
    return null;
  };

  render() {
    return (
      <>
        <g className="tendency-g-yaxis" ref={this.axisRef} />
        {this.renderSplitLine()}
      </>
    );
  }
}
