import { isNil, forEach } from 'lodash';

const stringCache = {
  widthCache: {},
  cacheCount: 0,
};
const MAX_CACHE_NUM = 1000;
const MEASUREMENT_TEXT_ID = 'tendency-measurement-text';
const TEXT_STYLE = {
  position: 'absolute',
  top: '-20000px',
  left: 0,
};

const PREFIX_LIST = ['Webkit', 'Moz', 'O', 'ms'];
const TRANSLATE_VALUE_PREFIX_LIST = ['-webkit-', '-moz-', '-o-', '-ms-'];

export const addTranslatePREFIX = (name, value) => {
  const nameList = name.split('');
  const upperWord = nameList[0].toUpperCase();
  const other = nameList.slice(1).join('');
  const isTransition = name === 'transition';
  const originStyle = {};
  originStyle[name] = value;
  return PREFIX_LIST.reduce((result, prefix, i) => {
    const style = {};
    const formatPrefixName = `${prefix}${upperWord}${other}`;
    let prefixValue = value;
    if (isTransition) {
      prefixValue = `${TRANSLATE_VALUE_PREFIX_LIST[i]}${value}`;
    }
    style[formatPrefixName] = prefixValue;

    return {
      ...result,
      ...style,
    };
  }, originStyle);
};

export const getRealOffset = (el) => {
  const html = el.ownerDocument.documentElement;
  let box = { top: 0, left: 0 };

  if (typeof el.getBoundingClientRect !== 'undefined') {
    box = el.getBoundingClientRect();
  }

  // [window.pageYOffset](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/pageYOffset)
  // [Element.clientTop](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/clientTop)
  return {
    top: box.top + window.pageYOffset - html.clientTop,
    left: box.left + window.pageXOffset - html.clientLeft,
  };
};

/**
 * 获取趋势图中文字的宽高
 * @param {string} text
 * @param {number} size
 * @param {string} group
 */
export const getTendencyStringSize = (text, size = 10, group) => {
  let measurementText = document.getElementById(MEASUREMENT_TEXT_ID);

  const string = text;

  let stringKey = `${string}_${size}`;
  if (!isNil(group)) {
    stringKey = `tendency_${group}_${`${text}`.length}`;
  }
  const textFontSize = size;

  if (!isNil(stringCache.widthCache[stringKey])) {
    return { ...stringCache.widthCache[stringKey] };
  }

  if (isNil(measurementText)) {
    const measurementSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );

    forEach(Object.keys(TEXT_STYLE), (name) => {
      measurementSvg.style[name] = TEXT_STYLE[name];
    });

    const textFontFamily = 'sans-serif';

    measurementText = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text'
    );
    measurementText.setAttribute('id', MEASUREMENT_TEXT_ID);
    measurementText.setAttribute('font-family', textFontFamily);
    measurementText.setAttribute('x', 0);
    measurementText.setAttribute('y', textFontSize * 1.5);

    measurementText.setAttribute('font-size', textFontSize);
    measurementText.textContent = string;

    measurementSvg.appendChild(measurementText);
    document.body.appendChild(measurementSvg);
  } else {
    measurementText.setAttribute('font-size', textFontSize);
    measurementText.textContent = string;
  }

  const { width, height } = measurementText.getBoundingClientRect();
  const result = {
    width,
    height,
    text,
  };

  stringCache.widthCache[stringKey] = { ...result };

  if (++stringCache.cacheCount > MAX_CACHE_NUM) {
    stringCache.widthCache = {};
    stringCache.cacheCount = 0;
  }

  return result;
};
