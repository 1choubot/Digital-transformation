export const reviewRepeatableKeys = Object.freeze([
  'customerRequirements',
  'projectTargetDescription',
  'technicalRisks',
  'solutionSuggestions'
]);

export const implementationPlanSources = Object.freeze([
  { sourceType: 'requirement', sourceLabel: '需求', fieldKey: 'customerRequirements' },
  { sourceType: 'target', sourceLabel: '目标', fieldKey: 'projectTargetDescription' },
  { sourceType: 'risk', sourceLabel: '风险', fieldKey: 'technicalRisks' },
  { sourceType: 'suggestion', sourceLabel: '建议', fieldKey: 'solutionSuggestions' }
]);

function normalizeSourceText(value) {
  return String(value ?? '').trim();
}

function normalizePlanText(value) {
  return String(value ?? '').trim();
}

function sourceTextKey(sourceType, sourceText) {
  return `${sourceType}:${sourceText}`;
}

export function normalizeRepeatable(value, keepEmptyRow = true) {
  const rows = Array.isArray(value) ? value : value == null || value === '' ? [] : String(value).split(/\r?\n/);
  const normalized = rows
    .map((item) => String(item ?? ''))
    .filter((item) => item.trim() || keepEmptyRow);
  return normalized.length || !keepEmptyRow ? normalized : [''];
}

function buildPlanItemLookups(items = []) {
  const bySourceIndex = new Map();
  const bySourceIdentity = new Map();
  const bySourceText = new Map();
  const countBySourceType = new Map();
  if (!Array.isArray(items)) {
    return { bySourceIndex, bySourceIdentity, bySourceText, countBySourceType };
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const sourceType = String(item.sourceType || '').trim();
    const sourceIndex = Number(item.sourceIndex || 0);
    if (!sourceType || !Number.isSafeInteger(sourceIndex) || sourceIndex < 1) continue;
    const entry = {
      sourceType,
      sourceIndex,
      sourceText: normalizeSourceText(item.sourceText),
      planText: normalizePlanText(item.planText),
      consumed: false
    };
    countBySourceType.set(sourceType, (countBySourceType.get(sourceType) || 0) + 1);
    bySourceIndex.set(`${sourceType}:${sourceIndex}`, entry);
    bySourceIdentity.set(`${sourceType}:${sourceIndex}:${entry.sourceText}`, entry);
    if (entry.sourceText) {
      const key = sourceTextKey(sourceType, entry.sourceText);
      const entries = bySourceText.get(key) || [];
      entries.push(entry);
      bySourceText.set(key, entries);
    }
  }

  return { bySourceIndex, bySourceIdentity, bySourceText, countBySourceType };
}

function consumePlanTextBySourceIndex(lookups, sourceType, sourceIndex) {
  const entry = lookups.bySourceIndex.get(`${sourceType}:${sourceIndex}`);
  if (!entry || entry.consumed) return null;
  entry.consumed = true;
  return entry.planText;
}

function consumePlanTextBySourceIdentity(lookups, sourceType, sourceIndex, sourceText) {
  const entry = lookups.bySourceIdentity.get(`${sourceType}:${sourceIndex}:${sourceText}`);
  if (!entry || entry.consumed) return null;
  entry.consumed = true;
  return entry.planText;
}

function consumePlanTextBySourceText(lookups, sourceType, sourceText) {
  const entries = lookups.bySourceText.get(sourceTextKey(sourceType, sourceText)) || [];
  const entry = entries.find((candidate) => !candidate.consumed);
  if (!entry) return null;
  entry.consumed = true;
  return entry.planText;
}

export function buildImplementationPlanItems(source = {}) {
  const existingItems = buildPlanItemLookups(source.implementationPlanItems);
  const currentSourceTextsByType = new Map(
    implementationPlanSources.map((config) => [
      config.sourceType,
      new Set(normalizeRepeatable(source[config.fieldKey], false).map(normalizeSourceText))
    ])
  );
  const items = [];

  for (const config of implementationPlanSources) {
    const sourceLines = normalizeRepeatable(source[config.fieldKey], false).map(normalizeSourceText);
    const preserveSamePosition = (existingItems.countBySourceType.get(config.sourceType) || 0) === sourceLines.length;
    for (const [index, sourceText] of sourceLines.entries()) {
      const sourceIndex = index + 1;
      const sourceIndexKey = `${config.sourceType}:${sourceIndex}`;
      let planText = preserveSamePosition
        ? consumePlanTextBySourceIndex(existingItems, config.sourceType, sourceIndex)
        : consumePlanTextBySourceIdentity(existingItems, config.sourceType, sourceIndex, sourceText);
      if (planText === null) {
        planText = preserveSamePosition
          ? consumePlanTextBySourceIdentity(existingItems, config.sourceType, sourceIndex, sourceText)
          : consumePlanTextBySourceText(existingItems, config.sourceType, sourceText);
      }
      if (planText === null) {
        const indexEntry = existingItems.bySourceIndex.get(sourceIndexKey);
        const oldSourceStillExists = indexEntry?.sourceText
          ? currentSourceTextsByType.get(config.sourceType)?.has(indexEntry.sourceText)
          : false;
        planText = indexEntry && !oldSourceStillExists ? indexEntry.planText : '';
      }

      items.push({
        sourceType: config.sourceType,
        sourceLabel: config.sourceLabel,
        sourceIndex,
        sourceText,
        planText
      });
    }
  }

  return items;
}
