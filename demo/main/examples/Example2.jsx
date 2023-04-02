/* eslint-disable import/no-unresolved */
/* eslint-disable  */
import React, { useState, useEffect } from 'react';
import {
  TendencyChart,
  Brush,
  Dispatcher,
  Legend,
} from 'bigdata-react-tendency-chart';

import { merge, map } from 'lodash';

import { data1, data2 } from './mockTendencyData';

const dispatcher = new Dispatcher();

dispatcher.createDispatch(
  [].concat(
    dispatcher.eventTypes.ChartEventTypes,
    dispatcher.eventTypes.BrushEventTypes
    // dispatcher.eventTypes.TooltipEventTypes,
    // dispatcher.eventTypes.LegendEventTypes
  )
);

const defaultXAxis = {
  tickNumber: 10,
  tickInterval: 3,
  splitLine: {
    show: true,
    strokeWidth: 1,
  },
  customLines: [],
  linear: true,
};

const defaultYAxis = {
  splitLine: {
    show: true,
    strokeWidth: 1,
  },
};

const DataFrequencyTendency = () => {
  const [xAxis, setXAxis] = useState(defaultXAxis);
  const [dataset, setDataset] = useState([]);
  const [customLinesPreview, setCustomLinesPreview] = useState([]);

  useEffect(() => {
    const nextdataset = [];
    const nextlineData = map(data1, ({ axis, value }) => {
      return {
        text: axis,
        value: value,
      };
    });
    nextdataset.push({
      data: nextlineData,
      name: '#1',
    });

    const lineData2 = [
      { text: 0.0, value: -2.125604 },
      { text: 0.237, value: -4.347826 },
      { text: 0.302, value: -3.091787 },
      { text: 0.306, value: 4.444444 },
      { text: 0.521, value: 3.285024 },
      { text: 0.808, value: 2.125604 },
      { text: 0.996, value: 0.193237 },
    ];
    nextdataset.push({
      data: lineData2,
      name: '#2',
    });
    setDataset(nextdataset);
  }, []);

  const otherLines = [
    {
      tickValue: -56.640625,
      strokeWidth: 1,
      strokeColor: 'green',
    },
  ];

  const handleTendencyClick = (state) => {
    let clickVal = null;
    lineData.some((item) => {
      if (item.text === state.activeTick.value) {
        clickVal = item.text;
        return true;
      }
      return false;
    });
    const separatorVal = clickVal - lineData[0].text;

    let nextPreviewVal = clickVal;
    const previewTicks = [];
    while (nextPreviewVal <= lineData[lineData.length - 1].text) {
      previewTicks.push({
        tickValue: nextPreviewVal, // 需要渲染的刻度值
        strokeWidth: 1, // 线段宽度
        strokeColor: '#A94442', // 线段颜色
      });
      nextPreviewVal += separatorVal;
    }
    setCustomLinesPreview([...otherLines, ...previewTicks]);

    setXAxis(
      merge({}, defaultXAxis, {
        customLines: [
          (xaxisProps) => {
            const domainSource = xaxisProps.axis.domain;
            const ticks = [];
            let nextVal = clickVal;

            while (nextVal <= domainSource[domainSource.length - 1]) {
              ticks.push({
                tickValue: nextVal, // 需要渲染的刻度值
                strokeWidth: 2, // 线段宽度
                strokeColor: '#A94442', // 线段颜色
              });
              nextVal += separatorVal;
            }

            console.log("ticks:::", {
              ticks
            })

            return ticks;
          },
          ...otherLines,
        ],
      })
    );
  };

  const lineData = dataset[0] ? dataset[0].data : [];

  console.log(xAxis, "xAxis")

  return (
    <div>
      <Legend dispatcher={dispatcher} />
      <TendencyChart
        dispatcher={dispatcher}
        width={1500}
        height={500}
        dataset={dataset}
        lineColors={['#00FFFF', '#FFD700']}
        tooltip={{ show: true }}
        onClick={handleTendencyClick}
        xAxis={xAxis}
        yAxis={defaultYAxis}
      />

      <Brush
        dispatcher={dispatcher}
        width={1500}
        height={50}
        lineDataset={lineData}
        startIndex={0}
        endIndex={lineData.length - 1}
        previewLines={customLinesPreview}
        linear
      />

      <button
        type="button"
        onClick={() => {
          // setXAxis(
          //   merge({}, defaultXAxis, {
          //     customLines: [...otherLines],
          //   })
          // );
          // setCustomLinesPreview([...otherLines]);

          const nextdataset = [];
          const nextlineData = map(data1, ({ axis, value }) => {
            return {
              text: axis,
              value: value,
            };
          });
          nextdataset.push({
            data: nextlineData,
            name: '#1',
          });

          const nextlineData2 = map(data2, ({ axis, value }) => {
            return {
              text: axis,
              value: value,
            };
          });
          nextdataset.push({
            data: nextlineData2,
            name: '#2',
          });

          setDataset(nextdataset);
        }}
      >
        setDataset
      </button>
    </div>
  );
};

export default DataFrequencyTendency;
