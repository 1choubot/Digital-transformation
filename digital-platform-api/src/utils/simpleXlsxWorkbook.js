import { renderXlsxTemplate } from './ooxmlRenderer.js';
import { writeZipEntries } from './ooxmlZip.js';

const MAX_COLUMN_WIDTH = 80;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let value = Number(index) + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = `${String.fromCharCode(65 + remainder)}${name}`;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function normalizeCellValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function buildCell(rowIndex, columnIndex, value) {
  const cellRef = `${columnName(columnIndex)}${rowIndex + 1}`;
  const text = normalizeCellValue(value);
  return `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function buildRow(row, rowIndex) {
  const cells = (row || []).map((value, columnIndex) => buildCell(rowIndex, columnIndex, value)).join('');
  return `<row r="${rowIndex + 1}">${cells}</row>`;
}

function normalizeColumnWidths(rows, explicitWidths = []) {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row?.length || 0), 0);
  return Array.from({ length: maxColumns }, (_, index) => {
    const explicit = Number(explicitWidths[index]);
    if (Number.isFinite(explicit) && explicit > 0) {
      return Math.min(explicit, MAX_COLUMN_WIDTH);
    }

    const maxTextLength = rows.reduce((max, row) => {
      const text = normalizeCellValue(row?.[index]);
      return Math.max(max, text.length);
    }, 8);
    return Math.min(Math.max(maxTextLength + 2, 10), MAX_COLUMN_WIDTH);
  });
}

function buildColsXml(widths) {
  if (!widths.length) {
    return '';
  }

  return `<cols>${widths
    .map((width, index) => {
      const column = index + 1;
      return `<col min="${column}" max="${column}" width="${width}" customWidth="1"/>`;
    })
    .join('')}</cols>`;
}

function safeSheetName(sheetName) {
  const text = String(sheetName || 'Sheet1').replace(/[\[\]:*?/\\]/g, ' ').trim();
  return (text || 'Sheet1').slice(0, 31);
}

function buildWorksheetXml({ rows, columnWidths }) {
  const widths = normalizeColumnWidths(rows, columnWidths);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18" defaultColWidth="12"/>
  ${buildColsXml(widths)}
  <sheetData>${rows.map(buildRow).join('')}</sheetData>
</worksheet>`;
}

function buildWorkbookXml(sheetName) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(safeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function buildBaseWorkbook({ sheetName, rows, columnWidths }) {
  const entries = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      data: buildWorkbookXml(sheetName)
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: 'xl/styles.xml',
      data: buildStylesXml()
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: buildWorksheetXml({ rows, columnWidths })
    }
  ];

  return writeZipEntries(entries);
}

export function createSimpleXlsxWorkbook({ sheetName = 'Sheet1', rows = [], columnWidths = [], images = [] } = {}) {
  const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [['']];
  const workbook = buildBaseWorkbook({ sheetName, rows: safeRows, columnWidths });

  if (!images.length) {
    return workbook;
  }

  return renderXlsxTemplate(workbook, {
    cellValues: {},
    imageValues: images
  });
}

