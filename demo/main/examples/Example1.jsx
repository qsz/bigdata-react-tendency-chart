/* eslint-disable import/no-unresolved */
import React, { Component } from 'react';
// eslint-disable-next-line
import {
  TendencyChart,
  Brush,
  Dispatcher,
  Legend,
} from 'bigdata-react-tendency-chart';
import { getStep, getDataByStep } from '../utils';

// 颜色
const COLOR_THEME = [
  '#FFDEAD',
  '#228B22',
  '#00FFFF',
  '#4682B4',
  '#9370DB',
  '#483D8B',
  '#DDA0DD',
  '#DC143C',
];

// 每条曲线最大的数据量
// const TotalSum = 1000000;
const TotalSum = 1000;

const lineNum = 1;
// chart可视区域宽度
const ViewWidth = 1800;
// const ViewWidth = 180;

const dispatcher = new Dispatcher();

dispatcher.createDispatch(
  [].concat(
    dispatcher.eventTypes.ChartEventTypes,
    dispatcher.eventTypes.BrushEventTypes,
    dispatcher.eventTypes.TooltipEventTypes,
    dispatcher.eventTypes.LegendEventTypes
  )
);

class Example1 extends Component {
  constructor(props) {
    super(props);

    const { startIndex, endIndex, step, dataset } = this.getDataConfig(
      0,
      TotalSum - 1,
      lineNum
    );

    this.state = {
      width: ViewWidth, // 显示区域宽度
      height: 400, // 显示区域高度
      lineColors: COLOR_THEME, // 颜色主题

      dataset, // 曲线数据, 包含所有曲线

      brushWidth: 1600,
      brushStartIndex: startIndex, // 起点序号
      brushEndIndex: endIndex, // 终点序号
      autoDispatchWhenRangeChange: true,

      step, // 步长

      customLinesPreview: [
        {
          tickValue: '_894', // 需要渲染的刻度值
          strokeWidth: 2, // 线段宽度
          strokeColor: 'green', // 线段颜色
        },
        {
          tickValue: '_6666', // 需要渲染的刻度值
          strokeWidth: 2, // 线段宽度
          strokeColor: 'blue', // 线段颜色
        },
      ],
      yAxis: {
        splitLine: {
          show: true,
          strokeWidth: 1,
        },
      },
      xAxis: {
        splitLine: {
          show: true,
          strokeWidth: 1,
        },
        customLines: [
          {
            tickValue: '_894', // 需要渲染的刻度值
            strokeWidth: 2, // 线段宽度
            strokeColor: 'green', // 线段颜色
          },
          {
            tickValue: '_6666', // 需要渲染的刻度值
            strokeWidth: 2, // 线段宽度
            strokeColor: 'blue', // 线段颜色
          },
        ],
      },
    };

    this.startIndexRef = React.createRef();
    this.endIndexRef = React.createRef();
  }

  /**
   * 获取所有曲线的数据
   * @param {*} start 起点序号
   * @param {*} end 终点序号
   * @param {*} number 曲线数量
   */
  getDataConfig = (start, end, number = 1) => {
    let endIndex = end;
    const startIndex = start;
    if (end >= TotalSum) {
      endIndex = TotalSum - 1;
    }
    const sstep = getStep(startIndex, endIndex, ViewWidth);
    console.log(sstep);
    const step = 1;

    // const step = getStep(startIndex, endIndex, ViewWidth);

    const dataset = [];

    for (let i = 0; i < number; i += 1) {
      dataset.push({
        data: getDataByStep(step, TotalSum),
        name: `kkk_${i}`,
      });
    }

    return {
      startIndex,
      endIndex,
      step,
      dataset,
    };
  };

  /**
   * 设置数据
   */
  setDataConfig = (start, end) => {
    const { startIndex, endIndex, step, dataset } = this.getDataConfig(
      start,
      end,
      lineNum
    );
    this.setState({
      brushStartIndex: startIndex,
      brushEndIndex: endIndex,
      step,
      dataset,
    });
  };

  /**
   * 改变dataset的上限和下限区间
   */
  changeDataSetByIndex = () => {
    const startIndex = +this.startIndexRef.current.value;
    const endIndex = +this.endIndexRef.current.value;

    this.setDataConfig(startIndex, endIndex);
  };

  handleRangeChange = (indexObj) => {
    const { autoDispatchWhenRangeChange } = this.state;
    if (autoDispatchWhenRangeChange) {
      return;
    }
    const { startIndex, endIndex } = indexObj;
    this.setDataConfig(startIndex, endIndex);
  };

  handleTendencyClick = (state) => {
    const { dataset } = this.state;
    // 获取刻度坐标在原始数据中的序号，得出间隔线之间的距离
    let separatorNum = 0;
    dataset[0].data.some((item, index) => {
      if (item.text === state.activeTick.value) {
        separatorNum = index;
        return true;
      }
      return false;
    });
    this.setState({
      customLinesPreview: [],
      xAxis: {
        splitLine: {
          show: true,
        },

        customLines: [
          (xaxisProps) => {
            const { dataIndex } = xaxisProps.axis;

            const domainSource = xaxisProps.axis.domain;

            /**
             * @param {number} tickIndex 当前显示的数据序号
             */
            function judgeSeparatorTick(tickIndex) {
              if (!separatorNum || separatorNum <= 0) {
                return false;
              }

              const originTickIndex = dataIndex.startIndex + tickIndex;
              return !!originTickIndex && originTickIndex % separatorNum === 0;
            }

            const ticks = [];

            domainSource.forEach((entry, index) => {
              if (judgeSeparatorTick(index)) {
                ticks.push({
                  tickValue: entry, // 需要渲染的刻度值
                  strokeWidth: 2, // 线段宽度
                  strokeColor: '#A94442', // 线段颜色
                });
              }
            });

            return ticks;
          },
        ],
      },
    });
  };

  render() {
    const {
      brushWidth,
      brushStartIndex,
      brushEndIndex,
      autoDispatchWhenRangeChange,

      step: sss,

      width,
      height,
      dataset,

      lineColors,

      xAxis,
      yAxis,

      customLinesPreview,
    } = this.state;
    console.log('dataset:', { dataset, brushStartIndex, brushEndIndex, sss });
    const step = 1;
    return (
      <div>
        <div
          style={{
            padding: '50px',
          }}
        >
          <Brush
            dispatcher={dispatcher}
            width={brushWidth}
            height={80}
            // length={TotalSum}
            // length={dataset[0].data.length}
            // startIndex={brushStartIndex}
            // endIndex={brushEndIndex}
            startIndex={0}
            endIndex={dataset[0].data.length - 1}
            step={step}
            autoDispatchWhenRangeChange={autoDispatchWhenRangeChange}
            onRangeChange={this.handleRangeChange}
            lineDataSet={dataset[0].data}
            previewLines={customLinesPreview}
          />

          <Legend dispatcher={dispatcher} />

          <TendencyChart
            dataset={dataset}
            lineColors={lineColors}
            width={width}
            height={height}
            dispatcher={dispatcher}
            // grid={{
            //   top: 20,
            //   right: 20,
            //   left: 30,
            //   bottom: 20,
            // }}
            // maxValue={100}
            // minValue={-0.22}
            // startIndex={brushStartIndex}
            // endIndex={brushEndIndex}
            tooltip={{ show: true }}
            formatDispatrchIndex={(indexObj) => {
              const { startIndex, endIndex } = indexObj;

              const nextStep = step;

              const nextIndex = {
                startIndex: Brush.getTendencyIndexByStep(
                  'start',
                  startIndex,
                  nextStep,
                  dataset[0].data.length
                ),
                endIndex: Brush.getTendencyIndexByStep(
                  'end',
                  endIndex,
                  nextStep,
                  dataset[0].data.length
                ),
              };
              return nextIndex;
            }}
            xAxis={xAxis}
            yAxis={yAxis}
            onClick={this.handleTendencyClick}
          />

          <TendencyChart
            dataset={dataset}
            lineColors={lineColors}
            width={width}
            height={height}
            dispatcher={dispatcher}
            hasLegend
            // grid={{
            //   top: 20,
            //   right: 20,
            //   left: 30,
            //   bottom: 20,
            // }}
            // maxValue={100}
            // minValue={-0.22}
            // startIndex={brushStartIndex}
            // endIndex={brushEndIndex}
            tooltip={{ show: true }}
            formatDispatrchIndex={(indexObj) => {
              const { startIndex, endIndex } = indexObj;

              const nextStep = step;

              const nextIndex = {
                startIndex: Brush.getTendencyIndexByStep(
                  'start',
                  startIndex,
                  nextStep,
                  dataset[0].data.length
                ),
                endIndex: Brush.getTendencyIndexByStep(
                  'end',
                  endIndex,
                  nextStep,
                  dataset[0].data.length
                ),
              };
              return nextIndex;
            }}
            xAxis={xAxis}
            yAxis={yAxis}
            onClick={this.handleTendencyClick}
          />

          <p />
          <div>
            <ul>
              <li>
                <span>start index</span>
                <input type="number" ref={this.startIndexRef} />
              </li>
              <li>
                <span>end index</span>
                <input type="number" ref={this.endIndexRef} />
              </li>
              <li>
                <button type="button" onClick={this.changeDataSetByIndex}>
                  changeDataSetByIndex
                </button>
              </li>
            </ul>

            <p />

            <button
              type="button"
              onClick={() => {
                this.setState({
                  autoDispatchWhenRangeChange: !autoDispatchWhenRangeChange,
                });
              }}
            >
              当拖动handle至range改变时，是否自动发送数据给tendency ?
              {autoDispatchWhenRangeChange ? '发送' : '不发送'}
            </button>

            <p />

            <button
              type="button"
              onClick={() => {
                this.setState({
                  width: 2000,
                  height: 900,
                });
              }}
            >
              改变显示区域宽高
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Example1;
