/**
 * 基础趋势图：历史值 + 初始化时候传入了所有数据
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as d3Scale from 'd3-scale';
import * as d3Selection from 'd3-selection';
import {
  isNil,
  isArray,
  isEqual,
  map,
  forEach,
  slice,
  isFunction,
  get,
  isEmpty,
  max,
} from 'lodash';

import { getTendencyStringSize } from '../utils/dom';
import uuid from '../utils/uuid';

import XAxis from '../components/XAxis';
import YAxis from '../components/YAxis';
import Line, { Lines } from '../components/Line';
import ToolTip from '../components/Tooltip';

import {
  CHARTMOUNT,
  BRUSHMOVE,
  TOOLTIPMOVE,
  TOOLTIPLEAVE,
  LEGENDMOUNT,
  LEGENDCLICK,
  LEGENDRECEIVEDATA,
} from '../components/Dispatcher';

export default class BasicTendencyChart extends Component {
  static propTypes = {
    width: PropTypes.number, // 容器宽度
    height: PropTypes.number, // 容器高度
    grid: PropTypes.shape({
      // 网格
      top: PropTypes.number, // 曲线区域到容器上侧的距离
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
    }),
    lineStrokeWidth: PropTypes.number, // 曲线宽度
    tooltip: PropTypes.shape({
      formatter: PropTypes.shape({
        label: PropTypes.func,
        name: PropTypes.func,
        value: PropTypes.func,
      }), // 框浮层内容格式器
      show: PropTypes.bool, // 是否显示tooltip
    }),
    dataset: PropTypes.arrayOf(
      PropTypes.shape({
        data: PropTypes.arrayOf(
          PropTypes.shape({
            value: PropTypes.number,
            text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          })
        ), // 曲线数据
        name: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // 曲线名字
      })
    ), // 曲线数据集
    lineColors: PropTypes.arrayOf(PropTypes.string), // 曲线颜色，与数据集一一对应
    dispatcher: PropTypes.object, // 用于brush, toolTip, legend联动
    startIndex: PropTypes.number, // 开始下标
    endIndex: PropTypes.number, // 结束下标
    formatDispatrchIndex: PropTypes.func, // 根据Brush的步长自定义index
    maxValue: PropTypes.number, // 最大值 设置后可提高性能
    minValue: PropTypes.number, // 最小值 设置后可提高性能

    xAxis: PropTypes.shape({
      tickInterval: PropTypes.number, // 刻度的最小间隔
      axisLine: PropTypes.shape({
        tickStrokeWidth: PropTypes.number, // 刻度线宽度
        tickSize: PropTypes.number, // 内侧和外侧刻度的大小
        tickPadding: PropTypes.number, // 刻度和刻度文本之间的间距
      }),
      splitLine: PropTypes.shape({
        // 网格
        show: PropTypes.bool, // 是否显示
        interval: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // 间隔
      }),
      // separator: PropTypes.shape({
      //   // 间隔线
      //   show: PropTypes.bool, // 是否显示
      //   interval: PropTypes.number, // 间隔
      //   strokeWidth: PropTypes.number, // 线段宽度
      //   strokeColor: PropTypes.string, // 线段颜色
      // }),
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
    yAxis: PropTypes.shape({
      tickNumber: PropTypes.number, // y轴刻度的数量建议值
      axisLine: PropTypes.shape({
        tickStrokeWidth: PropTypes.number, // 刻度线宽度
        tickSize: PropTypes.number, // 内侧和外侧刻度的大小
        tickPadding: PropTypes.number, // 刻度和刻度文本之间的间距
      }),
      splitLine: PropTypes.shape({
        // 网格
        show: PropTypes.bool, // 是否显示
        interval: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // 间隔
      }),
    }),

    onClick: PropTypes.func, // 点击事件，可获取趋势图的状态
  };

  static defaultProps = {
    width: 500,
    height: 400,
    grid: null,
    lineStrokeWidth: 2,
    tooltip: null,
    dataset: [],
    lineColors: [],
    dispatcher: null,
    startIndex: 0,
    endIndex: null,
    formatDispatrchIndex: null,
    maxValue: null,
    minValue: null,
    xAxis: null,
    yAxis: null,
    onClick: null,
  };

  /**
   * 默认state
   */
  static getDefaultState() {
    return {
      isTooltipActive: false, // 是否展示tooltip
      activeTickIndex: -1, // tooltip对应的刻度Index
      activeTick: null, // tooltip对应的刻度
      activePoints: null, // tooltip上展示的点
      tooltipCoordinate: {
        // tooltip位置信息
        x: -1,
        y: -1,
      },
      separatorNum: -1, // 分割线间隔
    };
  }

  constructor(props) {
    super(props);

    this.uuid = uuid();

    this.dataIndex = {
      startIndex: 0, // 开始刻度序号
      endIndex: 0, // 结束刻度序号
      step: 1, // 数据步长
      total: 0, // 总数量
    };

    const defaultState = this.constructor.getDefaultState(props);
    this.state = {
      ...this.updateStateAboutAxisAndTicksAndLineAndPointsAndOffset(props, {
        startIndex: props.startIndex,
        endIndex: props.endIndex,
      }),
      ...defaultState,
    };

    this.containerRef = React.createRef();
    this.wrapperRef = React.createRef();
    this.xAxisRef = React.createRef();
    this.yAxisRef = React.createRef();
  }

  componentDidMount() {
    this.addWrapperListener();

    this.askDataIndexToBrushWhenMount();
    this.sendDataToLegend();
  }

  // eslint-disable-next-line
  UNSAFE_componentWillReceiveProps(nextProps) {
    const {
      width,
      height,
      grid,
      dataset,
      lineColors,
      startIndex,
      endIndex,
      xAxis,
      yAxis,
    } = this.props;
    if (
      nextProps.dataset !== dataset ||
      nextProps.width !== width ||
      nextProps.height !== height ||
      nextProps.startIndex !== startIndex ||
      nextProps.endIndex !== endIndex ||
      !isEqual(nextProps.grid, grid) ||
      !isEqual(nextProps.lineColors, lineColors) ||
      !isEqual(nextProps.xAxis, xAxis) ||
      !isEqual(nextProps.yAxis, yAxis)
    ) {
      this.updatexChart(nextProps, {
        startIndex:
          nextProps.startIndex !== startIndex
            ? nextProps.startIndex
            : this.dataIndex.startIndex,
        endIndex:
          nextProps.endIndex !== endIndex
            ? nextProps.endIndex
            : this.dataIndex.endIndex,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const prevlinesInfo = prevState.linesInfo;
    const { linesInfo } = this.state;

    if (
      !isArray(prevlinesInfo) ||
      prevlinesInfo.length !== linesInfo.length ||
      linesInfo.some((lineInfo, index) => {
        const preLineInfo = prevlinesInfo[index];
        return (
          preLineInfo.name !== lineInfo.name ||
          preLineInfo.color !== lineInfo.color ||
          preLineInfo.active !== lineInfo.active
        );
      })
    ) {
      // 发送数据给Legend
      this.sendDataToLegend();
    }
  }

  componentWillUnmount() {
    this.removeWrapperListener();
  }

  /**
   * 更新并返回坐标轴对象、刻度信息、曲线信息、格式化数据、图表位置信息
   * @param {object} props
   * @param {object} dataIndex {startIndex, endIndex,total,step}
   */
  updateStateAboutAxisAndTicksAndLineAndPointsAndOffset = (
    props,
    dataIndex
  ) => {
    const {
      startIndex, // 开始tick序号
      endIndex, // 结束tick序号
      total,
      step,
    } = dataIndex;

    const { dataset, formatDispatrchIndex, lineStrokeWidth } = props;

    if (!isNil(startIndex)) {
      this.dataIndex.startIndex = startIndex;
    }
    if (!isNil(step)) {
      this.dataIndex.step = step;
    }

    const xAxisProps = XAxis.getMergeAxisProps(props.xAxis);
    const xAxisLine = get(xAxisProps, ['axisLine']);
    const linear = get(xAxisProps, ['linear']);

    const yAxisProps = YAxis.getMergeAxisProps(props.yAxis);
    const yAxisLine = get(yAxisProps, ['axisLine']);
    const tickNumber = get(yAxisProps, ['tickNumber']);

    const maxLineDataSet = this.getMaxLineDataSet(dataset, linear);

    this.dataIndex.endIndex = isNil(endIndex)
      ? maxLineDataSet.length - 1
      : endIndex;
    this.dataIndex.total = isNil(total) ? maxLineDataSet.length : total;

    const nextDataIndex = this.formatDataIndexWithStep(
      {
        ...this.dataIndex,
      },
      maxLineDataSet,
      formatDispatrchIndex
    );
    const nextStartIndex = nextDataIndex.startIndex;
    let nextEndIndex = nextDataIndex.endIndex;
    if (nextEndIndex <= nextStartIndex) {
      nextEndIndex = nextStartIndex + 1;
    }
    this.dataIndex.startIndex = nextDataIndex.startIndex;
    this.dataIndex.endIndex = nextDataIndex.endIndex;

    const nextMaxLineDataSet = this.getLineDataByIndex(
      maxLineDataSet,
      this.dataIndex.startIndex,
      this.dataIndex.endIndex
    );
    const domainX = map(nextMaxLineDataSet, (item, itemIndex) =>
      !isNil(item.text) ? item.text : itemIndex
    );

    const { maxY, minY } = this.getMaxAndMinY(props);
    const domainByStep = YAxis.getDomainByStep(minY, maxY, tickNumber);
    const domainY = [domainByStep.start, domainByStep.stop];

    const offset = this.getOffset(
      props,
      domainX,
      domainY,
      xAxisLine,
      yAxisLine
    );

    const xAxis = XAxis.getAxisInfo(
      offset,
      nextMaxLineDataSet,
      domainX,
      xAxisProps,
      {
        ...dataIndex,
      }
    );
    const yAxis = YAxis.getAxisInfo(offset, domainY, yAxisProps);
    const ticks = XAxis.getTicksAboutPositionFromAxis(xAxis);

    const formatedLinesPoints = this.formatDataset(
      dataset,
      xAxis,
      yAxis,
      this.dataIndex.startIndex,
      this.dataIndex.endIndex,
      linear
    );
    const linesInfo = this.getLinesInfo(props);

    return {
      xAxis, // x坐标轴对象
      yAxis, // y坐标轴对象
      offset, // 长宽位置等信息
      formatedLinesPoints, // 格式化后的所有曲线数据
      ticks, // x轴的所有刻度
      linesInfo, // 曲线信息 名字颜色等
      lineStrokeWidth, // 线宽
    };
  };

  /**
   * 用户自定义index
   * @param {object} indexObj {startIndex, endIndex, [total, step]}
   * @param {object} lineData
   * @param {function} format
   */
  formatDataIndexWithStep = (indexObj, lineData, format) => {
    const { startIndex, endIndex } = indexObj;
    if (!isFunction(format)) {
      return {
        startIndex,
        endIndex,
      };
    }

    /**
     * @param {object} indexObj 包含{startIndex, endIndex, [total, step]}
     * @param {object} lineData 当前趋势图数据最多的曲线的数据
     * @return {object} {startIndex, endIndex}
     */
    return format(indexObj, lineData);
  };

  /**
   * 获取offset
   * @param {object} props
   * @param {array} domainX x轴值的范围
   * @param {array} domainY y轴值的范围
   * @param {object} xAxisLine 刻度线宽度等信息
   * @param {object} yAxisLine 刻度线宽度等信息
   */
  getOffset = (props, domainX, domainY, xAxisLine, yAxisLine) => {
    const { width, height, grid, lineStrokeWidth } = props;

    const xAxisTickSize = get(xAxisLine, ['tickSize']); // x坐标轴刻度的大小
    const xAxisPadding = get(xAxisLine, ['tickPadding']); // x坐标轴刻度和刻度文本之间的间距
    const tickStrokeWidth = get(xAxisLine, ['tickStrokeWidth']); // 刻度线宽度
    const yAxisTickSize = get(yAxisLine, ['tickSize']); // y坐标轴刻度的大小
    const yAxisPadding = get(yAxisLine, ['tickSize']); // y坐标轴刻度和刻度文本之间的间距

    let offsetTop = 0;
    let offsetRight = 0;
    let offsetBottom = 0;
    let offsetLeft = 0;

    if (grid) {
      const { top, right, bottom, left } = grid;
      offsetTop = top;
      offsetRight = right;
      offsetBottom = bottom;
      offsetLeft = left;
    } else {
      const lastTickX = domainX[domainX.length - 1];
      const laxtTickXSize = getTendencyStringSize(lastTickX);

      const scaleYFormat = d3Scale.scaleLinear().domain(domainY).tickFormat();
      const laxtTickYSize = getTendencyStringSize(scaleYFormat(domainY[1]));

      const xAxisTickHeight =
        xAxisTickSize + xAxisPadding + laxtTickXSize.height; // x轴刻度所占的高度
      const yAxisTickWidth = yAxisTickSize + yAxisPadding + laxtTickYSize.width; // y轴刻度所占的宽度

      offsetTop = max([lineStrokeWidth / 2, laxtTickYSize.height / 2]);
      offsetRight = max([lineStrokeWidth / 2, laxtTickXSize.width / 2]);
      offsetBottom = xAxisTickHeight;
      offsetLeft = yAxisTickWidth;
    }

    const offset = {
      width: width - offsetRight - offsetLeft - tickStrokeWidth / 2, // 曲线区域rect宽度
      height: height - offsetTop - offsetBottom - tickStrokeWidth / 2, // 曲线区域rect高度
      top: offsetTop, // 曲线区域到容器上侧的距离
      right: offsetRight, // 曲线区域到容器右侧的距离
      bottom: offsetBottom, // 曲线区域到容器下侧的距离
      left: offsetLeft, // 曲线区域到容器底侧的距离
      xOffset: {
        tickSize: xAxisTickSize, // 坐标轴刻度的大小
        tickPadding: xAxisPadding, // 坐标轴刻度和刻度文本之间的间距
      },
      yOffset: {
        tickSize: yAxisTickSize,
        tickPadding: yAxisPadding,
      },
    };

    return offset;
  };

  /**
   * 按比例尺换算dataset中x,y坐标值
   * @param {array} dataset
   * @param {object} xAxis
   * @param {object} yAxis
   * @param {number} startIndex
   * @param {number} endIndex
   * @param {boolean} linear
   */
  formatDataset = (dataset, xAxis, yAxis, startIndex, endIndex, linear) => {
    const formatedLinesPoints = [];
    const scaleX = xAxis.scale;
    const xScaleDomain = xAxis.domain;
    const scaleY = yAxis.scale;
    forEach(dataset, (item) => {
      const { data } = item;
      if (isArray(data)) {
        const dataSlice = this.getLineDataByIndex(data, startIndex, endIndex);
        const formatedItem = [];
        const maxXScaleDomain = get(xScaleDomain, [xScaleDomain.length - 1], 0);
        forEach(dataSlice, (d, dIndex) => {
          let dataX = xScaleDomain[dIndex];
          if (linear) {
            dataX = d.text;
            if (dataX <= maxXScaleDomain) {
              const x = scaleX(dataX);
              const y = scaleY(d.value);
              formatedItem.push({
                x,
                y,
                origin: { ...d },
              });
            }
          } else {
            const x = scaleX(dataX);
            const y = scaleY(d.value);
            formatedItem.push({
              x,
              y,
              origin: { ...d },
            });
          }
        });
        formatedLinesPoints.push(formatedItem);
      }
    });

    return formatedLinesPoints;
  };

  /**
   * 根据开始和结束刻度的序号获取当前需要展示的linedata
   * @param {object} lineData
   * @param {object} startIndex 开始刻度序号
   * @param {object} endIndex 结束刻度序号
   */
  getLineDataByIndex = (lineData, startIndex, endIndex) => {
    return slice(lineData, startIndex, endIndex + 1);
  };

  /**
   * 获取曲线信息
   * @param {object} props
   */
  getLinesInfo = (props) => {
    const { dataset, lineColors, dispatcher } = props;
    const defaultColor = '#000000';
    let prevLinesInfo = [];
    if (this.state) {
      const { linesInfo } = this.state;
      prevLinesInfo = linesInfo;
    }

    const nextLinesInfo = [];
    let hasLegend = false;
    if (!isNil(dispatcher)) {
      const { registeredEventTypes } = dispatcher;
      if (
        isNil(registeredEventTypes[LEGENDRECEIVEDATA]) &&
        isEmpty(registeredEventTypes[LEGENDRECEIVEDATA])
      ) {
        hasLegend = true;
      }
    }

    forEach(dataset, (item, itemIndex) => {
      const { name, data } = item;
      const color = lineColors[itemIndex];
      if (isArray(data)) {
        const prevLineInfo = prevLinesInfo[itemIndex];
        let active = true;
        if (
          hasLegend &&
          !isNil(prevLineInfo) &&
          (prevLineInfo.color === color || prevLineInfo.useDefaultColor) &&
          prevLineInfo.name === name
        ) {
          active = prevLineInfo.active;
        }

        nextLinesInfo.push({
          color: !isNil(color) ? color : defaultColor,
          name: !isNil(name) ? name : itemIndex,
          active,
          useDefaultColor: !!isNil(color),
        });
      }
    });

    return nextLinesInfo;
  };

  /**
   * 获取Y轴最大和最小值
   * @param {object} props
   */
  getMaxAndMinY = (props) => {
    const { dataset, maxValue, minValue } = props;
    let maxY = !isNil(maxValue) ? maxValue : 0;
    let minY = !isNil(minValue) ? minValue : 0;
    if (isNil(maxValue) || isNil(minValue)) {
      forEach(dataset, (line) => {
        const { data } = line;

        forEach(data, (d) => {
          if (isNil(maxValue) && d.value > maxY) {
            maxY = d.value;
          }
          if (isNil(minValue) && d.value < minY) {
            minY = d.value;
          }
        });
      });
    }
    return {
      maxY,
      minY,
    };
  };

  /**
   * 获取用于X轴的曲线
   * @param {array} dataset
   * @param {boolean} linear
   */
  getMaxLineDataSet = (dataset, linear) => {
    let maxLineDataSet = [];
    if (linear) {
      let maxX = null;
      // 如果是连续,则取x轴最大值的那条线
      forEach(dataset, (line) => {
        const { data } = line;
        const dataX = get(data, [data.length - 1, 'text'], 0);
        if (isNil(maxX) || dataX > maxX) {
          maxX = dataX;
          maxLineDataSet = data;
        }
      });
    } else {
      // 否则取点最大的那条线
      forEach(dataset, (line) => {
        const { data } = line;
        if (data.length > maxLineDataSet.length) {
          maxLineDataSet = data;
        }
      });
    }

    return maxLineDataSet;
  };

  /**
   * 挂载曲线
   */
  renderLines = () => {
    const { formatedLinesPoints, linesInfo, lineStrokeWidth } = this.state;
    const activeLines = [];
    forEach(formatedLinesPoints, (line, index) => {
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

  /**
   * 挂载提示框
   */
  renderTooltip = (formatter) => {
    const {
      tooltipCoordinate,
      isTooltipActive,
      activeTick,
      activePoints,
      offset,
    } = this.state;
    const label = isNil(activeTick) ? '' : activeTick.value;
    const points = isNil(activePoints) ? [] : activePoints;
    return (
      <ToolTip
        moveBox={offset}
        position={{
          x: tooltipCoordinate.x,
          y: tooltipCoordinate.y,
        }}
        active={isTooltipActive}
        label={label}
        points={points}
        formatter={formatter}
      />
    );
  };

  /**
   * 挂载tooltip所需的辅助线
   */
  renderAuxiliaryLine = () => {
    const { tooltipCoordinate, isTooltipActive, offset } = this.state;
    if (!isTooltipActive) {
      return null;
    }
    const { top, height } = offset;
    const strokeWidth = 1;
    const points = [
      { x: tooltipCoordinate.x + 0.5, y: top },
      { x: tooltipCoordinate.x + 0.5, y: top + height },
    ];
    return (
      <Line
        points={points}
        stroke="#505765"
        strokeWidth={strokeWidth}
        className="tooltip-line"
      />
    );
  };

  /**
   * 更新趋势图信息
   * @param {object} props
   * @param {array} dataIndex {startIndex, endIndex, total, step}
   * @param {object} config
   */
  updatexChart = (props, dataIndex, otherConfig) => {
    const startIndex = get(dataIndex, ['startIndex'], null);
    const endIndex = get(dataIndex, ['endIndex'], null);
    const total = get(dataIndex, ['total'], null);
    const step = get(dataIndex, ['step'], null);
    this.setState({
      ...this.updateStateAboutAxisAndTicksAndLineAndPointsAndOffset(
        { ...props, ...otherConfig },
        { startIndex, endIndex, total, step }
      ),
    });
  };

  /**
   * 绑定事件
   */
  addWrapperListener = () => {
    const { tooltip } = this.props;
    const ifRenderTooltip = !!(!isNil(tooltip) && !!tooltip.show);
    if (ifRenderTooltip) {
      const { tooltipEvents } = this.parseToolTipEvents();
      const containerSelected = d3Selection.select(this.containerRef.current);
      forEach(Object.keys(tooltipEvents), (eventName) => {
        containerSelected.on(eventName, tooltipEvents[eventName]);
      });
    }

    this.addDiapatchEvent();
  };

  addDiapatchEvent = () => {
    const { dispatcher } = this.props;

    if (!isNil(dispatcher)) {
      dispatcher.register(BRUSHMOVE, this.uuid, this.handleReceiveBrushMove); // 监听Brush拖动事件

      dispatcher.register(
        TOOLTIPMOVE,
        this.uuid,
        this.handleReceiveTooltipMove
      ); // 监听toolTip移动事件
      dispatcher.register(
        TOOLTIPLEAVE,
        this.uuid,
        this.handleReceiveTooltipLeave
      ); // 监听toolTip离开事件
      dispatcher.register(
        LEGENDCLICK,
        this.uuid,
        this.handleReceiveLegendClick
      ); // 监听legeng点击事件
      // 当图表比Legend先挂载，监听Legend挂载完成事件，发送数据给Legend
      dispatcher.register(LEGENDMOUNT, this.uuid, () => {
        this.sendDataToLegend();
      });
    }
  };

  getEventTypeName = (eventType) => {
    return `${eventType}.${this.uuid}`;
  };

  /**
   * 当brush比chart先挂载, chart需要发送获取dataIndex的请求给Brush
   */
  askDataIndexToBrushWhenMount = () => {
    const { dispatcher } = this.props;

    if (!isNil(dispatcher)) {
      dispatcher.emit(CHARTMOUNT);
    }
  };

  /**
   * 传递 linesInfo 给 Legend
   */
  sendDataToLegend = () => {
    const { dispatcher } = this.props;
    if (!isNil(dispatcher)) {
      const { linesInfo } = this.state;
      this.dispatchLegendEvent(LEGENDRECEIVEDATA, linesInfo);
    }
  };

  /**
   * 移除事件
   */
  removeWrapperListener = () => {
    const tooltipEventsNames = this.parseToolTipEvents();
    forEach(tooltipEventsNames, (eventName) => {
      d3Selection.select(this.containerRef.current).on(eventName, null);
    });

    this.removeDiapatch();
  };

  /**
   * 移除dispatch监听的事件
   */
  removeDiapatch = () => {
    const { dispatcher } = this.props;
    if (!isNil(dispatcher)) {
      dispatcher.remove();
    }
  };

  parseToolTipEvents = () => {
    const tooltipEvents = {
      mousemove: this.handleMouseMove,
      mouseleave: this.handleMouseLeave,
      click: this.handleClick,
    };

    return {
      tooltipEvents,
      tooltipEventsNames: ['mousemove', 'mouseleave'],
    };
  };

  /**
   * 鼠标移动
   */
  handleMouseMove = () => {
    // const { pageX, pageY } = d3Selection.event;
    const nextTooltipInfo = this.getStateAboutToolTipInfoFromMouseOrDispatch();
    const nextState = !isNil(nextTooltipInfo)
      ? {
          isTooltipActive: true,
          ...nextTooltipInfo,
        }
      : {
          isTooltipActive: false,
        };
    this.setState({
      ...nextState,
    });
    this.dispatchTooltipEvent(TOOLTIPMOVE, {
      ...nextState,
    });
  };

  handleMouseLeave = () => {
    this.setState({
      isTooltipActive: false,
    });
    this.dispatchTooltipEvent(TOOLTIPLEAVE);
  };

  /**
   * 点击趋势图
   */
  handleClick = () => {
    const { onClick } = this.props;

    if (isFunction(onClick)) {
      const dataIndex = {
        ...this.dataIndex,
      };
      onClick(this.state, dataIndex);
    }
  };

  /**
   * 接受brush移动事件
   * @param {object} data
   */
  handleReceiveBrushMove = (data) => {
    const { selectionIndex } = data;
    const config = isNil(data.config) ? {} : data.config;
    if (!isNil(selectionIndex)) {
      const { startIndex, endIndex } = selectionIndex; // { startIndex, endIndex, total, step}
      if (
        startIndex !== this.dataIndex.startIndex ||
        endIndex !== this.dataIndex.endIndex
      ) {
        this.updatexChart(this.props, selectionIndex, config);
      }
    }
  };

  /**
   * 接收legend点击事件
   * @param {object} clickIndex
   */
  handleReceiveLegendClick = (clickIndex) => {
    const { linesInfo } = this.state;
    const nextLinesInfo = map(linesInfo, (line, index) => {
      const { active } = line;
      if (index === clickIndex) {
        return { ...line, active: !active };
      }
      return { ...line };
    });

    this.setState({
      linesInfo: nextLinesInfo,
    });
  };

  /**
   * 接收tooltip移动事件
   * @param {object} nextState
   */
  handleReceiveTooltipMove = (nextState) => {
    const nextTooltipInfo = this.getStateAboutToolTipInfoFromMouseOrDispatch(
      false,
      {
        ...nextState,
      }
    );

    if (!isNil(nextTooltipInfo)) {
      this.setState({
        isTooltipActive: true,
        ...nextTooltipInfo,
      });
    } else {
      this.setState({
        isTooltipActive: false,
      });
    }
  };

  /**
   * 接收tooltip离开
   */
  handleReceiveTooltipLeave = () => {
    this.setState({
      isTooltipActive: false,
    });
  };

  /**
   * 分发tooltip事件给其他的chart
   * @param {*} name
   * @param {*} data
   */
  dispatchTooltipEvent = (name, data) => {
    const { dispatcher } = this.props;
    if (!isNil(dispatcher)) {
      dispatcher.emit(name, data);
    }
  };

  /**
   * 分发legend事件
   * @param {*} name
   * @param {*} data
   */
  dispatchLegendEvent = (name, data) => {
    const { dispatcher } = this.props;

    if (!isNil(dispatcher)) {
      dispatcher.emit(name, data);
    }
  };

  /**
   * 根据鼠标移动或dispatch传递的信息获取tooltip需要的state
   * @param {boolean} isFromMouse
   */
  getStateAboutToolTipInfoFromMouseOrDispatch = (
    isFromMouse = true,
    dispatchData
  ) => {
    const { ticks, offset } = this.state;
    let activeTickIndex = -1;
    let tooltipCoordinateY = -1;
    if (isFromMouse) {
      const [mouseX, mouseY] = d3Selection.mouse(this.wrapperRef.current);

      // if (!this.isCoordinateInChartrRange(mouseX, mouseY, offset)) {
      //   return null;
      // }
      activeTickIndex = this.getActiveTickIndex(mouseX, ticks);
      tooltipCoordinateY = mouseY;
    } else if (!isFromMouse && dispatchData.isTooltipActive) {
      activeTickIndex = dispatchData.activeTickIndex;
      tooltipCoordinateY = Math.min(
        dispatchData.tooltipCoordinate.y,
        offset.top + offset.height
      );
    }

    const activeTick = ticks[activeTickIndex];
    const activePoints = this.getTooltipPoints(activeTickIndex, activeTick);

    if (activeTickIndex >= 0 && !isNil(activeTick)) {
      return {
        activeTickIndex,
        activeTick,
        activePoints,
        tooltipCoordinate: {
          x: activeTick.coordinate,
          y: tooltipCoordinateY,
        },
      };
    }
    return null;
  };

  /**
   * 获取离当前鼠标位置最近的刻度
   * @param {number} mousePositon 鼠标位置
   * @param {array} ticks
   */
  getActiveTickIndex = (mousePositon, ticks) => {
    let index = -1;
    const len = ticks.length;
    if (len > 1) {
      for (let i = 0; i < len; i++) {
        if (
          (i === 0 &&
            mousePositon <=
              (ticks[i].coordinate + ticks[i + 1].coordinate) / 2) ||
          (i > 0 &&
            i < len - 1 &&
            mousePositon >
              (ticks[i].coordinate + ticks[i - 1].coordinate) / 2 &&
            mousePositon <=
              (ticks[i].coordinate + ticks[i + 1].coordinate) / 2) ||
          (i === len - 1 &&
            mousePositon > (ticks[i].coordinate + ticks[i - 1].coordinate) / 2)
        ) {
          index = ticks[i].index;
          break;
        }
      }
    } else {
      index = 0;
    }
    return index;
  };

  /**
   * 判断坐标是否在趋势图内
   * @param {number} x x轴坐标
   * @param {number} y y轴坐标
   * @param {object} offset
   */
  isCoordinateInChartrRange = (x, y, offset) => {
    const { left, top, width, height } = offset;

    if (x >= left && x <= width + left && y >= top && y <= height + top) {
      return true;
    }
    return false;
  };

  /**
   * 获取tooltip所展示的曲线上的点
   * @param {number} activeIndex
   */
  getTooltipPoints = (activeIndex) => {
    // activeTick
    const { formatedLinesPoints, linesInfo } = this.state;

    // TODO linear下，不能根据index获取每条线对应的点，需要根据x轴坐标获取每条线对应的点
    // xAxis, scaleY, activeTick
    // console.log('getTooltipPoints:::', { xAxis, activeTick });

    const tooltipPoints = [];
    forEach(formatedLinesPoints, (line, index) => {
      const lineInfo = linesInfo[index];
      const { active, color, name } = lineInfo;
      if (active) {
        const activePoint = line[activeIndex];
        if (!isNil(activePoint)) {
          const { origin } = activePoint;
          const { text, value } = origin;
          tooltipPoints.push({
            value,
            text,
            name,
            color,
          });
        }
      }
    });

    return tooltipPoints;
  };

  render() {
    const { width, height, tooltip } = this.props;
    const ifRenderTooltip = get(tooltip, ['show'], false);
    const formatter = get(tooltip, ['formatter']);
    const {
      xAxis,
      yAxis,
      offset,
      ticks,
      formatedLinesPoints,
      linesInfo,
      lineStrokeWidth,
    } = this.state;
    return (
      <div
        className="tendency-wrapper-container"
        style={{ position: 'relative', width, height }}
        ref={this.containerRef}
      >
        {ifRenderTooltip && this.renderTooltip(formatter)}
        <svg
          className="tendency-wrapper-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          ref={this.wrapperRef}
        >
          <YAxis axis={yAxis} offset={offset} />
          <g className="tendency-g-lines">
            <Lines
              linesPoints={formatedLinesPoints}
              linesInfo={linesInfo}
              lineStrokeWidth={lineStrokeWidth}
            />
          </g>
          <XAxis axis={xAxis} offset={offset} ticks={ticks} />
          {ifRenderTooltip && (
            <g className="tendency-g-auxiliary">{this.renderAuxiliaryLine()}</g>
          )}
        </svg>
      </div>
    );
  }
}
