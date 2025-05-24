/**
 * 根据单位格式化数值
 * @param {number|string} value - 要格式化的值
 * @param {string} unit - 单位，可以是'mm', 'um', 'deg', 'rad'等
 * @returns {string} 格式化后的字符串
 */
export function formatByUnit(value, unit) {
  if (value === undefined || value === null) return '--';
  
  // 确保value是数字
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '--';
  
  switch (unit) {
    case 'mm':
      return numValue.toFixed(3); // 毫米显示3位小数
    case 'um':
      return Math.round(numValue).toString(); // 微米取整
    case 'deg':
      return numValue.toFixed(2); // 角度显示2位小数
    case 'rad':
      return numValue.toFixed(4); // 弧度显示4位小数
    default:
      return numValue.toString();
  }
}

/**
 * 根据单位转换数值
 * @param {number|string} value - 需要转换的值
 * @param {string} fromUnit - 源单位，'mm' 或 'um'
 * @param {string} toUnit - 目标单位，'mm' 或 'um'
 * @returns {number} 转换后的数值
 */
export function convertUnitValue(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return parseFloat(value);
  
  const factor = fromUnit === 'mm' ? 1000 : 0.001;
  return parseFloat(value) * factor;
}

/**
 * 验证数值输入
 * @param {Event} event - 输入事件对象
 * @param {Object} refValue - 存储数值的ref对象
 * @param {number} minValue - 最小允许值
 */
export function validateNumericInput(event, refValue, minValue = 0) {
  let value = event.target.value;
  
  // 确保值是数字
  if (value === '' || isNaN(parseFloat(value))) {
    refValue.value = minValue;
    return;
  }
  
  // 转换为数字并检查最小值
  let numValue = parseFloat(value);
  if (numValue < minValue) {
    refValue.value = minValue;
  } else {
    refValue.value = numValue;
  }
}

/**
 * 检查轴位置是否达到限制
 * @param {number} position - 当前位置
 * @param {number} step - 步进值
 * @param {Object} limits - 限制对象，包含min和max属性
 * @param {number} direction - 移动方向，1为正方向，-1为负方向
 * @returns {boolean} 如果达到限制返回true，否则返回false
 */
export function isAxisLimitReached(position, step, limits, direction) {
  if (!limits) return false;
  
  if (direction > 0) {
    return position + step > limits.max;
  } else {
    return position - step < limits.min;
  }
}

/**
 * 根据单位调整值
 * @param {Object} values - 包含多个值的对象
 * @param {string} newUnit - 新单位
 * @param {string} oldUnit - 旧单位
 * @returns {Object} 调整后的值对象
 */
export function adjustValuesByUnit(values, newUnit, oldUnit) {
  const result = { ...values };
  
  if (newUnit === oldUnit) return result;
  
  const conversionFactor = getConversionFactor(oldUnit, newUnit);
  
  for (const key in result) {
    if (typeof result[key] === 'number') {
      result[key] = result[key] * conversionFactor;
    }
  }
  
  return result;
}

/**
 * 获取单位转换系数
 * @param {string} fromUnit - 源单位
 * @param {string} toUnit - 目标单位
 * @returns {number} 转换系数
 */
function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === 'mm' && toUnit === 'um') return 1000;
  if (fromUnit === 'um' && toUnit === 'mm') return 0.001;
  if (fromUnit === 'deg' && toUnit === 'rad') return Math.PI / 180;
  if (fromUnit === 'rad' && toUnit === 'deg') return 180 / Math.PI;
  return 1; // 相同单位或未知单位
} 