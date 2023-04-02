import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as d3Brush from 'd3-brush';
import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import { isNil, isEmpty, isFunction, isArray, get, min, max } from 'lodash';
import { getTendencyStringSize } from '../utils/dom';
import uuid from '../utils/uuid';

import PreviewCurve from './PreviewCurve';
import { CHARTMOUNT, BRUSHMOVE } from './Dispatcher';

export default class Brush extends Component {
  static propTypes = {
    lineDataset: PropTypes.array, // 用于展示预览图
    length: PropTypes.number, // 总数
    width: PropTypes.number, // 宽度
    height: PropTypes.number, // 长度
    handleWidth: PropTypes.number, // handle元素宽度
    fontSize: PropTypes.number, // 文字大小
    textMargin: PropTypes.number, // 文字与handle的间隔
    startIndex: PropTypes.number, // 开始下标
    endIndex: PropTypes.number, // 结束下标
    dispatcher: PropTypes.object, // 用于chart联动
    onBrush: PropTypes.func, // 移动事件
    onRangeChange: PropTypes.func, // 区间大小改变事件
    autoAdjustRangeWhenClickBrush: PropTypes.bool, // 点击brush调整range
    step: PropTypes.number, // 每次移动的最小步长
    autoDispatchWhenRangeChange: PropTypes.bool, // 当拖动handle至range改变时，是否自动发送数据给tendency
    previewLines: PropTypes.arrayOf(
      // 自定义线
      PropTypes.shape({
        tickIndex: PropTypes.number, // 需要渲染的刻度的序号
        tickValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // 需要渲染的刻度值
        strokeWidth: PropTypes.number, // 线段宽度
        strokeColor: PropTypes.string, // 线段颜色
      })
    ),
    linear: PropTypes.bool,
    formatter: PropTypes.func, // 文字内容格式器
  };

  static defaultProps = {
    lineDataset: [],
    length: null,
    width: 500,
    height: 50,
    handleWidth: 6,
    fontSize: 12,
    textMargin: 3,
    startIndex: null,
    endIndex: null,
    dispatcher: null,
    onBrush: null,
    onRangeChange: null,
    autoAdjustRangeWhenClickBrush: false,
    step: 1,
    autoDispatchWhenRangeChange: true,
    previewLines: [],
    linear: false,
    formatter: null,
  };

  /**
   * 根据index和step，获取tendency中对应的坐标
   * @param {string} indexType "start" or "end"
   * @param {number} index 当前序号
   * @param {number} step 步长
   * @param {number} total 数据最大长度
   */
  static getTendencyIndexByStep(indexType, index, step, total) {
    let nextIndex = index;
    const maxIndex = total > 0 ? total - 1 : 0;
    if (indexType === 'start') {
      nextIndex = index - (index % step);
    }
    if (indexType === 'end') {
      if (index >= maxIndex) {
        nextIndex = maxIndex;
      } else {
        nextIndex = index - (index % step);
      }
    }

    return nextIndex >= maxIndex ? maxIndex : nextIndex;
  }

  constructor(props) {
    super(props);
    this.uuid = uuid();
    this.state = { ...this.updateBrush(props), showText: false };

    this.ifHandleDrag = false; // brush的handle是否拖动
    this.ifMoveFromRender = false; // 控制render时候不触发move事件

    this.brushRef = React.createRef();
  }

  componentDidMount() {
    const { startSelection, endSelection } = this.state;

    this.sendDataIndexToChartWhenMount();

    this.brush.on('start', this.handleBrushStart);
    this.brush.on('brush', this.handleBrushMove);
    this.brush.on('end', this.handleBrushend);

    this.renderBrush(startSelection, endSelection);

    if (!isNil(this.brushRef.current)) {
      d3Selection
        .select(this.brushRef.current)
        .selectAll('.handle')
        .on('mousedown', this.handleBrushHandleMouseDown);
    }
  }

  // eslint-disable-next-line
  UNSAFE_componentWillReceiveProps(nextProps) {
    const {
      lineDataset,
      width,
      height,
      handleWidth,
      length,
      startIndex,
      endIndex,
      step,
    } = this.props;
    if (
      nextProps.lineDataset !== lineDataset ||
      nextProps.width !== width ||
      nextProps.height !== height ||
      nextProps.length !== length ||
      nextProps.handleWidth !== handleWidth ||
      nextProps.startIndex !== startIndex ||
      nextProps.endIndex !== endIndex ||
      nextProps.step !== step
    ) {
      this.setState({ ...this.updateBrush(nextProps) }, () => {
        if (
          nextProps.startIndex !== startIndex ||
          nextProps.endIndex !== endIndex
        ) {
          const total = this.getTotal(nextProps.length, nextProps.lineDataset);
          this.sendDataIndexToTendencyChart(
            this.startIndex,
            this.endIndex,
            total,
            nextProps.step
          );
        }

        const { startSelection, endSelection } = this.state;
        this.renderBrush(startSelection, endSelection);
      });
    }
  }

  componentWillUnmount() {
    this.brush.on('start brush end', null);

    if (!isNil(this.brushRef.current)) {
      d3Selection
        .select(this.brushRef.current)
        .selectAll('.handle')
        .on('mousedown', null);
    }

    const { dispatcher } = this.props;
    if (!isNil(dispatcher)) {
      dispatcher.remove();
    }
  }

  sendDataIndexToChartWhenMount = () => {
    const { step, length, lineDataset, dispatcher } = this.props;
    const total = this.getTotal(length, lineDataset);
    if (!isNil(dispatcher)) {
      // 当brush比chart先挂载, 等到chart挂载完, 发送dataIndex给chart
      dispatcher.register(CHARTMOUNT, this.uuid, () => {
        this.sendDataIndexToTendencyChart(
          this.startIndex,
          this.endIndex,
          total,
          step
        );
      });

      // 当chart先挂载, 发送dataIndex给chart
      this.sendDataIndexToTendencyChart(
        this.startIndex,
        this.endIndex,
        total,
        step
      );
    }
  };

  /**
   * props改变,更新brush和offset
   * @param {object} props
   */
  updateBrush = (props) => {
    const {
      width,
      height,
      handleWidth,
      length,
      lineDataset,
      textMargin,
      fontSize,
    } = props;
    const total = this.getTotal(length, lineDataset);
    const maxText = get(lineDataset, [total - 1, 'text'], total);
    const maxTextSize = getTendencyStringSize(maxText, fontSize, 'brush');

    const left = maxTextSize.width + handleWidth / 2 + textMargin;
    const right = maxTextSize.width + handleWidth / 2 + textMargin;

    // 拖动区域offset
    const offset = {
      width: width - left - right,
      height,
      top: 0,
      bottom: 0,
      left,
      right,
    };

    this.updateScale(props, offset);

    let brush = null;
    if (!isNil(this.brush)) {
      brush = this.brush
        .extent([
          [offset.left, 0],
          [offset.left + offset.width, offset.height],
        ])
        .handleSize(handleWidth);
    } else {
      brush = d3Brush
        .brushX()
        .extent([
          [offset.left, 0],
          [offset.left + offset.width, offset.height],
        ])
        .handleSize(handleWidth);
    }
    this.brush = brush;

    const { startIndex, endIndex } = this.updateBrushIndex(
      'update',
      props.startIndex,
      props.endIndex,
      props
    );

    const startSelection = this.getSelectionFromIndex(startIndex);
    const endSelection = this.getSelectionFromIndex(endIndex);

    return {
      offset,
      startSelection,
      endSelection,
    };
  };

  /**
   * 更新比例尺
   * @param {object} props
   * @param {object} offset
   */
  updateScale = (props, offset) => {
    const { length, lineDataset } = props;
    const { left, width } = offset;
    const total = this.getTotal(length, lineDataset);
    const endIndex = total > 0 ? total - 1 : total;

    const scale = d3Scale
      .scaleLinear()
      .domain([0, endIndex])
      .range([left, left + width]);

    this.scale = scale;
  };

  /**
   * 更新startIndex 和 endIndex
   * @param {string} updatetype 来自props更新或者brush移动 'update' or 'move'
   * @param {number} startIndex 开始数据序号
   * @param {number} endIndex 结束数据序号
   * @param {object} props
   */
  updateBrushIndex = (updatetype = 'update', startIndex, endIndex, props) => {
    const { length, lineDataset, step } = props;
    const total = this.getTotal(length, lineDataset);
    const dataMinIndex = 0; // 最小序号
    const dataMaxIndex = total > 0 ? total - 1 : 0; // 最大序号

    if (isNil(length) && (isNil(lineDataset) || isEmpty(lineDataset))) {
      this.startIndex = dataMinIndex;
      this.endIndex = dataMaxIndex;
    } else {
      const nextStartIndex =
        isNil(startIndex) || startIndex < dataMinIndex
          ? dataMinIndex
          : startIndex;
      const nextEndIndex =
        isNil(endIndex) || endIndex < dataMinIndex ? dataMaxIndex : endIndex;

      const minIndex = min([nextStartIndex, nextEndIndex]);
      const maxIndex = max([nextStartIndex, nextEndIndex]);

      const newStartIndex = minIndex > dataMaxIndex ? dataMaxIndex : minIndex;
      const newEndIndex = maxIndex > dataMaxIndex ? dataMaxIndex : maxIndex;

      if (updatetype === 'update') {
        if (
          this.isIndexAccordStepWhenBrushMove(
            newStartIndex,
            get(props, ['step'], 1)
          ) === 0
        ) {
          this.startIndex = this.formatIndexByStep(
            'start',
            newStartIndex,
            props
          );
          this.endIndex = this.formatIndexByStep('end', newEndIndex, props);
        }
      }
      if (updatetype === 'move') {
        this.startIndex = this.formatIndexByStep('start', newStartIndex, props);
        this.endIndex = this.formatIndexByStep('end', newEndIndex, props);
      }

      if (this.endIndex <= this.startIndex) {
        this.endIndex = this.startIndex + step;
      }
    }

    return {
      startIndex: this.startIndex,
      endIndex: this.endIndex,
    };
  };

  /**
   * 获取总数量 length 和 lineDataset 两者取一
   * @param {number} length
   * @param {array} lineDataset
   */
  getTotal = (length, lineDataset) => {
    let dataMaxIndex = 0;

    if (!isNil(length)) {
      dataMaxIndex = length;
    } else if (!isNil(lineDataset)) {
      dataMaxIndex = lineDataset.length;
    }
    return dataMaxIndex;
  };

  /**
   * 判断序号是否符合当前步长
   * @param {number} index
   * @param {number} step
   */
  isIndexAccordStepWhenBrushMove = (index, step) => {
    return index % step;
  };

  /**
   * 根据step转化index
   * @param {string} indexType "start" or "end"
   * @param {number} index 原序号
   * @param {object} props
   */
  formatIndexByStep = (indexType, index, props) => {
    const { length, lineDataset, step } = props;
    const total = this.getTotal(length, lineDataset);

    return Brush.getTendencyIndexByStep(indexType, index, step, total);
  };

  /**
   * 根据range获取index
   * @param {number} range
   */
  getIndexFromRange = (range) => {
    // return Math.floor(this.scale.invert(range));
    return Math.round(this.scale.invert(range));
  };

  /**
   * 根据index获取selection
   * @param {number} index
   */
  getSelectionFromIndex = (index) => {
    return this.scale(index);
  };

  /**
   * 更新selection width
   * @param {number} startSelection
   * @param {number} endSelection
   */
  updateBrushSelection = (startSelection, endSelection) => {
    this.setState({
      startSelection,
      endSelection,
    });
  };

  /**
   * 分发brush事件
   * @param {number} startIndex
   * @param {number} endIndex  number + 1
   * @param {number} total
   * @param {number} step
   * @param {object} config tendency的props
   */
  sendDataIndexToTendencyChart = (
    startIndex,
    endIndex,
    total,
    step,
    config = {}
  ) => {
    const { dispatcher } = this.props;

    if (dispatcher) {
      dispatcher.emit(BRUSHMOVE, {
        selectionIndex: {
          startIndex,
          endIndex,
          total,
          step,
        },
        config,
      });
    }
  };

  /**
   * brush的handle点击事件
   */
  handleBrushHandleMouseDown = () => {
    this.ifHandleDrag = true;
  };

  handleEnterBrush = () => {
    this.setState({
      showText: true,
    });
  };

  handleLeaveBrush = () => {
    this.setState({
      showText: false,
    });
  };

  /**
   * 刷取开始
   */
  handleBrushStart = () => {
    const { selection } = d3Selection.event;

    if (isArray(selection) && selection[0] === selection[1]) {
      // 相等说明是在拖动handle
      this.ifHandleDrag = true;
    }
  };

  /**
   * 刷取移动
   */
  handleBrushMove = () => {
    const { selection } = d3Selection.event;
    this.updateBrushSelection(selection[0], selection[1]);
    if (this.ifMoveFromRender) {
      this.ifMoveFromRender = false;
      return;
    }
    const {
      onBrush,
      autoDispatchWhenRangeChange,
      length,
      lineDataset,
      step,
    } = this.props;

    const nextStartIndex = this.getIndexFromRange(selection[0]);
    const nextEndIndex = this.getIndexFromRange(selection[1]);

    const { startIndex, endIndex } = this.updateBrushIndex(
      'move',
      nextStartIndex,
      nextEndIndex,
      this.props
    );

    const total = this.getTotal(length, lineDataset);
    // range or index change
    if (autoDispatchWhenRangeChange || !this.ifHandleDrag) {
      this.sendDataIndexToTendencyChart(startIndex, endIndex, total, step);
    }

    if (isFunction(onBrush)) {
      onBrush(startIndex, endIndex, total, step);
    }
  };

  /**
   * 刷取结束
   */
  handleBrushend = () => {
    const { selection } = d3Selection.event;
    const brushG = this.brushRef.current;
    const { autoAdjustRangeWhenClickBrush } = this.props;
    const { offset } = this.state;
    const { width, left } = offset;
    const dataMinIndex = left;
    const dataMaxIndex = left + width;

    if (isNil(selection)) {
      this.ifHandleDrag = false;
      const { startSelection, endSelection } = this.state;
      if (autoAdjustRangeWhenClickBrush) {
        if (isNil(selection)) {
          // d3Selection.mouse: return [x, y] 。 https://d3js.org.cn/document/d3-selection/#handling-events
          const [mx] = d3Selection.mouse(brushG);

          if (mx > dataMaxIndex || mx < dataMinIndex) {
            this.setBrushMoveSelection(dataMinIndex, dataMaxIndex);
            return;
          }
          if (!isNil(startSelection) && !isNil(endSelection)) {
            let startMx = mx;
            const selectionDiff = endSelection - startSelection;
            let endMx = mx + selectionDiff;
            if (endMx > dataMaxIndex) {
              endMx = dataMaxIndex;
              startMx = dataMaxIndex - selectionDiff;
            }
            this.setBrushMoveSelection(startMx, endMx);
            return;
          }

          this.setBrushMoveSelection(mx, mx);
          return;
        }
      } else {
        this.setBrushMoveSelection(startSelection, endSelection);
        return;
      }
    }

    if (this.ifHandleDrag) {
      const { startIndex, endIndex } = this;
      const { length, lineDataset, step, onRangeChange } = this.props;
      const total = this.getTotal(length, lineDataset);
      this.ifHandleDrag = false;
      if (isFunction(onRangeChange)) {
        onRangeChange(
          { startIndex, endIndex, total, step }
          // this.sendDataIndexToTendencyChart
        );
      }
    }
  };

  /**
   * 设置滑块位置
   * @param {number} startSelection
   * @param {number} endSelection
   */
  setBrushMoveSelection = (startSelection, endSelection) => {
    const brushG = this.brushRef.current;
    const { brush } = this;
    d3Selection
      .select(brushG)
      .call(brush)
      .call(brush.move, [startSelection, endSelection]);
    this.setState({
      startSelection,
      endSelection,
    });
  };

  /**
   * 挂载brush, 更新拖动范围
   * @param {number} startSelection
   * @param {number} endSelection
   */
  renderBrush = (startSelection, endSelection) => {
    this.ifMoveFromRender = true;
    const brushG = this.brushRef.current;

    this.setBrushMoveSelection(startSelection, endSelection);
    d3Selection
      .select(brushG)
      .selectAll('.selection')
      .attr('fill', '#D2D8E1')
      .attr('fill-opacity', 0.5);
    d3Selection.select(brushG).selectAll('.handle').attr('fill', '#A7B7CC');
  };

  renderText = () => {
    const {
      handleWidth,
      fontSize,
      textMargin,
      lineDataset,
      formatter,
    } = this.props;
    const { offset, startSelection, endSelection, showText } = this.state;
    const { height } = offset;

    const visibility = showText ? 'visible' : 'hidden';

    const startText = get(
      lineDataset,
      [this.startIndex, 'text'],
      this.startIndex
    );
    const endText = get(lineDataset, [this.endIndex, 'text'], this.endIndex);

    const startTextSize = getTendencyStringSize(startText, fontSize, 'brush');
    const endTextSize = getTendencyStringSize(endText, fontSize, 'brush');

    return (
      <g className="tendency-brush-text" fontSize={fontSize}>
        <text
          x={
            startSelection - handleWidth / 2 - startTextSize.width - textMargin
          }
          y={(height + startTextSize.height) / 2}
          visibility={visibility}
        >
          <tspan>
            {isFunction(formatter) ? formatter(startText) : startText}
          </tspan>
        </text>
        <text
          x={endSelection + handleWidth / 2 + textMargin}
          y={(height + endTextSize.height) / 2}
          visibility={visibility}
        >
          <tspan> {isFunction(formatter) ? formatter(endText) : endText}</tspan>
        </text>
      </g>
    );
  };

  render() {
    const {
      width,
      height,
      lineDataset,
      handleWidth,
      previewLines,
      linear,
    } = this.props;
    const { offset } = this.state;
    const { left } = offset;
    const translateX = left - handleWidth / 2;
    const rectWidth = offset.width + handleWidth;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="tendency-brush-container"
      >
        {!isNil(lineDataset) && (
          <g
            className="tendency-brush-preview"
            transform={`translate(${translateX}, 0)`}
          >
            <PreviewCurve
              lineDataset={lineDataset}
              width={rectWidth}
              height={offset.height}
              stroke="#D2D5D8"
              customLines={previewLines}
              linear={linear}
            />
          </g>
        )}
        <g
          className="tendency-brush"
          ref={this.brushRef}
          onMouseEnter={this.handleEnterBrush}
          onMouseLeave={this.handleLeaveBrush}
        />
        {this.renderText()}
        <rect
          className="rectangle"
          width={rectWidth}
          height={offset.height}
          strokeWidth="1"
          stroke="#E4E4E4"
          fill="none"
          transform={`translate(${translateX}, 0)`}
        />
      </svg>
    );
  }
}
