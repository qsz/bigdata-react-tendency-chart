/**
 * 模拟起始结束序号和可视区域宽度获取步长
 * @param {*} startIndex
 * @param {*} endIndex
 * @param {*} width
 */
export function getStep(startIndex, endIndex, width) {
  return parseInt((endIndex - startIndex) / width, 10) + 1;
}

/**
 * 模拟获取1条曲线的数据
 * @param {*} val
 * @param {*} text
 */
export function getRandomData(val = 500, text = 'text_') {
  const temp = [];
  for (let i = 0; i < val; i += 1) {
    const item = Math.random() * 100 - Math.random() * 50;
    temp.push({
      value: +Math.abs(item).toFixed(0),
      text: text + i,
    });
  }

  return temp;
}

export function getOriginData(total) {
  const data = [];
  let toTalData = getRandomData(total);
  for (let i = 0; i < toTalData.length; i += 1) {
    data.push(toTalData[i]);
  }
  toTalData = null;
  return data;
}

/**
 * 根据step获取一条曲线的数据
 * @param {*} step
 * @param {*} total
 */
export function getDataByStep(step, total) {
  const data = [];
  let toTalData = getRandomData(total);
  for (let i = 0; i < toTalData.length; i += step) {
    data.push(toTalData[i]);
  }
  toTalData = null;
  return data;
}
