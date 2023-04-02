import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import * as d3Scale from 'd3-scale';
import * as d3Axis from 'd3-axis';
import * as d3Selection from 'd3-selection';
import { isNil, map, merge, get, isEmpty, isFunction, forEach } from 'lodash';

import Line from './Line';
import { getTendencyStringSize } from '../utils/dom';

export default class XAxis extends PureComponent {
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
      tickValues: PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      ),

      dataIndex: PropTypes.shape({
        startIndex: PropTypes.number,
        endIndex: PropTypes.number,
        step: PropTypes.number,
        total: PropTypes.number,
      }),

      // 从属性传入的配置
      axisProps: PropTypes.shape({
        tickInterval: PropTypes.number, // 刻度的最小间隔
        tickNumber: PropTypes.number, // 刻度的数量
        linear: PropTypes.bool, // 是否线性连续
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
        customLines: PropTypes.arrayOf(
          // 自定义线
          PropTypes.oneOfType([
            PropTypes.shape({
              tickIndex: PropTypes.number, // 需要渲染的刻度的序号
              tickValue: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number,
              ]), // 需要渲染的刻度值
              strokeWidth: PropTypes.number, // 线段宽度
              strokeColor: PropTypes.string, // 线段颜色
            }),
            PropTypes.func,
          ])
        ),
      }),
    }),

    ticks: PropTypes.array, // 当前数据下的所有刻度

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
    ticks: [],
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
   * 获取用于展示的刻度
   * @param {array} dataset
   * @param {number} width
   * @param {number} tickInterval 刻度间隔
   * @param {number} tickNumber 刻度数量
   */
  static getTickValuesByOffset(dataset, width, tickInterval, tickNumber) {
    const total = dataset.length;

    if (total === 0) {
      return [];
    }
    const offset = width / total;

    const firstTick = dataset[0];
    const finalTick = dataset[total - 1];
    const finalTextSize =
      getTendencyStringSize(finalTick.text, 10, 'xaxis').width / 2;

    const tickValues = [];
    tickValues.push(firstTick.text);

    let lastTick = firstTick;
    let lastTextSize =
      getTendencyStringSize(lastTick.text, 10, 'xaxis').width / 2;
    let lastIndex = 0;

    const indexInterval = tickInterval && tickInterval > 0 ? tickInterval : 2;

    for (let i = indexInterval; i < total - 1; i += indexInterval) {
      const tick = dataset[i];
      const textSize = getTendencyStringSize(tick.text, 10, 'xaxis').width / 2;

      if (
        lastTextSize + textSize < offset * (i - lastIndex) &&
        finalTextSize + textSize < offset * (total - 1 - i)
      ) {
        lastTick = tick;
        lastTextSize = textSize;
        lastIndex = i;
        tickValues.push(lastTick.text);
      }
    }

    let nextTickValues = [];
    if (tickNumber && tickNumber > 0 && tickValues.length > tickNumber) {
      const nextInterval = parseInt(tickValues.length / tickNumber, 10);
      for (let j = 0; j < tickValues.length - 1; j += nextInterval) {
        const tick = tickValues[j];
        nextTickValues.push(tick);
      }
    } else {
      nextTickValues = tickValues;
    }

    nextTickValues.push(finalTick.text);

    return nextTickValues;
  }

  /**
   * 获取当前数据下坐标轴刻度位置信息
   * @param {object} axis
   */
  static getTicksAboutPositionFromAxis(axis) {
    const { scale, axisProps, domain } = axis;
    const linear = get(axisProps, ['linear']);
    const ticksDomain = linear ? domain : scale.domain();

    return map(ticksDomain, (entry, index) => {
      return {
        coordinate: scale(entry), // 坐标
        value: entry, // 值
        index, // 序号
      };
    });
  }

  /**
   * 获取坐标轴信息
   * @param {object} offset 网格信息
   * @param {array} dataset 原始数据
   * @param {array} domain 坐标值
   * @param {object} axisProps 相关属性
   * @param {object} dataIndex 数据序号相关
   */
  static getAxisInfo(offset, dataset, domain, axisProps, dataIndex) {
    const { width, height, left, top, bottom } = offset;
    const xAxisProps = axisProps;
    const tickInterval = get(xAxisProps, ['tickInterval']); // 刻度之间最小的间隔
    const tickNumber = get(xAxisProps, ['tickNumber']);
    const tickSize = get(xAxisProps, ['axisLine', 'tickSize']);
    const tickPadding = get(xAxisProps, ['axisLine', 'tickPadding']);
    const linear = get(xAxisProps, ['linear']); // 是否线性

    const scaleType = linear ? 'scaleLinear' : 'scalePoint';
    const scaleDomain = linear
      ? [domain[0], domain[domain.length - 1]]
      : domain;
    const scale = d3Scale[scaleType]()
      .domain(scaleDomain)
      .range([left, width + left]);

    let xAxisObj = null;
    let tickValues = [];

    if (linear) {
      xAxisObj = d3Axis
        .axisBottom()
        .scale(scale)
        .tickSize(tickSize)
        .tickPadding(tickPadding);

      tickValues = scale.ticks();
    } else {
      tickValues = XAxis.getTickValuesByOffset(
        dataset,
        width,
        tickInterval,
        tickNumber
      );

      xAxisObj = d3Axis
        .axisBottom()
        .scale(scale)
        .tickValues(tickValues)
        .tickSize(tickSize)
        .tickPadding(tickPadding);
    }

    const axis = {
      axisObj: xAxisObj, // 坐标轴对象
      axisG: (axisRef) => {
        // 坐标轴元素
        return isNil(axisRef) ? null : axisRef.current;
      },
      scale, // 比例尺对象
      domain, // 值域
      x: 0, // 起点x坐标
      y: height + top, // 起点与y坐标
      width,
      height: bottom,
      tickValues, // 刻度值
      axisProps: xAxisProps, // 传入的属性值
      dataIndex,
    };

    return axis;
  }

  static getMergeAxisProps(axisProps) {
    const defaultProps = {
      tickInterval: -1,
      tickNumber: -1,
      linear: false,
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

      customLines: [],
    };
    return merge(defaultProps, axisProps);
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
    // .selectAll('.tick')
    // .select('text')
    // .each(function () {
    //   // const transformValue = d3Selection.select(this).attr('transform');
    //   d3Selection.select(this).attr('transform', `rotate(30)`);

    //   // transform-origin:20% 40%;
    //   // console.log(d, j, d3Selection.select(this).attr('transform'));
    // });
  };

  /**
   * 渲染网格线
   */
  renderSplitLine = () => {
    const splitLine = get(this.props, ['axis', 'axisProps', 'splitLine'], {});
    if (!splitLine.show) {
      return null;
    }
    const { offset, axis } = this.props;
    const { height, top } = offset;
    const { scale, tickValues } = axis;

    const strokeColor = get(splitLine, ['strokeColor']);
    const strokeWidth = get(splitLine, ['strokeWidth']);
    const interval = get(splitLine, ['interval'], 'auto');

    if (interval === 'auto') {
      return map(tickValues, (value, index) => {
        const points = [
          { x: scale(value) + 0.5, y: top },
          { x: scale(value) + 0.5, y: top + height },
        ];
        return (
          <Line
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            key={`line_${index}`}
            className="x-split-line"
          />
        );
      });
    }
    return null;
  };

  /**
   * 渲染自定义线
   */
  renderCustomLines = () => {
    const customLines = get(
      this.props,
      ['axis', 'axisProps', 'customLines'],
      []
    );

    if (isEmpty(customLines)) {
      return null;
    }

    const { offset, axis } = this.props;
    const { scale } = axis;

    let lines = [];

    forEach(customLines, (line, index) => {
      if (isFunction(line)) {
        lines = lines.concat(
          map(line(this.props), ({ tickValue, strokeWidth, strokeColor }) => {
            return this.getCustomLine(
              { tickValue, strokeWidth, strokeColor },
              scale,
              offset,
              index
            );
          })
        );
      } else {
        lines.push(this.getCustomLine(line, scale, offset, index));
      }
    });

    return lines;
  };

  /**
   * 解析自定义线
   * @param {object} lineInfo
   * @param {object} scale
   * @param {object} offset
   * @param {number} index
   */
  getCustomLine = (lineInfo, scale, offset, index) => {
    const { top, height, left, width } = offset;
    const { tickValue, strokeWidth, strokeColor } = lineInfo;
    const tickRange = scale(tickValue);
    if (isNil(tickRange)) {
      return null;
    }

    const xCoord = scale(tickValue) + 0.5;
    if (xCoord <= left || xCoord > left + width) {
      // x坐标值超出左/右边界
      return null;
    }
    const points = [
      { x: xCoord, y: top },
      { x: xCoord, y: top + height },
    ];
    return (
      <Line
        points={points}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        key={`${tickValue}_${index}`}
        className="x-custom-line"
      />
    );
  };

  render() {
    return (
      <>
        <g className="tendency-g-xaxis" ref={this.axisRef} />
        {this.renderSplitLine()}
        {this.renderCustomLines()}
      </>
    );
  }
}
