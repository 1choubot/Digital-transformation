export function isFormValueEmpty(value) {
  if (Array.isArray(value)) {
    return value.every((item) => isFormValueEmpty(item));
  }
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (typeof value === 'number') {
    return Number.isNaN(value);
  }
  return false;
}

export function getRequiredFieldErrorMessage(field) {
  const action = field?.type === 'image'
    ? '请上传'
    : field?.type === 'select' || field?.type === 'score' || field?.type === 'date'
      ? '请选择'
      : '请填写';
  return `${action}${field?.label || '该必填项'}`;
}

export function getMissingRequiredFields(fields, model, options = {}) {
  const includeField = typeof options.includeField === 'function' ? options.includeField : () => true;
  const getImages = typeof options.getImages === 'function' ? options.getImages : () => [];

  return (fields || [])
    .filter((field) => field?.required === true && includeField(field))
    .filter((field) => {
      if (field.type === 'image') {
        return getImages(field).length === 0;
      }
      return isFormValueEmpty(model?.[field.key]);
    })
    .map((field) => ({
      key: field.key,
      label: field.label || field.key,
      type: field.type || 'text',
      message: getRequiredFieldErrorMessage(field)
    }));
}
