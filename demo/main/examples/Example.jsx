/* eslint-disable  */
import React from 'react';
import {
  TendencyChart,
  Brush,
  Dispatcher,
  Legend,
} from 'bigdata-react-tendency-chart';

const dispatcher = new Dispatcher();

dispatcher.createDispatch(
  [].concat(
    dispatcher.eventTypes.ChartEventTypes,
    dispatcher.eventTypes.BrushEventTypes,
    dispatcher.eventTypes.TooltipEventTypes,
    dispatcher.eventTypes.LegendEventTypes
  )
);

const Demo = () => {
  const dataset_1 = []
  for (let i = 0; i < 1000; i += 1) {
    dataset_1.push({
      text: i,
      value: Math.random() * 100
    });
  }

  const dataset_2 = []
  for (let i = 0; i < 1000; i += 1) {
    dataset_2.push({
      text: i,
      value: Math.random() * 20 + 20
    });
  }


  return (
    <>
      <div style={{
        width: '600px'
      }}>
        <Legend dispatcher={dispatcher} />
      </div>

      <div style={{
        display: 'flex'
      }}>
        <TendencyChart
          width={600}
          height={300}
          dataset={[{
            data: dataset_1,
            name: '趋势1'
          }, {
            data: dataset_2,
            name: '趋势2'
          }]}
          tooltip={{ show: true }}
          lineColors={['#00FFFF', '#FFDEAD']}
          startIndex={0}
          endIndex={1000}
          dispatcher={dispatcher}
          xAxis={{
            customLines: [
              (xaxisProps) => {
                const domainSource = xaxisProps.axis.domain;
                const ticks = [];
                let nextVal = 200;

                while (nextVal <= domainSource[domainSource.length - 1]) {
                  ticks.push({
                    tickValue: nextVal, // 需要渲染的刻度值
                    strokeWidth: 2, // 线段宽度
                    strokeColor: '#228B22', // 线段颜色
                  });
                  nextVal += 100;
                }

                return ticks;
              },
              {
                strokeColor: "#A94442",
                strokeWidth: 2,
                tickValue: 798,
              }
            ]
          }}
        />
      </div>

      <Brush
        dispatcher={dispatcher}
        width={600}
        height={40}
        lineDataset={dataset_1}
        startIndex={0}
        endIndex={1000}
        linear
        step={100}
      />
    </>
  )
};

export default Demo;
