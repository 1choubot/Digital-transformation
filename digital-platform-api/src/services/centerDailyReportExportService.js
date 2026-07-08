import { BUSINESS_DEPARTMENT } from '../domain/organization.js';
import { CENTER_DAILY_REPORT_ERROR, CenterDailyReportError } from '../domain/centerDailyReports.js';
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

function appendSectionRows(rows, title, columns, employees, sectionName, emptyText) {
  rows.push([], [title], columns);
  let sequence = 1;
  for (const employee of employees || []) {
    for (const item of employee[sectionName] || []) {
      rows.push([
        sequence,
        employee.name || employee.account || '',
        item.projectLabel || '',
        item.workContent || '',
        item.completionProgress || item.responsiblePerson || '',
        item.deviationAndCorrectiveAction || item.collaboratingCenter || '',
        item.collaborationItem || ''
      ]);
      sequence += 1;
    }
  }

  if (sequence === 1) {
    rows.push(['-', emptyText]);
  }
}

function buildCenterDailyRows(reportDto) {
  const rows = [
    ['中心日报'],
    [
      '中心',
      departmentLabel(reportDto.department),
      '报告日期',
      reportDto.reportDate || '',
      '导出人',
      reportDto.generatedBy?.name || reportDto.generatedBy?.account || ''
    ],
    [
      '员工数',
      reportDto.totals?.employeeCount ?? 0,
      '昨日计划数',
      reportDto.totals?.previousPlanCount ?? 0,
      '今日完成数',
      reportDto.totals?.completedItemCount ?? 0,
      '明日计划数',
      reportDto.totals?.tomorrowPlanCount ?? 0
    ]
  ];

  appendSectionRows(
    rows,
    '昨日工作计划',
    ['序号', '员工', '项目', '工作内容', '责任人', '协同中心', '协同事项'],
    reportDto.employees,
    'previousPlans',
    '暂无昨日工作计划'
  );
  appendSectionRows(
    rows,
    '今日工作完成情况',
    ['序号', '员工', '项目', '工作内容', '完成进度', '责任人', '偏差与纠偏'],
    reportDto.employees,
    'completedItems',
    '暂无今日工作完成情况'
  );
  appendSectionRows(
    rows,
    '明日工作计划',
    ['序号', '员工', '项目', '工作内容', '责任人', '协同中心', '协同事项'],
    reportDto.employees,
    'tomorrowPlans',
    '暂无明日工作计划'
  );

  return rows;
}

export async function generateCenterDailyReportWorkbook(reportDto) {
  try {
    const buffer = createSimpleXlsxWorkbook({
      sheetName: '中心日报',
      rows: buildCenterDailyRows(reportDto),
      columnWidths: [10, 16, 26, 36, 16, 24, 24, 16]
    });
    const center = sanitizeReportFileNamePart(departmentLabel(reportDto.department), reportDto.department || 'center');
    const fileName = `中心日报-${center}${compactDate(reportDto.reportDate)}.xlsx`;

    return await writeReportExportFile({
      scope: 'center-daily',
      fileName,
      buffer
    });
  } catch {
    throw new CenterDailyReportError(
      CENTER_DAILY_REPORT_ERROR.EXPORT_FAILED,
      'Center daily report export failed',
      500
    );
  }
}
