/**
 * 绘制单条曲线
 */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import * as d3Shape from 'd3-shape';
import { isNil, forEach } from 'lodash';

class Line extends PureComponent {
  static propTypes = {
    points: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
        origin: PropTypes.object,
      })
    ),
    stroke: PropTypes.string,
    fill: PropTypes.string,
    strokeWidth: PropTypes.number,
    className: PropTypes.string,
  };

  static defaultProps = {
    points: null,
    stroke: '#000000',
    fill: 'none',
    strokeWidth: 1,
    className: null,
  };

  constructor(props) {
    super(props);

    this.lineRef = React.createRef();
  }

  /**
   * 定义曲线
   */
  drawLine = () => {
    const { points } = this.props;
    const line = d3Shape
      .line()
      .x((d) => {
        return d.x;
      })
      .y((d) => {
        return d.y;
      });
    // .curve(d3Shape.curveMonotoneX); // 插值
    return line(points);
  };

  /**
   * 绘制曲线
   */
  drawCurve = () => {
    const { stroke, strokeWidth, fill, className } = this.props;
    const curveLine = this.drawLine();
    const pathClassName = isNil(className)
      ? 'tendency-line-path'
      : `tendency-line-path ${className}`;
    return (
      <path
        className={pathClassName}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        d={curveLine}
      />
    );
  };

  /**
   * 初始化绘制曲线动画
   */
  drawCurveWithAnimation = () => {};

  render() {
    const { points } = this.props;
    if (isNil(points) || !points.length) {
      return null;
    }
    return (
      <g className="tendency-g-line" ref={this.lineRef}>
        {this.drawCurve()}
      </g>
    );
  }
}

export class Lines extends PureComponent {
  static propTypes = {
    linesPoints: PropTypes.arrayOf(
      PropTypes.arrayOf(
        PropTypes.shape({
          x: PropTypes.number,
          y: PropTypes.number,
          origin: PropTypes.object,
        })
      )
    ),
    linesInfo: PropTypes.arrayOf(
      PropTypes.shape({
        color: PropTypes.string,
        name: PropTypes.string,
        active: PropTypes.bool,
        useDefaultColor: PropTypes.bool,
      })
    ),
    lineStrokeWidth: PropTypes.number,
  };

  static defaultProps = {
    linesPoints: null,
    linesInfo: null,
    lineStrokeWidth: 1,
  };

  renderLines = () => {
    const { linesPoints, linesInfo, lineStrokeWidth } = this.props;
    if (isNil(linesPoints) && isNil(linesInfo)) {
      return null;
    }
    const activeLines = [];
    forEach(linesPoints, (line, index) => {
      const lineInfo = linesInfo[index];
      const { active, color } = lineInfo;
      if (active) {
        activeLines.push(
          <Line
            key={`line_${index}`}
            points={line}
            stroke={color}
            strokeWidth={lineStrokeWidth}
            className="tendency-line"
          />
        );
      }
    });
    return activeLines;
  };

  render() {
    return <>{this.renderLines()}</>;
  }
}

export default Line;
