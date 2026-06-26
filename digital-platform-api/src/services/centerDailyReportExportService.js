import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { env } from '../config/env.js';

// 使用当前仓库实际存在的中心日报模板，避免导出时因模板缺失返回 500。
const CENTER_DAILY_TEMPLATE_FILE = '部门工作日报-研发中心20260619.xlsx';
const CENTER_DAILY_SHEET_NAME = '项目管理工作日报汇总';

const DEPARTMENT_DISPLAY_TEXT = {
  operations_center: '运营中心',
  marketing_center: '营销中心',
  manufacturing_center: '制造中心',
  rd_center: '研发中心'
};

const SECTION_CONFIG = {
  previousPlans: { startRow: 5, reservedRows: 11, columns: 6 },
  completedItems: { startRow: 18, reservedRows: 22, columns: 6 },
  tomorrowPlans: { startRow: 42, reservedRows: 10, columns: 6 }
};

// Use the existing business department labels for workbook headers and filenames.
function formatDepartment(department) {
  return DEPARTMENT_DISPLAY_TEXT[department] || department || '';
}

// Convert YYYY-MM-DD into the dotted date style used by the official template.
function formatDottedDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '.');
}

// Build the yyyymmdd segment used by export filenames.
function formatCompactDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '');
}

// Preserve readable names while removing characters that Windows cannot store in filenames.
function sanitizeFileNamePart(value, fallback) {
  const text = String(value || '').trim() || fallback;
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, '_');
}

// Copy row height and A:F cell styles from a template row to an inserted row.
function copySectionRowStyle(worksheet, sourceRowNumber, targetRowNumber, columnCount) {
  const sourceRow = worksheet.getRow(sourceRowNumber);
  const targetRow = worksheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;

  for (let column = 1; column <= columnCount; column += 1) {
    const sourceCell = sourceRow.getCell(column);
    const targetCell = targetRow.getCell(column);
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style || {}));
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.alignment = sourceCell.alignment ? { ...sourceCell.alignment } : undefined;
    targetCell.border = sourceCell.border ? { ...sourceCell.border } : undefined;
    targetCell.fill = sourceCell.fill ? { ...sourceCell.fill } : undefined;
  }
}

// Insert extra rows for dynamic sections and return the number of inserted rows.
function ensureSectionRows(worksheet, config, requestedRows, rowOffset) {
  const startRow = config.startRow + rowOffset;
  const rowCount = Math.max(requestedRows, 1, config.reservedRows);
  const extraRows = rowCount - config.reservedRows;
  if (extraRows > 0) {
    worksheet.spliceRows(startRow + config.reservedRows, 0, ...Array.from({ length: extraRows }, () => []));
  }

  for (let offset = 0; offset < rowCount; offset += 1) {
    const sourceRowNumber = startRow + Math.min(offset, config.reservedRows - 1);
    copySectionRowStyle(worksheet, sourceRowNumber, startRow + offset, config.columns);
  }

  return { startRow, rowCount, extraRows };
}

// Clear all template sample values from one dynamic section row.
function clearSectionRow(worksheet, rowNumber, columnCount) {
  for (let column = 1; column <= columnCount; column += 1) {
    worksheet.getRow(rowNumber).getCell(column).value = null;
  }
}

// Flatten employee groups into rows for one center daily report section.
function flattenSectionRows(reportDto, sectionName) {
  const rows = [];
  for (const employee of reportDto.employees) {
    for (const item of employee[sectionName] || []) {
      rows.push({
        employeeName: employee.name,
        projectLabel: item.projectLabel,
        workContent: item.workContent,
        completionProgress: item.completionProgress,
        responsiblePerson: item.responsiblePerson || employee.name,
        collaboratingCenter: item.collaboratingCenter,
        collaborationItem: item.collaborationItem,
        deviationAndCorrectiveAction: item.deviationAndCorrectiveAction
      });
    }
  }

  return rows;
}

// Write a simple empty-state row while preserving the template section shape.
function writeEmptyState(worksheet, rowNumber, message) {
  worksheet.getRow(rowNumber).getCell(1).value = message;
}

// Fill yesterday-plan or tomorrow-plan sections with project and collaboration details.
function fillPlanSection(worksheet, { startRow, rowCount }, rows, emptyMessage) {
  for (let offset = 0; offset < rowCount; offset += 1) {
    const rowNumber = startRow + offset;
    const row = worksheet.getRow(rowNumber);
    const item = rows[offset];
    clearSectionRow(worksheet, rowNumber, 6);

    if (item) {
      row.getCell(1).value = offset + 1;
      row.getCell(2).value = item.projectLabel;
      row.getCell(3).value = item.workContent;
      row.getCell(4).value = item.responsiblePerson;
      row.getCell(5).value = item.collaboratingCenter || '';
      row.getCell(6).value = item.collaborationItem || '';
    } else if (offset === 0 && rows.length === 0) {
      writeEmptyState(worksheet, rowNumber, emptyMessage);
    }
  }
}

// Fill today's completed-work section with progress and deviation data.
function fillCompletedSection(worksheet, { startRow, rowCount }, rows, emptyMessage) {
  for (let offset = 0; offset < rowCount; offset += 1) {
    const rowNumber = startRow + offset;
    const row = worksheet.getRow(rowNumber);
    const item = rows[offset];
    clearSectionRow(worksheet, rowNumber, 6);

    if (item) {
      row.getCell(1).value = offset + 1;
      row.getCell(2).value = item.projectLabel;
      row.getCell(3).value = item.workContent;
      row.getCell(4).value = item.completionProgress || '';
      row.getCell(5).value = item.responsiblePerson;
      row.getCell(6).value = item.deviationAndCorrectiveAction || '';
    } else if (offset === 0 && rows.length === 0) {
      writeEmptyState(worksheet, rowNumber, emptyMessage);
    }
  }
}

// Build a deterministic output path under REPORT_EXPORT_ROOT/department/yyyy/mm.
function buildCenterDailyReportExportPath(reportDto) {
  const [year, month] = String(reportDto.reportDate).split('-');
  const directory = path.resolve(env.reports.exportRoot, 'department', year, month);
  const safeDepartment = sanitizeFileNamePart(formatDepartment(reportDto.department), reportDto.department);
  const fileName = `部门工作日报-${safeDepartment}${formatCompactDate(reportDto.reportDate)}.xlsx`;

  return {
    directory,
    fileName,
    filePath: path.join(directory, fileName)
  };
}

// Write through a temp file before replacing the final workbook path.
async function writeWorkbookAtomically(workbook, filePath) {
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await workbook.xlsx.writeFile(tempPath);
  await fs.rename(tempPath, filePath);
}

// Generate the center daily report workbook from the official department template.
export async function generateCenterDailyReportWorkbook(reportDto) {
  const templatePath = path.resolve(env.reports.templateRoot, CENTER_DAILY_TEMPLATE_FILE);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(CENTER_DAILY_SHEET_NAME) || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Center daily report template worksheet is missing');
  }

  worksheet.getCell('A2').value = `部门：${formatDepartment(reportDto.department)}`;
  worksheet.getCell('C2').value = `报告人：${reportDto.generatedBy?.name || reportDto.generatedBy?.account || ''}`;
  worksheet.getCell('F2').value = `报告时间：${formatDottedDate(reportDto.reportDate)}`;

  const previousRows = flattenSectionRows(reportDto, 'previousPlans');
  const completedRows = flattenSectionRows(reportDto, 'completedItems');
  const tomorrowRows = flattenSectionRows(reportDto, 'tomorrowPlans');

  const previousSection = ensureSectionRows(worksheet, SECTION_CONFIG.previousPlans, previousRows.length, 0);
  fillPlanSection(worksheet, previousSection, previousRows, '暂无昨日工作计划');

  const completedSection = ensureSectionRows(
    worksheet,
    SECTION_CONFIG.completedItems,
    completedRows.length,
    previousSection.extraRows
  );
  fillCompletedSection(worksheet, completedSection, completedRows, '暂无已提交日报');

  const tomorrowSection = ensureSectionRows(
    worksheet,
    SECTION_CONFIG.tomorrowPlans,
    tomorrowRows.length,
    previousSection.extraRows + completedSection.extraRows
  );
  fillPlanSection(worksheet, tomorrowSection, tomorrowRows, '暂无明日工作计划');

  const exportTarget = buildCenterDailyReportExportPath(reportDto);
  await fs.mkdir(exportTarget.directory, { recursive: true });
  await writeWorkbookAtomically(workbook, exportTarget.filePath);

  return exportTarget;
}
