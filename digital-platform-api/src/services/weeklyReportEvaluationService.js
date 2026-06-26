import { env } from '../config/env.js';
// Keep DeepSeek calls short so API requests degrade quickly to rule scoring.
const DEEPSEEK_TIMEOUT_MS = 8000;

// Strip punctuation and lowercase English so simple keyword matching is repeatable.
function normalizeComparableText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Clamp scores before saving them into the JSON result.
function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Map a numeric score to the display grade used by comparison overviews.
export function gradeWeeklyScore(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

// Progress words from the comparison table are mapped into a stable 0..1 factor.
function progressFactor(value) {
  const text = normalizeComparableText(value);
  if (!text) return 0;
  if (text.includes('100') || text.includes('完成') || text.includes('completed')) return 1;
  if (text.includes('80')) return 0.8;
  if (text.includes('50') || text.includes('一半') || text.includes('进行')) return 0.5;
  return 0.3;
}

// Calculate deterministic fallback score with comparisonRows as the main scoring input.
export function calculateRuleWeeklyScore({ comparisonRows, dailyEvidence, expectedWorkdates, workdayContext }) {
  const submittedWorkdates = new Set(
    dailyEvidence
      .filter((item) => expectedWorkdates.includes(item.reportDate))
      .map((item) => item.reportDate)
  );
  const fillingRateScore = expectedWorkdates.length === 0 ? 0 : (submittedWorkdates.size / expectedWorkdates.length) * 30;

  const rows = comparisonRows || [];
  const rowsWithDailyWork = rows.filter((row) => row.dailyWorkContent);
  const progressScore =
    rowsWithDailyWork.length === 0
      ? 0
      : (rowsWithDailyWork.reduce((sum, row) => sum + progressFactor(row.dailyCompletionProgress), 0) /
          rowsWithDailyWork.length) *
        30;

  const rowsWithWeeklySummary = rows.filter((row) => row.weeklySummaryText || row.weeklyTask);
  const matchedRows = rowsWithWeeklySummary.filter((row) => row.matchStatus === 'matched').length;
  const matchScore = rowsWithWeeklySummary.length === 0 ? 0 : (matchedRows / rowsWithWeeklySummary.length) * 40;

  const totalScore = clampScore(fillingRateScore + progressScore + matchScore);

  return {
    totalScore,
    grade: gradeWeeklyScore(totalScore),
    source: 'fallback_rule',
    components: {
      fillingRateScore: clampScore(fillingRateScore),
      progressScore: clampScore(progressScore),
      matchScore: clampScore(matchScore),
      submittedWorkdayCount: submittedWorkdates.size,
      expectedWorkdayCount: expectedWorkdates.length,
      matchedComparisonRowCount: matchedRows,
      weeklyComparisonRowCount: rowsWithWeeklySummary.length,
      dailyComparisonRowCount: rowsWithDailyWork.length
    },
    resolvedRestMode: workdayContext.resolvedRestMode,
    restModeAnchorWeekStart: workdayContext.restModeAnchorWeekStart,
    workdaySource: workdayContext.workdaySource
  };
}

// Validate the small JSON schema accepted from DeepSeek before caching it.
function normalizeAiScorePayload(payload, workdayContext, ruleComponents) {
  const totalScore = Number(payload?.totalScore);
  if (!Number.isFinite(totalScore)) {
    throw new Error('AI score payload missing totalScore');
  }

  return {
    totalScore: clampScore(totalScore),
    grade: gradeWeeklyScore(totalScore),
    source: 'ai',
    summary: String(payload.summary || '').slice(0, 1000),
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions.map((item) => String(item).slice(0, 500)) : [],
    components: ruleComponents,
    resolvedRestMode: workdayContext.resolvedRestMode,
    restModeAnchorWeekStart: workdayContext.restModeAnchorWeekStart,
    workdaySource: workdayContext.workdaySource
  };
}

// Build the AI prompt input with comparisonRows as the primary scoring view.
export function buildWeeklyEvaluationInput({ weeklyReport, comparisonRows, workdayContext }) {
  return {
    weekStart: weeklyReport.weekStart,
    weekEnd: weeklyReport.weekEnd,
    comparisonRows: (comparisonRows || []).map((row) => ({
      date: row.date,
      weekday: row.weekday,
      weeklyTask: row.weeklyTask,
      weeklySummaryText: row.weeklySummaryText,
      dailyProjectName: row.dailyProjectName,
      dailyWorkContent: row.dailyWorkContent,
      dailyCompletionProgress: row.dailyCompletionProgress,
      dailyCompletedAt: row.dailyCompletedAt,
      weeklyCompletedDate: row.weeklyCompletedDate,
      matchStatus: row.matchStatus,
      matchReason: row.matchReason
    })),
    workdayContext
  };
}

// Call DeepSeek using fetch; tests can inject a compatible client to avoid network access.
export async function defaultDeepSeekClient(evaluationInput) {
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
            content: 'Return strict JSON with totalScore, grade, summary, suggestions. Do not include markdown.'
          },
          {
            role: 'user',
            content: JSON.stringify(evaluationInput)
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

// Evaluate with AI first and fall back to deterministic rules on any adapter failure.
export async function evaluateWeeklyReportScore({
  weeklyReport,
  dailyEvidence,
  comparisonRows,
  expectedWorkdates,
  workdayContext,
  deepseekClient = defaultDeepSeekClient
}) {
  const evaluationInput = buildWeeklyEvaluationInput({ weeklyReport, comparisonRows, workdayContext });
  // AI 总分仍以模型结果为准，三项维度用确定性规则补齐，保证页面展示稳定。
  const ruleScore = calculateRuleWeeklyScore({ comparisonRows, dailyEvidence, expectedWorkdates, workdayContext });

  try {
    const aiPayload = await deepseekClient(evaluationInput);
    return {
      score: normalizeAiScorePayload(aiPayload, workdayContext, ruleScore.components),
      source: 'ai',
      error: null,
      evaluationInput
    };
  } catch (error) {
    return {
      score: ruleScore,
      source: 'fallback_rule',
      error: error.message,
      evaluationInput
    };
  }
}
