const thresholdGroups = [
  { key: 'workingTemperature', label: '工作温度', fields: [['workingTemperatureMin', '最小值'], ['workingTemperatureMax', '最大值']] },
  { key: 'storageTemperature', label: '储存温度', fields: [['storageTemperatureMin', '最小值'], ['storageTemperatureMax', '最大值']] },
  { key: 'workingHumidity', label: '工作湿度', fields: [['workingHumidityMin', '最小值'], ['workingHumidityMax', '最大值']] },
  { key: 'storageHumidity', label: '储存湿度', fields: [['storageHumidityMin', '最小值'], ['storageHumidityMax', '最大值']] },
  { key: 'noiseLimit', label: '噪音', fields: [['noiseLimitValue', '上限值']] },
  { key: 'altitudeLimit', label: '海拔高度', fields: [['altitudeLimitValue', '上限值']] }
];

const groupByFieldKey = new Map();

for (const group of thresholdGroups) {
  for (const [fieldKey, limitLabel] of group.fields) {
    groupByFieldKey.set(fieldKey, { group, limitLabel });
  }
}

// Convert a flat schema into render items without changing its persisted field keys.
export function groupThresholdFields(fields = []) {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
  const renderedGroupKeys = new Set();
  const items = [];

  for (const field of fields) {
    const metadata = groupByFieldKey.get(field.key);
    if (!metadata) {
      items.push({ type: 'field', key: field.key, field });
      continue;
    }

    if (renderedGroupKeys.has(metadata.group.key)) {
      continue;
    }

    const groupedFields = metadata.group.fields
      .map(([fieldKey, limitLabel]) => {
        const groupedField = fieldsByKey.get(fieldKey);
        return groupedField ? { ...groupedField, limitLabel } : null;
      })
      .filter(Boolean);

    renderedGroupKeys.add(metadata.group.key);
    items.push({
      type: 'threshold-group',
      key: metadata.group.key,
      label: metadata.group.label,
      fields: groupedFields,
      paired: groupedFields.length > 1,
      description: groupedFields.length === 1 ? groupedFields[0].description || '' : ''
    });
  }

  // Business display order places altitude before the IP protection field,
  // while persisted schema order and field keys remain unchanged.
  const altitudeIndex = items.findIndex((item) => item.key === 'altitudeLimit');
  const ipProtectionIndex = items.findIndex((item) => item.key === 'ipProtectionLevel');
  if (altitudeIndex >= 0 && ipProtectionIndex >= 0) {
    [items[altitudeIndex], items[ipProtectionIndex]] = [items[ipProtectionIndex], items[altitudeIndex]];
  }

  return items;
}
