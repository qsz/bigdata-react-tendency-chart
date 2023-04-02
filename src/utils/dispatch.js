import * as d3Dispatch from 'd3-dispatch';
import { isFunction, isNil } from 'lodash';

let DispatchIndex = 0;

/**
 * 调用所有相关name回调
 * @param {object} dispatchObj
 */
const structureDispatchCall = (dispatchObj) => {
  /**
   * @param {string} name 事件名称
   * @param {string} dispatchId 当前id
   * @param {any} data 传递的数据
   */
  return (name, dispatchId, data) => {
    if (!isNil(dispatchId)) {
      dispatchObj.call(name, null, dispatchId, data);
    }
  };
};

/**
 * 注册回调函数
 * @param {object} dispatchObj
 */
const structureDispatchReceive = (dispatchObj) => {
  /**
   * @param {string} name 事件名称
   * @param {string} dispatchId 当前id
   * @param {function} callback
   */
  return (name, dispatchId, callback) => {
    if (!isNil(dispatchId)) {
      DispatchIndex += 1;
      const typename = `${name}.${dispatchId}_${DispatchIndex}`;
      dispatchObj.on(typename, (fromId, data) => {
        if (fromId === dispatchId && isFunction(callback)) {
          const callbackData = !isNil(data) ? data : {};
          callback(callbackData, fromId);
        }
      });
      return typename;
    }
    return null;
  };
};

/**
 * 移除回调函数
 * @param {object} dispatchObj
 */
const structureDispatchRemove = (dispatchObj) => {
  return (name) => {
    dispatchObj.on(name, null);
  };
};

const BrushDispatch = d3Dispatch.dispatch('mount', 'brush');
const TooltipDispatch = d3Dispatch.dispatch('move', 'leave');
const LegendDispatch = d3Dispatch.dispatch('mount', 'click', 'receiveData');

const BrushDispatchCall = structureDispatchCall(BrushDispatch);
const BrushDispatchReceive = structureDispatchReceive(BrushDispatch);
const BrushDispatchRemove = structureDispatchRemove(BrushDispatch);

const TooltipDispatchCall = structureDispatchCall(TooltipDispatch);
const TooltipDispatchReceive = structureDispatchReceive(TooltipDispatch);
const TooltipDispatchRemove = structureDispatchRemove(TooltipDispatch);

const LegendDispatchCall = structureDispatchCall(LegendDispatch);
const LegendDispatchReceive = structureDispatchReceive(LegendDispatch);
const LegendDispatchRemove = structureDispatchRemove(LegendDispatch);

export {
  BrushDispatchCall,
  BrushDispatchReceive,
  BrushDispatchRemove,
  TooltipDispatchCall,
  TooltipDispatchReceive,
  TooltipDispatchRemove,
  LegendDispatchCall,
  LegendDispatchReceive,
  LegendDispatchRemove,
};
