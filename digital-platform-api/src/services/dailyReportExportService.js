import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { env } from '../config/env.js';
import { assertDailyReportAttachmentFileReadable } from '../storage/dailyReportAttachmentStorage.js';

const DAILY_TEMPLATE_FILE = '项目工作日报-陈芋如20260616.xlsx';
const DAILY_SHEET_NAME = '项目管理工作日报汇总';
const ITEM_START_ROW = 7;
const ITEM_RESERVED_ROWS = 3;
const PHOTO_ROW = 10;
const PLAN_TITLE_ROW = 11;
const PLAN_START_ROW = 13;
const PLAN_RESERVED_ROWS = 2;

// Keep all personal daily report cell coordinates in this service.
const DAILY_REPORT_CELLS = {
  currentStage: 'B3',
  project: 'B4',
  reporter: 'D4',
  reportDate: 'G4'
};

// Convert ISO date text to the template's dotted date display.
function formatDottedDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '.');
}

// Build the yyyymmdd segment used by export filenames.
function formatCompactDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '');
}

// Replace filesystem-hostile characters while preserving readable Chinese names.
function sanitizeFileNamePart(value, fallback) {
  const text = String(value || '').trim() || fallback;
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, '_');
}

// Clone row height and B:G cell styles from a template detail row.
function copyDetailRowStyle(worksheet, sourceRowNumber, targetRowNumber) {
  const sourceRow = worksheet.getRow(sourceRowNumber);
  const targetRow = worksheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;

  for (let column = 2; column <= 7; column += 1) {
    const sourceCell = sourceRow.getCell(column);
    const targetCell = targetRow.getCell(column);
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style || {}));
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.alignment = sourceCell.alignment ? { ...sourceCell.alignment } : undefined;
    targetCell.border = sourceCell.border ? { ...sourceCell.border } : undefined;
    targetCell.fill = sourceCell.fill ? { ...sourceCell.fill } : undefined;
  }
}

// Add extra blank rows before the next template block and copy detail styling.
function ensureDetailRows(worksheet, startRow, reservedRows, requestedRows) {
  const rowCount = Math.max(requestedRows, reservedRows);
  const extraRows = rowCount - reservedRows;
  if (extraRows > 0) {
    worksheet.spliceRows(startRow + reservedRows, 0, ...Array.from({ length: extraRows }, () => []));
  }

  for (let offset = 0; offset < rowCount; offset += 1) {
    const sourceRow = startRow + Math.min(offset, reservedRows - 1);
    copyDetailRowStyle(worksheet, sourceRow, startRow + offset);
  }

  return rowCount;
}

// Write a value into a merged range by assigning its master cell.
function setCell(worksheet, address, value) {
  worksheet.getCell(address).value = value;
}

// Normalize completion progress while keeping non-percent status text intact.
function formatProgress(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  const percentMatch = text.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    return Number(percentMatch[1]) / 100;
  }

  return text;
}

// Clear unused cells so template sample rows cannot leak into exported workbooks.
function clearDetailRow(worksheet, rowNumber) {
  for (let column = 2; column <= 7; column += 1) {
    worksheet.getRow(rowNumber).getCell(column).value = null;
  }
}

// Fill today's completed-work rows in the personal daily template.
function fillCompletedItems(worksheet, report) {
  const items = report.items || [];
  const rowCount = ensureDetailRows(worksheet, ITEM_START_ROW, ITEM_RESERVED_ROWS, Math.max(items.length, 1));

  for (let offset = 0; offset < rowCount; offset += 1) {
    const row = worksheet.getRow(ITEM_START_ROW + offset);
    const item = items[offset];
    clearDetailRow(worksheet, ITEM_START_ROW + offset);

    if (item) {
      row.getCell(2).value = offset + 1;
      row.getCell(3).value = item.workContent || '';
      row.getCell(4).value = formatProgress(item.completionProgress);
      row.getCell(5).value = item.completedAt || '';
      row.getCell(6).value = item.responsiblePerson || '';
      row.getCell(7).value = item.deviationAndCorrectiveAction || '';
    }
  }

  return rowCount - ITEM_RESERVED_ROWS;
}

// Fill tomorrow's plan rows after any completed-work row expansion.
function fillPlans(worksheet, report, itemExtraRows) {
  const plans = report.plans || [];
  const planStartRow = PLAN_START_ROW + itemExtraRows;
  const rowCount = ensureDetailRows(worksheet, planStartRow, PLAN_RESERVED_ROWS, Math.max(plans.length, 1));

  for (let offset = 0; offset < rowCount; offset += 1) {
    const row = worksheet.getRow(planStartRow + offset);
    const plan = plans[offset];
    clearDetailRow(worksheet, planStartRow + offset);

    if (plan) {
      row.getCell(2).value = offset + 1;
      row.getCell(3).value = plan.plannedWorkContent || '';
      row.getCell(4).value = plan.responsiblePerson || '';
      row.getCell(5).value = plan.plannedCompleteAt || '';
      row.getCell(6).value = plan.collaboratingCenter || '';
      row.getCell(7).value = plan.collaborationItem || '';
    }
  }
}

// Embed uploaded image attachments directly into the Excel worksheet.
async function fillPhotoBlock(worksheet, workbook, report, itemExtraRows) {
  const photoRow = PHOTO_ROW + itemExtraRows;
  const attachments = (report.attachments || []).filter(
    (attachment) => attachment?.mimeType?.startsWith('image/') && attachment.storageKey
  );

  if (attachments.length === 0) {
    setCell(worksheet, `C${photoRow}`, '进展照片：无');
    return;
  }

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    try {
      const filePath = await assertDailyReportAttachmentFileReadable(attachment.storageKey);
      const imageBuffer = await fs.readFile(filePath);
      const extension = path.extname(filePath).slice(1).toLowerCase();
      const imageType = extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : 'png';
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: imageType
      });

      const column = 1 + index * 2;
      const row = photoRow - 1;
      worksheet.addImage(imageId, {
        tl: { col: column, row },
        br: { col: column + 1, row: row + 4 },
        editAs: 'oneCell'
      });
    } catch {
      // Skip missing or unreadable images while preserving the export.
    }
  }
}

// Build a deterministic output path under REPORT_EXPORT_ROOT/daily/yyyy/mm.
function buildDailyReportExportPath({ report, user }) {
  const [year, month] = String(report.reportDate).split('-');
  const directory = path.resolve(env.reports.exportRoot, 'daily', year, month);
  const safeName = sanitizeFileNamePart(user.name, user.account || 'employee');
  const fileName = `项目工作日报-${safeName}${formatCompactDate(report.reportDate)}.xlsx`;

  return {
    directory,
    fileName,
    filePath: path.join(directory, fileName)
  };
}

// Write the workbook through a temporary file before replacing the final export.
async function writeWorkbookAtomically(workbook, filePath) {
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await workbook.xlsx.writeFile(tempPath);
  await fs.rename(tempPath, filePath);
}

// Generate the personal daily report workbook and return the download metadata.
export async function generateDailyReportWorkbook(exportDto) {
  const { report, user, currentStageName } = exportDto;
  const templatePath = path.resolve(env.reports.templateRoot, DAILY_TEMPLATE_FILE);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(DAILY_SHEET_NAME) || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Daily report template worksheet is missing');
  }

  setCell(worksheet, DAILY_REPORT_CELLS.currentStage, currentStageName || '');
  setCell(worksheet, DAILY_REPORT_CELLS.project, `项目：${report.project?.projectName || ''}`);
  setCell(worksheet, DAILY_REPORT_CELLS.reporter, `报告人：${user.name || user.account || ''}`);
  setCell(worksheet, DAILY_REPORT_CELLS.reportDate, `报告时间：${formatDottedDate(report.reportDate)}`);

  const itemExtraRows = fillCompletedItems(worksheet, report);
  await fillPhotoBlock(worksheet, workbook, report, itemExtraRows);
  setCell(worksheet, `B${PLAN_TITLE_ROW + itemExtraRows}`, '明日工作计划');
  fillPlans(worksheet, report, itemExtraRows);

  const exportTarget = buildDailyReportExportPath({ report, user });
  await fs.mkdir(exportTarget.directory, { recursive: true });
  await writeWorkbookAtomically(workbook, exportTarget.filePath);

  return exportTarget;
}
