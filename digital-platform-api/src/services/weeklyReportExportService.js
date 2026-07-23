import { BUSINESS_DEPARTMENT } from '../domain/organization.js';
import { WEEKLY_REPORT_ERROR, WeeklyReportError } from '../domain/weeklyReports.js';
import { createSimpleXlsxWorkbook } from '../utils/simpleXlsxWorkbook.js';
import { sanitizeReportFileNamePart, writeReportExportFile } from './reportExportFile.js';

const DEPARTMENT_LABELS = {
  [BUSINESS_DEPARTMENT.OPERATIONS_CENTER]: '运营中心',
  [BUSINESS_DEPARTMENT.MARKETING_CENTER]: '营销中心',
  [BUSINESS_DEPARTMENT.MANUFACTURING_CENTER]: '制造中心',
  [BUSINESS_DEPARTMENT.RD_CENTER]: '研发中心'
};

function compactDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '');
}

function departmentLabel(department) {
  return DEPARTMENT_LABELS[department] || department || '';
}

function scoreText(report) {
  const aiScore = report.aiScore;
  const parts = [];
  if (aiScore?.totalScore !== undefined && aiScore?.totalScore !== null) {
    parts.push(`参考评分 ${aiScore.totalScore}${aiScore.grade ? ` / ${aiScore.grade}` : ''}`);
  }
  if (report.finalScore !== undefined && report.finalScore !== null) {
    parts.push(`最终评分 ${report.finalScore}`);
  }
  return parts.join('；') || '-';
}

function buildWeeklyReportRows({ report, user }) {
  const rows = [
    ['周绩效考核表'],
    [
      '周期',
      `${report.weekStart || ''} 至 ${report.weekEnd || ''}`,
      '姓名',
      user.name || user.account || '',
      '中心',
      departmentLabel(user.department),
      '岗位',
      user.role || ''
    ],
    ['提交状态', report.status || '', '审批状态', report.approvalStatus || '', '评分', scoreText(report)],
    []
  ];

  rows.push(['本周工作总结'], ['序号', '项目', '工作目标', '计划日期', '完成状态', '完成说明', '完成日期']);
  for (const [index, summary] of (report.summaries || []).entries()) {
    rows.push([
      index + 1,
      summary.projectLabel || summary.workTask || '',
      summary.workTarget || '',
      summary.plannedDate || '',
      summary.completionStatus || '',
      summary.completionDescription || '',
      summary.completedDate || ''
    ]);
  }
  if ((report.summaries || []).length === 0) {
    rows.push(['-', '暂无本周工作总结']);
  }

  rows.push([], ['下周工作计划'], ['序号', '项目', '工作目标', '计划日期', '责任人']);
  for (const [index, plan] of (report.plans || []).entries()) {
    rows.push([
      index + 1,
      plan.workTask || '',
      plan.workTarget || '',
      plan.plannedDate || '',
      plan.responsiblePerson || ''
    ]);
  }
  if ((report.plans || []).length === 0) {
    rows.push(['-', '暂无下周工作计划']);
  }

  rows.push(
    [],
    ['评分与评审'],
    ['参考评分来源', report.aiEvaluationSource || '-'],
    ['参考评分时间', report.aiEvaluatedAt || '-'],
    ['参考评分失败原因', report.aiEvaluationError || '-'],
    ['最终评分', report.finalScore ?? '-'],
    ['最终评语', report.finalComment || '-'],
    ['最终评审人', report.finalReviewedByName || '-'],
    ['最终评审时间', report.finalReviewedAt || '-']
  );

  return rows;
}

export async function generateWeeklyReportWorkbook(exportDto) {
  try {
    const buffer = createSimpleXlsxWorkbook({
      sheetName: '周绩效考核表',
      rows: buildWeeklyReportRows(exportDto),
      columnWidths: [10, 22, 34, 16, 16, 24, 16, 16]
    });
    const center = sanitizeReportFileNamePart(departmentLabel(exportDto.user?.department), '中心');
    const userName = sanitizeReportFileNamePart(exportDto.user?.name || exportDto.user?.account, 'employee');
    const fileName = `周绩效考核表-${center}${userName}${compactDate(exportDto.report?.weekEnd)}.xlsx`;

    return await writeReportExportFile({
      scope: 'weekly',
      fileName,
      buffer
    });
  } catch {
    throw new WeeklyReportError(
      WEEKLY_REPORT_ERROR.EXPORT_FAILED,
      'Weekly report export failed',
      500
    );
  }
}
