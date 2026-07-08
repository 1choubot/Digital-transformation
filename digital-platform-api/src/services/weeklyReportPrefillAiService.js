import { env } from '../config/env.js';

const AI_TIMEOUT_MS = 8000;
const MAX_AI_TASKS = 50;
const MAX_EVIDENCE_PER_TASK = 20;
const MAX_TEXT_LENGTH = 1000;

function clampText(value, limit = MAX_TEXT_LENGTH) {
  return String(value || '').slice(0, limit);
}

export function isReportAiConfigured() {
  return Boolean(
    env.reportAi.enabled &&
    env.reportAi.endpoint &&
    env.reportAi.model &&
    env.reportAi.apiKey
  );
}

export function getWeeklyReportAiCapability() {
  const available = isReportAiConfigured();
  return {
    prefillAiAvailable: available,
    evaluationAiAvailable: available,
    message: available
      ? 'AI 已配置，可使用 AI 整理和 AI 评分。'
      : 'AI 未配置，当前使用规则草稿和规则评分。'
  };
}

export function buildWeeklyPrefillAiInput(prefillSuggestion) {
  return {
    weekStart: prefillSuggestion.weekStart,
    weekEnd: prefillSuggestion.weekEnd,
    items: (prefillSuggestion.summaries || []).slice(0, MAX_AI_TASKS).map((item) => ({
      suggestionKey: item.suggestionKey,
      sourceType: item.sourceType,
      projectLabel: clampText(item.projectLabel, 200),
      plannedTask: clampText(item.workTask),
      plannedTarget: clampText(item.workTarget),
      plannedDate: item.plannedDate,
      executionStatus: item.completionStatus,
      completedDate: item.completedDate,
      missingDailyEvidence: Boolean(item.missingDailyEvidence),
      dailyEvidence: (item.dailyEvidence || []).slice(0, MAX_EVIDENCE_PER_TASK).map((dailyItem) => ({
        date: dailyItem.reportDate,
        workContent: clampText(dailyItem.workContent),
        completionProgress: clampText(dailyItem.completionProgress, 200),
        executionStatus: dailyItem.executionStatus,
        deviationAndCorrectiveAction: clampText(dailyItem.deviationAndCorrectiveAction)
      }))
    }))
  };
}

export async function defaultWeeklyPrefillAiClient(aiInput) {
  if (!isReportAiConfigured()) {
    throw new Error('Report AI is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.reportAi.endpoint.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${env.reportAi.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.reportAi.model,
        messages: [
          {
            role: 'system',
            content:
              'Return strict JSON with items[].suggestionKey, items[].workTarget, items[].completionDescription. Do not change facts, status, dates, projects, sourceType, or task keys. Do not include markdown.'
          },
          {
            role: 'user',
            content: JSON.stringify(aiInput)
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Report AI request failed with ${response.status}`);
    }

    const payload = await response.json();
    return JSON.parse(payload?.choices?.[0]?.message?.content || '');
  } finally {
    clearTimeout(timeout);
  }
}

function unavailableSuggestion(prefillSuggestion) {
  return {
    ...prefillSuggestion,
    ai: {
      available: false,
      applied: false,
      generatedAt: null,
      source: null,
      message: 'AI 整理未配置，已保留规则草稿。'
    }
  };
}

export async function composeWeeklyPrefillWithAi(prefillSuggestion, aiClient = defaultWeeklyPrefillAiClient) {
  if (!isReportAiConfigured() && aiClient === defaultWeeklyPrefillAiClient) {
    return unavailableSuggestion(prefillSuggestion);
  }

  const aiInput = buildWeeklyPrefillAiInput(prefillSuggestion);
  const byKey = new Map((prefillSuggestion.summaries || []).map((item) => [item.suggestionKey, item]));

  try {
    const aiPayload = await aiClient(aiInput);
    if (!Array.isArray(aiPayload?.items)) {
      throw new Error('AI compose payload missing items');
    }

    const rewritten = new Map();
    for (const item of aiPayload.items) {
      const suggestionKey = String(item?.suggestionKey || '');
      if (!byKey.has(suggestionKey)) {
        throw new Error('AI compose payload contains unknown suggestionKey');
      }
      rewritten.set(suggestionKey, {
        workTarget: clampText(item.workTarget, 5000),
        completionDescription: clampText(item.completionDescription, 500)
      });
    }

    return {
      ...prefillSuggestion,
      summaries: (prefillSuggestion.summaries || []).map((item) => {
        const aiItem = rewritten.get(item.suggestionKey);
        if (!aiItem) {
          return item;
        }
        return {
          ...item,
          workTarget: aiItem.workTarget || item.workTarget,
          completionDescription: aiItem.completionDescription || item.completionDescription,
          generation: 'ai'
        };
      }),
      ai: {
        available: true,
        applied: true,
        generatedAt: new Date().toISOString(),
        source: 'report_ai',
        message: '已使用 AI 整理表述，请核对后保存。'
      }
    };
  } catch (error) {
    return {
      ...prefillSuggestion,
      ai: {
        available: true,
        applied: false,
        generatedAt: new Date().toISOString(),
        source: 'report_ai',
        message: 'AI 整理暂不可用，已保留规则草稿。',
        error: error.message
      }
    };
  }
}
