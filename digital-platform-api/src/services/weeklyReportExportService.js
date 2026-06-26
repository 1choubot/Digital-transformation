import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { env } from '../config/env.js';
import { BUSINESS_DEPARTMENT } from '../domain/organization.js';

const WEEKLY_TEMPLATE_FILE = '周绩效考核表-研发中心陈芋如20260621.xlsx';
const WEEKLY_SHEET_NAME = 'Sheet1';
const SUMMARY_START_ROW = 5;
const SUMMARY_RESERVED_ROWS = 11;
const PLAN_START_ROW = 16;
const PLAN_RESERVED_ROWS = 8;
const SIGNATURE_ROW = 24;

// Report exports use display labels while persistence keeps the existing department codes.
const BUSINESS_DEPARTMENT_LABELS = {
  [BUSINESS_DEPARTMENT.OPERATIONS_CENTER]: '运营中心',
  [BUSINESS_DEPARTMENT.MARKETING_CENTER]: '营销中心',
  [BUSINESS_DEPARTMENT.MANUFACTURING_CENTER]: '制造中心',
  [BUSINESS_DEPARTMENT.RD_CENTER]: '研发中心'
};

// Centralize template coordinates so route and repository code stay format-agnostic.
const WEEKLY_REPORT_CELLS = {
  employeeName: 'B2',
  department: 'D2',
  role: 'F2',
  period: 'H2'
};

// Keep filenames readable while removing Windows-hostile characters.
function sanitizeFileNamePart(value, fallback) {
  const text = String(value || '').trim() || fallback;
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, '_');
}

// Format dates with dots because the formal weekly template uses Chinese office date style.
function formatDottedDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '.');
}

// Use the week-end date in the exported file name.
function formatCompactDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '');
}

// Translate department codes without introducing a new departments table.
function formatDepartment(department) {
  return BUSINESS_DEPARTMENT_LABELS[department] || department || '';
}

// Copy styles and dimensions from one template row into a generated row.
function copyRowStyle(worksheet, sourceRowNumber, targetRowNumber) {
  const sourceRow = worksheet.getRow(sourceRowNumber);
  const targetRow = worksheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;

  for (let column = 1; column <= 8; column += 1) {
    const sourceCell = sourceRow.getCell(column);
    const targetCell = targetRow.getCell(column);
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style || {}));
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.alignment = sourceCell.alignment ? { ...sourceCell.alignment } : undefined;
    targetCell.border = sourceCell.border ? { ...sourceCell.border } : undefined;
    targetCell.fill = sourceCell.fill ? { ...sourceCell.fill } : undefined;
  }
}

// Add extra rows before the next block and clone template formatting.
function ensureRows(worksheet, startRow, reservedRows, requestedRows) {
  const rowCount = Math.max(requestedRows, reservedRows);
  const extraRows = rowCount - reservedRows;
  if (extraRows > 0) {
    worksheet.spliceRows(startRow + reservedRows, 0, ...Array.from({ length: extraRows }, () => []));
  }

  for (let offset = 0; offset < rowCount; offset += 1) {
    copyRowStyle(worksheet, startRow + Math.min(offset, reservedRows - 1), startRow + offset);
  }

  return rowCount;
}

// Clear generated detail cells so sample values never leak into exports.
function clearDetailRow(worksheet, rowNumber) {
  for (let column = 2; column <= 8; column += 1) {
    worksheet.getRow(rowNumber).getCell(column).value = null;
  }
}

// Fill weekly summary rows from normalized repository data.
function fillSummaries(worksheet, summaries) {
  const rowCount = ensureRows(worksheet, SUMMARY_START_ROW, SUMMARY_RESERVED_ROWS, Math.max(summaries.length, 1));

  for (let offset = 0; offset < rowCount; offset += 1) {
    const rowNumber = SUMMARY_START_ROW + offset;
    const row = worksheet.getRow(rowNumber);
    const item = summaries[offset];
    clearDetailRow(worksheet, rowNumber);

    if (item) {
      // The template has no sequence column; B is the work-task column.
      row.getCell(2).value = item.workTask;
      row.getCell(3).value = item.workTarget;
      row.getCell(5).value = item.plannedDate;
      row.getCell(6).value = item.completionDescription;
      row.getCell(8).value = item.completedDate;
    }
  }

  return rowCount - SUMMARY_RESERVED_ROWS;
}

// Fill next-week plan rows after any summary-row expansion.
function fillPlans(worksheet, plans, summaryExtraRows) {
  const startRow = PLAN_START_ROW + summaryExtraRows;
  const rowCount = ensureRows(worksheet, startRow, PLAN_RESERVED_ROWS, Math.max(plans.length, 1));

  for (let offset = 0; offset < rowCount; offset += 1) {
    const rowNumber = startRow + offset;
    const row = worksheet.getRow(rowNumber);
    const item = plans[offset];
    clearDetailRow(worksheet, rowNumber);

    if (item) {
      // Work-plan rows use B/C/E only; F and following columns stay empty by template design.
      row.getCell(2).value = item.workTask;
      row.getCell(3).value = item.workTarget;
      row.getCell(5).value = item.plannedDate;
    }
  }
}

// Build a deterministic output path under REPORT_EXPORT_ROOT/weekly/yyyy/mm.
function buildWeeklyReportExportPath({ report, user }) {
  const [year, month] = String(report.weekEnd).split('-');
  const directory = path.resolve(env.reports.exportRoot, 'weekly', year, month);
  const centerName = sanitizeFileNamePart(formatDepartment(user.department), '中心');
  const userName = sanitizeFileNamePart(user.name, user.account || 'employee');
  const fileName = `周绩效考核表-${centerName}${userName}${formatCompactDate(report.weekEnd)}.xlsx`;

  return {
    directory,
    fileName,
    filePath: path.join(directory, fileName)
  };
}

// Replace exports atomically so partially written workbooks are not served.
async function writeWorkbookAtomically(workbook, filePath) {
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await workbook.xlsx.writeFile(tempPath);
  await fs.rename(tempPath, filePath);
}

// Generate the personal weekly report workbook and return download metadata.
export async function generateWeeklyReportWorkbook(exportDto) {
  const { report, user } = exportDto;
  const templatePath = path.resolve(env.reports.templateRoot, WEEKLY_TEMPLATE_FILE);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(WEEKLY_SHEET_NAME) || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Weekly report template worksheet is missing');
  }

  worksheet.getCell(WEEKLY_REPORT_CELLS.employeeName).value = user.name || user.account || '';
  worksheet.getCell(WEEKLY_REPORT_CELLS.department).value = formatDepartment(user.department);
  worksheet.getCell(WEEKLY_REPORT_CELLS.role).value = user.role || '';
  worksheet.getCell(WEEKLY_REPORT_CELLS.period).value = `${formatDottedDate(report.weekStart)}-${formatDottedDate(
    report.weekEnd
  )}`;

  const summaryExtraRows = fillSummaries(worksheet, report.summaries || []);
  fillPlans(worksheet, report.plans || [], summaryExtraRows);
  worksheet.getCell(`B${SIGNATURE_ROW + summaryExtraRows}`).value = user.name || user.account || '';

  const exportTarget = buildWeeklyReportExportPath({ report, user });
  await fs.mkdir(exportTarget.directory, { recursive: true });
  await writeWorkbookAtomically(workbook, exportTarget.filePath);

  return exportTarget;
}
