import fs from 'node:fs/promises';
import { DAILY_REPORT_ERROR, DailyReportError } from '../domain/dailyReports.js';
import { assertDailyReportAttachmentFileReadable } from '../storage/dailyReportAttachmentStorage.js';
import { createSimpleXlsxWorkbook } from '../utils/simpleXlsxWorkbook.js';
import { sanitizeReportFileNamePart, writeReportExportFile } from './reportExportFile.js';

function compactDate(isoDate) {
  return String(isoDate || '').replaceAll('-', '');
}

function projectLabel(project) {
  return [project?.projectCode, project?.projectName].filter(Boolean).join(' / ');
}

function attachmentCanEmbed(attachment) {
  const mimeType = String(attachment?.mimeType || '').toLowerCase();
  return mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/jpg';
}

async function buildDailyReportImages(report, imageStartRow) {
  const images = [];
  let imageOffset = 0;

  for (const attachment of report.attachments || []) {
    if (!attachmentCanEmbed(attachment) || !attachment.storageKey) {
      continue;
    }

    try {
      const filePath = await assertDailyReportAttachmentFileReadable(attachment.storageKey);
      const buffer = await fs.readFile(filePath);
      const startRow = imageStartRow + imageOffset * 8;
      images.push({
        buffer,
        mimeType: attachment.mimeType,
        originalFileName: attachment.originalFileName,
        target: {
          fromCell: `A${startRow}`,
          toCell: `D${startRow + 6}`
        },
        preserveAspectRatio: true
      });
      imageOffset += 1;
    } catch {
      // Missing images should not block the text workbook export.
    }
  }

  return images;
}

function buildDailyReportRows({ report, user, currentStageName }) {
  const rows = [
    ['项目工作日报'],
    ['报告日期', report.reportDate, '报告人', user.name || user.account || '', '当前阶段', currentStageName || ''],
    ['项目', projectLabel(report.project) || '-'],
    [],
    ['今日完成情况'],
    ['序号', '任务来源', '工作内容', '执行状态', '完成进度', '完成时间', '负责人', '偏差与纠偏']
  ];

  for (const [index, item] of (report.items || []).entries()) {
    rows.push([
      index + 1,
      item.sourceType || '',
      item.workContent || '',
      item.executionStatus || '',
      item.completionProgress || '',
      item.completedAt || '',
      item.responsiblePerson || '',
      item.deviationAndCorrectiveAction || ''
    ]);
  }

  if ((report.items || []).length === 0) {
    rows.push(['-', '暂无今日完成情况']);
  }

  rows.push([], ['明日工作计划'], ['序号', '计划内容', '负责人', '完成时间', '协同中心', '协同事项']);
  for (const [index, plan] of (report.plans || []).entries()) {
    rows.push([
      index + 1,
      plan.plannedWorkContent || '',
      plan.responsiblePerson || '',
      plan.plannedCompleteAt || '',
      plan.collaboratingCenter || '',
      plan.collaborationItem || ''
    ]);
  }

  if ((report.plans || []).length === 0) {
    rows.push(['-', '暂无明日工作计划']);
  }

  rows.push([], ['进展照片'], ['附件名', '类型', '大小']);
  for (const attachment of report.attachments || []) {
    rows.push([
      attachment.originalFileName || '',
      attachment.mimeType || '',
      attachment.fileSize || ''
    ]);
  }
  if ((report.attachments || []).length === 0) {
    rows.push(['暂无照片']);
  }

  return rows;
}

export async function generateDailyReportWorkbook(exportDto) {
  try {
    const rows = buildDailyReportRows(exportDto);
    const imageStartRow = rows.length + 2;
    const images = await buildDailyReportImages(exportDto.report, imageStartRow);
    const buffer = createSimpleXlsxWorkbook({
      sheetName: '项目工作日报',
      rows,
      columnWidths: [10, 18, 34, 18, 16, 16, 16, 34],
      images
    });
    const userName = sanitizeReportFileNamePart(exportDto.user?.name || exportDto.user?.account, 'employee');
    const fileName = `项目工作日报-${userName}${compactDate(exportDto.report?.reportDate)}.xlsx`;

    return await writeReportExportFile({
      scope: 'daily',
      fileName,
      buffer
    });
  } catch {
    throw new DailyReportError(
      DAILY_REPORT_ERROR.EXPORT_FAILED,
      'Daily report export failed',
      500
    );
  }
}
