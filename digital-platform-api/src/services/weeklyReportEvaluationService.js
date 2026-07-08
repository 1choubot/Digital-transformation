import { env } from '../config/env.js';
import { isReportAiConfigured } from './weeklyReportPrefillAiService.js';

const AI_TIMEOUT_MS = 8000;

function normalizeComparableText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function gradeWeeklyScore(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

function progressFactor(value) {
  const text = normalizeComparableText(value);
  if (!text) return 0;
  if (text.includes('100') || text.includes('完成') || text.includes('completed')) return 1;
  if (text.includes('80')) return 0.8;
  if (text.includes('50') || text.includes('一半') || text.includes('进行')) return 0.5;
  return 0.3;
}

export function calculateRuleWeeklyScore({ comparisonRows, dailyEvidence, expectedWorkdates, workdayContext }) {
  const submittedWorkdates = new Set(
    (dailyEvidence || [])
      .filter((item) => (expectedWorkdates || []).includes(item.reportDate))
      .map((item) => item.reportDate)
  );
  const fillingRateScore = expectedWorkdates?.length
    ? (submittedWorkdates.size / expectedWorkdates.length) * 30
    : 0;

  const rows = comparisonRows || [];
  const rowsWithDailyWork = rows.filter((row) => row.dailyWorkContent);
  const progressScore = rowsWithDailyWork.length
    ? (rowsWithDailyWork.reduce((sum, row) => sum + progressFactor(row.dailyCompletionProgress), 0) /
        rowsWithDailyWork.length) *
      30
    : 0;

  const rowsWithWeeklySummary = rows.filter((row) => row.weeklySummaryText || row.weeklyTask);
  const matchedRows = rowsWithWeeklySummary.filter((row) => row.matchStatus === 'matched').length;
  const matchScore = rowsWithWeeklySummary.length ? (matchedRows / rowsWithWeeklySummary.length) * 40 : 0;
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
      expectedWorkdayCount: expectedWorkdates?.length || 0,
      matchedComparisonRowCount: matchedRows,
      weeklyComparisonRowCount: rowsWithWeeklySummary.length,
      dailyComparisonRowCount: rowsWithDailyWork.length
    },
    resolvedRestMode: workdayContext.resolvedRestMode,
    restModeAnchorWeekStart: workdayContext.restModeAnchorWeekStart,
    workdaySource: workdayContext.workdaySource
  };
}

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
    suggestions: Array.isArray(payload.suggestions)
      ? payload.suggestions.map((item) => String(item).slice(0, 500))
      : [],
    components: ruleComponents,
    resolvedRestMode: workdayContext.resolvedRestMode,
    restModeAnchorWeekStart: workdayContext.restModeAnchorWeekStart,
    workdaySource: workdayContext.workdaySource
  };
}

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

export async function defaultWeeklyEvaluationAiClient(evaluationInput) {
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
            content: 'Return strict JSON with totalScore, summary, suggestions. Do not include markdown.'
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
      throw new Error(`Report AI request failed with ${response.status}`);
    }

    const payload = await response.json();
    return JSON.parse(payload?.choices?.[0]?.message?.content || '');
  } finally {
    clearTimeout(timeout);
  }
}

export async function evaluateWeeklyReportScore({
  weeklyReport,
  dailyEvidence,
  comparisonRows,
  expectedWorkdates,
  workdayContext,
  aiClient = defaultWeeklyEvaluationAiClient
}) {
  const evaluationInput = buildWeeklyEvaluationInput({ weeklyReport, comparisonRows, workdayContext });
  const ruleScore = calculateRuleWeeklyScore({ comparisonRows, dailyEvidence, expectedWorkdates, workdayContext });

  if (!isReportAiConfigured() && aiClient === defaultWeeklyEvaluationAiClient) {
    return {
      score: ruleScore,
      source: 'fallback_rule',
      error: 'Report AI is not configured',
      evaluationInput
    };
  }

  try {
    const aiPayload = await aiClient(evaluationInput);
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

