/**
 * 根据单位格式化数值，在mm模式下显示3位小数，在um模式下显示整数
 * @param {number|string} value - 需要格式化的值
 * @param {string} unit - 单位，'mm' 或 'um'
 * @param {number} precision - mm模式下的小数位数，默认为3
 * @returns {string} 格式化后的字符串
 */
export function formatByUnit(value, unit, precision = 3) {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '';
  
  if (unit === 'mm') {
    return numValue.toFixed(precision);
  }
  return Math.round(numValue).toString();
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
 * 验证数值输入，确保在指定范围内
 * @param {Event} event - 输入事件
 * @param {Ref} valueRef - Vue响应式引用值
 * @param {number} minValue - 最小允许值
 * @param {number} maxValue - 最大允许值
 * @returns {void}
 */
export function validateNumericInput(event, valueRef, minValue, maxValue = Infinity) {
  let value = parseFloat(event.target.value);
  if (isNaN(value)) {
    return; // 如果输入无效，不更新值
  }
  
  // 确保值在允许范围内
  value = Math.max(minValue, Math.min(maxValue, value));
  
  // 更新引用值
  valueRef.value = value;
}

/**
 * 检查轴位置是否达到限制
 * @param {boolean} isConnected - 相机是否连接
 * @param {number} currentPos - 当前位置
 * @param {number} step - 步进值
 * @param {Object} limits - 轴限制对象，包含min和max属性
 * @param {number} direction - 移动方向，-1表示负向，1表示正向
 * @returns {boolean} 是否达到限制
 */
export function isAxisLimitReached(isConnected, currentPos, step, limits, direction) {
  if (!isConnected) return true;
  
  return direction < 0 
    ? currentPos - step < limits.min
    : currentPos + step > limits.max;
}

/**
 * 根据单位调整步进和速度值
 * @param {Object} values - 包含需要调整的值的对象
 * @param {string} newUnit - 新单位，'mm' 或 'um'
 * @param {Object} defaults - 默认值对象
 * @returns {Object} 调整后的值对象
 */
export function adjustValuesByUnit(values, newUnit, defaults) {
  const isMm = newUnit === 'mm';
  const factor = isMm ? 0.001 : 1000; // 从um到mm除以1000，从mm到um乘以1000
  
  const result = {};
  
  // 设置默认值
  if (defaults) {
    Object.keys(defaults).forEach(key => {
      result[key] = isMm ? defaults[key].mm : defaults[key].um;
    });
  }
  
  // 转换现有值
  if (values) {
    Object.keys(values).forEach(key => {
      if (key in values) {
        const value = parseFloat(values[key]);
        if (!isNaN(value)) {
          result[key] = isMm
            ? Number((value * factor).toFixed(3))
            : Math.round(value * factor);
        }
      }
    });
  }
  
  return result;
} 