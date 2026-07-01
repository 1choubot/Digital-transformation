import { env } from '../config/env.js';

// Keep compose requests short so weekly report filling is never blocked for long.
const DEEPSEEK_TIMEOUT_MS = 8000;
const MAX_AI_TASKS = 50;
const MAX_EVIDENCE_PER_TASK = 20;
const MAX_TEXT_LENGTH = 1000;

// Clamp text sent to and accepted from AI within database-friendly limits.
function clampText(value, limit = MAX_TEXT_LENGTH) {
  return String(value || '').slice(0, limit);
}

// Build the minimal fact payload that AI may use for wording only.
export function buildWeeklyPrefillAiInput(prefillSuggestion) {
  return {
    weekStart: prefillSuggestion.weekStart,
    weekEnd: prefillSuggestion.weekEnd,
    items: prefillSuggestion.summaries.slice(0, MAX_AI_TASKS).map((item) => ({
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

// Production AI client; tests can inject a compatible function through app.locals.
export async function defaultWeeklyPrefillAiClient(aiInput) {
  if (!env.deepseek.apiKey) {
    throw new Error('DeepSeek API key is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.deepseek.apiBase}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${env.deepseek.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.deepseek.model,
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
      throw new Error(`DeepSeek request failed with ${response.status}`);
    }

    const payload = await response.json();
    return JSON.parse(payload?.choices?.[0]?.message?.content || '');
  } finally {
    clearTimeout(timeout);
  }
}

// Apply only AI-approved wording fields and discard any attempted fact changes.
export async function composeWeeklyPrefillWithAi(prefillSuggestion, aiClient = defaultWeeklyPrefillAiClient) {
  const aiInput = buildWeeklyPrefillAiInput(prefillSuggestion);
  const byKey = new Map(prefillSuggestion.summaries.map((item) => [item.suggestionKey, item]));

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
      summaries: prefillSuggestion.summaries.map((item) => {
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
        applied: true,
        message: '已使用 AI 整理表述，请核对后保存。'
      }
    };
  } catch (error) {
    return {
      ...prefillSuggestion,
      ai: {
        applied: false,
        message: 'AI 整理暂不可用，已保留规则草稿。',
        error: error.message
      }
    };
  }
}
