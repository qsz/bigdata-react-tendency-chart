/**
 * brush趋势图预览组件
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as d3Scale from 'd3-scale';
import { isNil, map, get, isEmpty, forEach } from 'lodash';

import Line from './Line';

export default class PreviewCurve extends Component {
  static propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
    lineDataset: PropTypes.array,
    stroke: PropTypes.string,
    fill: PropTypes.string,
    linear: PropTypes.bool,

    customLines: PropTypes.arrayOf(
      // 自定义线
      PropTypes.shape({
        tickIndex: PropTypes.number, // 需要渲染的刻度的序号
        tickValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // 需要渲染的刻度值
        strokeWidth: PropTypes.number, // 线段宽度
        strokeColor: PropTypes.string, // 线段颜色
      })
    ),
  };

  static defaultProps = {
    width: 0,
    height: 0,
    lineDataset: [],
    stroke: '#000000',
    fill: 'none',
    linear: false,

    customLines: [],
  };

  /**
   * 更新x坐标尺、y坐标尺、dataset数据
   * @param {object} props
   */
  updateStateAboutAxisAndPoints = (props) => {
    const offsetTop = 1;
    const { lineDataset, width, height, linear } = props;

    const domainX = map(lineDataset, (item, itemIndex) =>
      !isNil(item.text) ? item.text : itemIndex
    );
    const scaleXType = linear ? 'scaleLinear' : 'scalePoint';
    const scaleXDomain = linear
      ? [
          get(lineDataset, [0, 'text'], 0),
          get(lineDataset, [lineDataset.length - 1, 'text'], 0),
        ]
      : domainX;
    const scaleX = d3Scale[scaleXType]().domain(scaleXDomain).range([0, width]);

    const { minY, maxY } = this.getMaxAndMinY(lineDataset);
    const domainY = [minY, maxY];
    const scaleY = d3Scale
      .scaleLinear()
      .domain(domainY)
      .range([height, offsetTop]);

    const formatedLinePoints = this.formatDataset(
      lineDataset,
      scaleX,
      scaleY,
      domainX,
      linear
    );

    return {
      formatedLinePoints,
      scaleX,
      scaleY,
    };
  };

  /**
   * 按比例尺换算x,y坐标值
   * @param {array} lineDataset
   * @param {function} scaleX
   * @param {function} scaleY
   * @param {array} domainX
   * @param {boolean} linear
   */
  formatDataset = (lineDataset, scaleX, scaleY, domainX, linear) => {
    const formatedLinePoints = [];

    forEach(lineDataset, (item, itemIndex) => {
      const dataX = linear ? item.text : domainX[itemIndex];
      const x = scaleX(dataX);
      const y = scaleY(item.value);
      formatedLinePoints.push({
        x,
        y,
      });
    });

    return formatedLinePoints;
  };

  /**
   * 获取Y轴最大和最小值
   * @param {array} lineDataset
   */
  getMaxAndMinY = (lineDataset) => {
    let maxY = 0;
    let minY = 0;

    forEach(lineDataset, (data) => {
      if (data.value > maxY) {
        maxY = data.value;
      }

      if (data.value < minY) {
        minY = data.value;
      }
    });

    return {
      maxY,
      minY,
    };
  };

  /**
   * 挂载曲线
   * @param {array} line
   * @param {string} stroke
   * @param {string} fill
   */
  renderCurve = (line, stroke, fill) => {
    return <Line points={line} stroke={stroke} fill={fill} />;
  };

  /**
   * 渲染自定义线
   * @param {object} scaleX
   * @param {number} height
   */
  renderCustomLines = (scaleX, height) => {
    const customLines = get(this.props, ['customLines'], []);

    if (isEmpty(customLines)) {
      return null;
    }

    return map(
      customLines,
      ({ tickValue, strokeWidth, strokeColor }, index) => {
        const tickRange = scaleX(tickValue);
        if (isNil(tickRange)) {
          return null;
        }

        const points = [
          { x: scaleX(tickValue) + 0.5, y: height },
          { x: scaleX(tickValue) + 0.5, y: 0 },
        ];

        return (
          <Line
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            key={`${tickValue}_${index}`}
          />
        );
      }
    );
  };

  render() {
    const { width, height, stroke, fill } = this.props;

    const { formatedLinePoints, scaleX } = this.updateStateAboutAxisAndPoints(
      this.props
    );
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {this.renderCurve(formatedLinePoints, stroke, fill)}
        {this.renderCustomLines(scaleX, height)}
      </svg>
    );
  }
}
