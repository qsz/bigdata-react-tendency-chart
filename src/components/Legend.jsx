import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as d3Path from 'd3-path';
import { isNil, map } from 'lodash';
import uuid from '../utils/uuid';
import { LEGENDMOUNT, LEGENDCLICK, LEGENDRECEIVEDATA } from './Dispatcher';

const VIEWBOX_SIZE = 32;
const ICON_SIZE = 18;
const ICON_LINE_WIDTH = 5;

const LIST_STYLE = {
  padding: 0,
  margin: 0,
  textAlign: 'center',
};
const ITEM_STYLE = {
  display: 'inline-block',
  marginRight: 25,
};

const SVG_STYLE = {
  display: 'inline-block',
  verticalAlign: 'middle',
  marginRight: 5,
};

const INACTIVE_COLOR = '#ccc';
const DEFAULT_TEXT_COLOR = '#7e7e7e';

export default class Legend extends Component {
  static propTypes = {
    dispatcher: PropTypes.object,
  };

  static defaultProps = {
    dispatcher: null,
  };

  constructor(props) {
    super(props);
    this.uuid = uuid();
    this.state = {
      data: null,
    };
  }

  componentDidMount() {
    this.getDataFromChartWhenMount();
  }

  componentWillUnmount() {
    const { dispatcher } = this.props;
    if (!isNil(dispatcher)) {
      dispatcher.remove();
    }
  }

  getDataFromChartWhenMount = () => {
    const { dispatcher } = this.props;
    if (!isNil(dispatcher)) {
      // 接收chart的数据
      dispatcher.register(LEGENDRECEIVEDATA, this.uuid, this.handleReceiveData);

      // 当chart比legend先挂载, 等挂载完, 发送获取数据的请求给chart
      dispatcher.emit(LEGENDMOUNT);
    }
  };

  handleReceiveData = (data) => {
    this.setState({
      data,
    });
  };

  renderIcon = () => {
    const context = d3Path.path();

    const lineCenterY = VIEWBOX_SIZE / 2;
    const arcR = ICON_SIZE / 2 - ICON_LINE_WIDTH;

    context.moveTo(0, lineCenterY);
    context.lineTo(ICON_LINE_WIDTH, lineCenterY);

    context.arc(ICON_SIZE / 2, lineCenterY, arcR, 0, Math.PI * 2);

    context.moveTo(ICON_LINE_WIDTH + arcR * 2, lineCenterY);
    context.lineTo(ICON_LINE_WIDTH + arcR * 2 + ICON_LINE_WIDTH, lineCenterY);

    return context.toString();
  };

  renderItem = () => {
    const { data } = this.state;

    if (isNil(data)) {
      return null;
    }
    return map(data, (item, index) => {
      const { color, name, active } = item;
      const pathColor = active ? color : INACTIVE_COLOR;
      const textColor = active ? DEFAULT_TEXT_COLOR : INACTIVE_COLOR;
      const itemName = !isNil(name) ? name : '';
      return (
        <li
          className="tendency-legend-item"
          key={`tendency-legend-item-${index}`}
          style={{ ...ITEM_STYLE }}
        >
          <svg
            className="tendency-legend-item-icon"
            width={ICON_SIZE}
            height={VIEWBOX_SIZE}
            viewBox={`0 0 ${ICON_SIZE} ${VIEWBOX_SIZE}`}
            style={{ ...SVG_STYLE }}
          >
            <path
              stroke={pathColor}
              fill={pathColor}
              strokeWidth="1"
              d={this.renderIcon()}
              style={{
                cursor: 'pointer',
              }}
              onClick={(e) => {
                this.handleItemClick(item, index, e);
              }}
            />
          </svg>
          <span
            className="tendency-legend-item-text"
            style={{
              color: textColor,
            }}
          >
            {itemName}
          </span>
        </li>
      );
    });
  };

  handleItemClick = (item, index) => {
    const { dispatcher } = this.props;
    dispatcher.emit(LEGENDCLICK, index);
  };

  render() {
    return (
      <div className="tendency-legend-container">
        <ul className="tendency-legend-list" style={{ ...LIST_STYLE }}>
          {this.renderItem()}
        </ul>
      </div>
    );
  }
}
