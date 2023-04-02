import * as d3Dispatch from 'd3-dispatch';
import {
  isFunction,
  isNil,
  isArray,
  isString,
  forEach,
  remove,
  get,
  indexOf,
  keys,
} from 'lodash';

const CHARTMOUNT = 'chartMount'; // 图表挂载事件
const BRUSHMOUNT = 'brushMount'; // 挂载事件
const BRUSHMOVE = 'brushMove'; // 拖动事件
const TOOLTIPMOVE = 'toolTipMove'; // 移动事件
const TOOLTIPLEAVE = 'toolTipLeave'; // 超出区域
const LEGENDMOUNT = 'legendMount'; // legend挂载
const LEGENDCLICK = 'legendClick'; // legend点击
const LEGENDRECEIVEDATA = 'legendReceiveData'; // 接收data

class Dispatcher {
  constructor() {
    this.dispatcher = null;
  }

  // eslint-disable-next-line class-methods-use-this
  get eventTypes() {
    return {
      ChartEventTypes: [CHARTMOUNT],
      BrushEventTypes: [BRUSHMOUNT, BRUSHMOVE],
      TooltipEventTypes: [TOOLTIPMOVE, TOOLTIPLEAVE],
      LegendEventTypes: [LEGENDMOUNT, LEGENDCLICK, LEGENDRECEIVEDATA],
    };
  }

  get registeredEventTypes() {
    return get(this, ['dispatcher', '_'], {});
  }

  /**
   * 创建分发器
   * @param {array} dispatchTypes 事件type数组 [string]
   */
  createDispatch(dispatchTypes) {
    if (isArray(dispatchTypes)) {
      this.dispatcher = d3Dispatch.dispatch(...dispatchTypes);
    } else if (isString(dispatchTypes)) {
      this.dispatcher = d3Dispatch.dispatch(dispatchTypes);
    } else {
      this.dispatcher = {};
    }

    this.dispatcher.eventList = [];
    return this.dispatcher;
  }

  /**
   * 添加type回调函数
   * @param {array|string} dispatchEvents [{type, name, callback}] | string
   * @param {array|string} eventsName string
   * @param {function} cb
   */
  register(dispatchEvents, eventsName, cb) {
    const { dispatcher } = this;
    if (dispatcher && isArray(dispatchEvents)) {
      forEach(dispatchEvents, ({ type, name, callback }) => {
        if (this.isEmitRegister(type)) {
          const typeName = name ? `${type}.${name}` : type;
          dispatcher.on(typeName, (...data) => {
            if (isFunction(callback)) {
              callback(...data);
            }
          });
          dispatcher.eventList.push(typeName);
        }
      });
    }
    if (dispatcher && isString(dispatchEvents)) {
      if (this.isEmitRegister(dispatchEvents)) {
        const typeName = eventsName
          ? `${dispatchEvents}.${eventsName}`
          : dispatchEvents;
        dispatcher.on(typeName, (...data) => {
          if (isFunction(cb)) {
            cb(...data);
          }
        });
        dispatcher.eventList.push(typeName);
      }
    }
  }

  /**
   * 移除回调函数
   */
  remove(typeName) {
    if (isNil(typeName)) {
      forEach(this.dispatcher.eventList, (event) => {
        this.dispatcher.on(event, null);
      });
      this.dispatcher.eventList = [];
    } else if (isArray(typeName)) {
      forEach(typeName, (event) => {
        this.dispatcher.on(event, null);
        remove(this.dispatcher.eventList, (item) => item === event);
      });
    } else if (isString(typeName)) {
      this.dispatcher.on(typeName, null);
      remove(this.dispatcher.eventList, (item) => item === typeName);
    }
  }

  /**
   * 调用事件，触发对应的回调
   * @param {string} type
   * @param {*} data
   */
  emit(type, ...data) {
    try {
      if (this.isEmitRegister(type)) {
        this.dispatcher.call(type, this, ...data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * 判断emit是否已经创建
   * @param {string} type
   */
  isEmitRegister(type) {
    const registeredEventTypes = keys(get(this, ['registeredEventTypes'], {}));
    if (indexOf(registeredEventTypes, type) > -1) {
      return true;
    }
    return false;
  }
}

export {
  CHARTMOUNT,
  BRUSHMOUNT,
  BRUSHMOVE,
  TOOLTIPMOVE,
  TOOLTIPLEAVE,
  LEGENDMOUNT,
  LEGENDCLICK,
  LEGENDRECEIVEDATA,
};

export default Dispatcher;
