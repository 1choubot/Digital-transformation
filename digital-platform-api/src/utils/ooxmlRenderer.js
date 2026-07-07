import { readZipEntries, updateZipTextEntry, writeZipEntries } from './ooxmlZip.js';

const CELL_REF_PATTERN = /^([A-Z]+)(\d+)$/;
const EMUS_PER_PIXEL = 9525;
const DEFAULT_COLUMN_WIDTH = 8.43;
const DEFAULT_ROW_HEIGHT_POINTS = 15;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnIndex(columnLetters) {
  return columnLetters.split('').reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);
}

function columnZeroIndex(columnLetters) {
  return columnIndex(columnLetters) - 1;
}

function columnWidthToEmu(width) {
  const normalized = Number(width);
  const excelWidth = Number.isFinite(normalized) && normalized > 0 ? normalized : DEFAULT_COLUMN_WIDTH;
  return Math.round(Math.floor(excelWidth * 7 + 5) * EMUS_PER_PIXEL);
}

function rowHeightToEmu(heightPoints) {
  const normalized = Number(heightPoints);
  const points = Number.isFinite(normalized) && normalized > 0 ? normalized : DEFAULT_ROW_HEIGHT_POINTS;
  return Math.round(points * (96 / 72) * EMUS_PER_PIXEL);
}

function buildInlineCell(cellRef, value, existingAttributes = '') {
  const styleMatch = existingAttributes.match(/\ss="[^"]*"/);
  const styleAttribute = styleMatch ? styleMatch[0] : '';
  return `<c r="${cellRef}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function buildInlineRichCheckboxCell(cellRef, { checkboxSymbol, fallbackText, checkboxFont, textFont }, existingAttributes = '') {
  const styleMatch = existingAttributes.match(/\ss="[^"]*"/);
  const styleAttribute = styleMatch ? styleMatch[0] : '';
  const normalizedCheckboxFont = checkboxFont || 'Wingdings 2';
  const normalizedTextFont = textFont || '宋体';
  return `<c r="${cellRef}"${styleAttribute} t="inlineStr"><is><r><rPr><sz val="12"/><rFont val="${escapeXml(normalizedCheckboxFont)}"/><charset val="134"/></rPr><t>${escapeXml(checkboxSymbol)}</t></r><r><rPr><sz val="12"/><rFont val="${escapeXml(normalizedTextFont)}"/><charset val="134"/><scheme val="minor"/></rPr><t xml:space="preserve">${escapeXml(fallbackText || '')}</t></r></is></c>`;
}

function normalizeCellInput(input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return {
      value: input.value ?? '',
      preserveTemplateWhenEmpty: input.preserveTemplateWhenEmpty === true
    };
  }

  return {
    value: input ?? '',
    preserveTemplateWhenEmpty: false
  };
}

function updateCellInRow(rowXml, cellRef, input) {
  const { value, preserveTemplateWhenEmpty } = normalizeCellInput(input);
  if (preserveTemplateWhenEmpty && String(value ?? '').trim() === '') {
    return rowXml;
  }

  const cellPattern = new RegExp(`<c\\b(?=[^>]*\\br="${cellRef}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
  const match = rowXml.match(cellPattern);
  if (match) {
    return rowXml.replace(match[0], buildInlineCell(cellRef, value, match[0].match(/^<c\b([^>]*)>/)?.[1] || ''));
  }

  const newCell = buildInlineCell(cellRef, value);
  const rowEnd = rowXml.lastIndexOf('</row>');
  if (rowEnd === -1) {
    return rowXml;
  }

  const [, column] = cellRef.match(CELL_REF_PATTERN) || [];
  const newColumnIndex = columnIndex(column || 'A');
  const cells = [...rowXml.matchAll(/<c\b(?=[^>]*\br="([A-Z]+)\d+")[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)];
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const currentColumnIndex = columnIndex(cells[index][1]);
    if (currentColumnIndex < newColumnIndex) {
      const insertAt = cells[index].index + cells[index][0].length;
      return `${rowXml.slice(0, insertAt)}${newCell}${rowXml.slice(insertAt)}`;
    }
  }

  const firstCell = cells[0];
  if (firstCell) {
    return `${rowXml.slice(0, firstCell.index)}${newCell}${rowXml.slice(firstCell.index)}`;
  }

  return `${rowXml.slice(0, rowEnd)}${newCell}${rowXml.slice(rowEnd)}`;
}

function updateSheetXmlCell(sheetXml, cellRef, value) {
  const match = cellRef.match(CELL_REF_PATTERN);
  if (!match) {
    throw new Error(`Invalid Excel cell reference: ${cellRef}`);
  }

  const rowNumber = match[2];
  const rowPattern = new RegExp(`<row\\b[^>]*\\br="${rowNumber}"[^>]*>[\\s\\S]*?<\\/row>`);
  const rowMatch = sheetXml.match(rowPattern);
  if (rowMatch) {
    return sheetXml.replace(rowMatch[0], updateCellInRow(rowMatch[0], cellRef, value));
  }

  const newRow = `<row r="${rowNumber}">${buildInlineCell(cellRef, value)}</row>`;
  const sheetDataEnd = sheetXml.indexOf('</sheetData>');
  if (sheetDataEnd === -1) {
    throw new Error('Invalid worksheet XML: sheetData not found');
  }

  return `${sheetXml.slice(0, sheetDataEnd)}${newRow}${sheetXml.slice(sheetDataEnd)}`;
}

function updateXlsxCells(templateBuffer, { cellValues }) {
  return updateZipTextEntry(templateBuffer, 'xl/worksheets/sheet1.xml', (sheetXml) => {
    return Object.entries(cellValues || {}).reduce(
      (xml, [cellRef, value]) => updateSheetXmlCell(xml, cellRef, value),
      sheetXml
    );
  });
}

function getEntry(entries, name) {
  return entries.find((entry) => entry.name === name) || null;
}

function getTextEntry(entries, name, fallback = '') {
  const entry = getEntry(entries, name);
  return entry ? entry.data.toString('utf8') : fallback;
}

function setEntry(entries, name, data, { compressionMethod = 8 } = {}) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
  const entry = getEntry(entries, name);
  if (entry) {
    entry.data = buffer;
    return;
  }

  entries.push({
    name,
    data: buffer,
    compressionMethod,
    externalAttributes: 0
  });
}

function replaceFirstRichTextRunText(xml, value) {
  const runMatch = String(xml || '').match(/<r\b[\s\S]*?<\/r>/);
  if (!runMatch) {
    return null;
  }

  const updatedRun = runMatch[0].replace(/<t(\s[^>]*)?>[\s\S]*?<\/t>/, (match, attributes = '') => {
    return `<t${attributes}>${escapeXml(value)}</t>`;
  });
  if (updatedRun === runMatch[0]) {
    return null;
  }

  return `${xml.slice(0, runMatch.index)}${updatedRun}${xml.slice(runMatch.index + runMatch[0].length)}`;
}

function updateSharedStringRichCheckbox(sharedStringsXml, index, symbol) {
  const matches = [...String(sharedStringsXml || '').matchAll(/<si\b[\s\S]*?<\/si>/g)];
  const match = matches[index];
  if (!match) {
    return {
      xml: sharedStringsXml,
      updated: false
    };
  }

  const updatedSi = replaceFirstRichTextRunText(match[0], symbol);
  if (!updatedSi) {
    return {
      xml: sharedStringsXml,
      updated: false
    };
  }

  return {
    xml: `${sharedStringsXml.slice(0, match.index)}${updatedSi}${sharedStringsXml.slice(match.index + match[0].length)}`,
    updated: true
  };
}

function buildRichCheckboxFallback(cellRef, checkbox, cellXml) {
  const symbol = checkbox.checked ? checkbox.checkedSymbol || 'R' : checkbox.uncheckedSymbol || '£';
  const existingAttributes = cellXml?.match(/^<c\b([^>]*)>/)?.[1] || '';
  return buildInlineRichCheckboxCell(
    cellRef,
    {
      checkboxSymbol: symbol,
      fallbackText: checkbox.fallbackText,
      checkboxFont: checkbox.checkboxFont,
      textFont: checkbox.textFont
    },
    existingAttributes
  );
}

function updateXlsxRichCheckboxes(buffer, { richCheckboxValues = [] } = {}) {
  const checkboxes = (richCheckboxValues || []).filter((checkbox) => checkbox?.target);
  if (checkboxes.length === 0) {
    return buffer;
  }

  const entries = readZipEntries(buffer);
  const sheetEntry = getEntry(entries, 'xl/worksheets/sheet1.xml');
  if (!sheetEntry) {
    throw new Error('OOXML entry not found: xl/worksheets/sheet1.xml');
  }

  const sharedStringsEntry = getEntry(entries, 'xl/sharedStrings.xml');
  let sheetXml = sheetEntry.data.toString('utf8');
  let sharedStringsXml = sharedStringsEntry?.data.toString('utf8') || '';
  let sharedStringsChanged = false;

  for (const checkbox of checkboxes) {
    const cellRef = String(checkbox.target || '').trim();
    const symbol = checkbox.checked ? checkbox.checkedSymbol || 'R' : checkbox.uncheckedSymbol || '£';
    const cellPattern = new RegExp(`<c\\b(?=[^>]*\\br="${cellRef}")[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
    const cellMatch = sheetXml.match(cellPattern);
    if (!cellMatch) {
      continue;
    }

    const cellXml = cellMatch[0];
    if (/\bt="s"/.test(cellXml) && sharedStringsXml) {
      const sharedStringIndex = Number(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1]);
      const result = updateSharedStringRichCheckbox(sharedStringsXml, sharedStringIndex, symbol);
      if (result.updated) {
        sharedStringsXml = result.xml;
        sharedStringsChanged = true;
        continue;
      }
    }

    if (/\bt="inlineStr"/.test(cellXml)) {
      const updatedCell = replaceFirstRichTextRunText(cellXml, symbol);
      if (updatedCell) {
        sheetXml = sheetXml.replace(cellXml, updatedCell);
        continue;
      }
    }

    sheetXml = sheetXml.replace(cellXml, buildRichCheckboxFallback(cellRef, checkbox, cellXml));
  }

  sheetEntry.data = Buffer.from(sheetXml, 'utf8');
  if (sharedStringsEntry && sharedStringsChanged) {
    sharedStringsEntry.data = Buffer.from(sharedStringsXml, 'utf8');
  }

  return writeZipEntries(entries);
}

function nextRelationshipId(relsXml) {
  const ids = [...String(relsXml || '').matchAll(/\bId="rId(\d+)"/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isSafeInteger);
  return `rId${ids.length ? Math.max(...ids) + 1 : 1}`;
}

function nextMediaIndex(entries) {
  const indexes = entries
    .map((entry) => entry.name.match(/^xl\/media\/image(\d+)\.[^.]+$/)?.[1])
    .filter(Boolean)
    .map(Number);
  return indexes.length ? Math.max(...indexes) + 1 : 1;
}

function nextDrawingIndex(entries) {
  const indexes = entries
    .map((entry) => entry.name.match(/^xl\/drawings\/drawing(\d+)\.xml$/)?.[1])
    .filter(Boolean)
    .map(Number);
  return indexes.length ? Math.max(...indexes) + 1 : 1;
}

function buildRelationshipsXml(relationships = []) {
  return `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`;
}

function appendRelationship(relsXml, { id, type, target }) {
  const relationship = `<Relationship Id="${escapeXml(id)}" Type="${escapeXml(type)}" Target="${escapeXml(target)}"/>`;
  if (!relsXml || !relsXml.trim()) {
    return buildRelationshipsXml([relationship]);
  }

  return relsXml.replace('</Relationships>', `${relationship}</Relationships>`);
}

function ensureContentType(contentTypesXml, { extension, contentType, overridePartName = null, overrideContentType = null }) {
  let updated = contentTypesXml;
  const defaultPattern = new RegExp(`<Default\\b(?=[^>]*\\bExtension="${extension}")[^>]*/>`);
  if (!defaultPattern.test(updated)) {
    updated = updated.replace(
      '</Types>',
      `<Default Extension="${escapeXml(extension)}" ContentType="${escapeXml(contentType)}"/></Types>`
    );
  }

  if (overridePartName && overrideContentType) {
    const overridePattern = new RegExp(`<Override\\b(?=[^>]*\\bPartName="${overridePartName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")[^>]*/>`);
    if (!overridePattern.test(updated)) {
      updated = updated.replace(
        '</Types>',
        `<Override PartName="${escapeXml(overridePartName)}" ContentType="${escapeXml(overrideContentType)}"/></Types>`
      );
    }
  }

  return updated;
}

function normalizeImageExtension(mimeType, originalFileName = '') {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (normalizedMimeType === 'image/png') {
    return 'png';
  }
  if (normalizedMimeType === 'image/jpeg' || normalizedMimeType === 'image/jpg') {
    return 'jpg';
  }

  const extension = String(originalFileName || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === 'png') {
    return 'png';
  }
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'jpg';
  }

  throw new Error('Unsupported Excel image type');
}

function cellAnchor(cellRef) {
  const match = String(cellRef || '').match(CELL_REF_PATTERN);
  if (!match) {
    throw new Error(`Invalid Excel image cell target: ${cellRef}`);
  }

  return {
    column: columnZeroIndex(match[1]),
    row: Number(match[2]) - 1
  };
}

function parseAttributes(xml) {
  return Object.fromEntries(
    [...String(xml || '').matchAll(/\s([A-Za-z_:][\w:.-]*)="([^"]*)"/g)].map((match) => [match[1], match[2]])
  );
}

function buildWorksheetMetrics(sheetXml) {
  const sheetFormatAttributes = parseAttributes(sheetXml.match(/<sheetFormatPr\b[^>]*>/)?.[0] || '');
  const defaultColumnWidth = sheetFormatAttributes.defaultColWidth || DEFAULT_COLUMN_WIDTH;
  const defaultRowHeight = sheetFormatAttributes.defaultRowHeight || DEFAULT_ROW_HEIGHT_POINTS;
  const columnWidths = new Map();
  const rowHeights = new Map();

  for (const match of sheetXml.matchAll(/<col\b[^>]*>/g)) {
    const attributes = parseAttributes(match[0]);
    const min = Number(attributes.min);
    const max = Number(attributes.max);
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || !attributes.width) {
      continue;
    }
    for (let column = min; column <= max; column += 1) {
      columnWidths.set(column - 1, columnWidthToEmu(attributes.width));
    }
  }

  for (const match of sheetXml.matchAll(/<row\b[^>]*>/g)) {
    const attributes = parseAttributes(match[0]);
    const row = Number(attributes.r);
    if (!Number.isSafeInteger(row) || !attributes.ht) {
      continue;
    }
    rowHeights.set(row - 1, rowHeightToEmu(attributes.ht));
  }

  return {
    columnWidth(column) {
      return columnWidths.get(column) || columnWidthToEmu(defaultColumnWidth);
    },
    rowHeight(row) {
      return rowHeights.get(row) || rowHeightToEmu(defaultRowHeight);
    }
  };
}

function sumAxisSize(start, endExclusive, sizeForIndex) {
  let total = 0;
  for (let index = start; index < endExclusive; index += 1) {
    total += sizeForIndex(index);
  }
  return total;
}

function buildRangeBounds(target, sheetMetrics) {
  const from = cellAnchor(target?.fromCell);
  const to = cellAnchor(target?.toCell || target?.fromCell);
  const startColumn = Math.min(from.column, to.column);
  const endColumn = Math.max(from.column, to.column) + 1;
  const startRow = Math.min(from.row, to.row);
  const endRow = Math.max(from.row, to.row) + 1;
  const left = sumAxisSize(0, startColumn, (index) => sheetMetrics.columnWidth(index));
  const top = sumAxisSize(0, startRow, (index) => sheetMetrics.rowHeight(index));
  const width = sumAxisSize(startColumn, endColumn, (index) => sheetMetrics.columnWidth(index));
  const height = sumAxisSize(startRow, endRow, (index) => sheetMetrics.rowHeight(index));

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function coordinateToMarker(value, sizeForIndex) {
  let index = 0;
  let remaining = Math.max(0, Number(value) || 0);

  while (index < 16384) {
    const size = sizeForIndex(index);
    if (remaining < size) {
      return {
        index,
        offset: Math.round(remaining)
      };
    }
    remaining -= size;
    index += 1;
  }

  return {
    index,
    offset: 0
  };
}

function parsePngDimensions(buffer) {
  if (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  return null;
}

function parseJpegDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) {
      return null;
    }
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }

  return null;
}

function readImageDimensions(buffer) {
  const dimensions = parsePngDimensions(buffer) || parseJpegDimensions(buffer);
  if (dimensions?.width > 0 && dimensions?.height > 0) {
    return dimensions;
  }

  return { width: 1, height: 1 };
}

function buildImageBounds(image, sheetMetrics) {
  const range = buildRangeBounds(image.target, sheetMetrics);
  const layoutCount = Math.max(1, Math.min(3, Number(image.layoutCount) || 1));
  const layoutIndex = Math.max(0, Math.min(layoutCount - 1, Number(image.layoutIndex) || 0));
  const slotWidth = range.width / layoutCount;
  const slot = {
    left: range.left + slotWidth * layoutIndex,
    top: range.top,
    width: slotWidth,
    height: range.height
  };

  if (image.preserveAspectRatio === false) {
    return slot;
  }

  const dimensions = readImageDimensions(image.buffer);
  const imageRatio = dimensions.width / dimensions.height;
  const slotRatio = slot.width / slot.height;
  let width = slot.width;
  let height = slot.height;
  if (slotRatio > imageRatio) {
    height = slot.height;
    width = height * imageRatio;
  } else {
    width = slot.width;
    height = width / imageRatio;
  }

  return {
    left: slot.left + (slot.width - width) / 2,
    top: slot.top + (slot.height - height) / 2,
    width,
    height
  };
}

function buildAnchorMarkers(image, sheetMetrics) {
  const bounds = buildImageBounds(image, sheetMetrics);
  const fromColumn = coordinateToMarker(bounds.left, (index) => sheetMetrics.columnWidth(index));
  const fromRow = coordinateToMarker(bounds.top, (index) => sheetMetrics.rowHeight(index));
  const toColumn = coordinateToMarker(bounds.left + bounds.width, (index) => sheetMetrics.columnWidth(index));
  const toRow = coordinateToMarker(bounds.top + bounds.height, (index) => sheetMetrics.rowHeight(index));

  return {
    from: {
      column: fromColumn.index,
      columnOffset: fromColumn.offset,
      row: fromRow.index,
      rowOffset: fromRow.offset
    },
    to: {
      column: toColumn.index,
      columnOffset: toColumn.offset,
      row: toRow.index,
      rowOffset: toRow.offset
    }
  };
}

function imageTargetKey(image) {
  return `${image.target?.fromCell || ''}:${image.target?.toCell || image.target?.fromCell || ''}`;
}

function prepareImageLayouts(images) {
  const groups = new Map();
  for (const image of images) {
    const key = imageTargetKey(image);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(image);
  }

  return [...groups.values()].flatMap((group) => {
    const count = Math.min(3, group.length);
    return group.slice(0, count).map((image, index) => ({
      ...image,
      layoutIndex: Number.isSafeInteger(Number(image.layoutIndex)) ? Number(image.layoutIndex) : index,
      layoutCount: Number.isSafeInteger(Number(image.layoutCount)) ? Number(image.layoutCount) : count
    }));
  });
}

function normalizeMergeAdjustment(adjustment) {
  if (!adjustment?.unmergeRange && !adjustment?.textMergeRange) {
    return null;
  }

  return {
    unmergeRange: adjustment.unmergeRange ? String(adjustment.unmergeRange).trim() : '',
    textMergeRange: adjustment.textMergeRange ? String(adjustment.textMergeRange).trim() : ''
  };
}

function parseMergeCellRefs(sheetXml) {
  const mergeCellsMatch = sheetXml.match(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/);
  if (!mergeCellsMatch) {
    return {
      originalXml: '',
      refs: []
    };
  }

  return {
    originalXml: mergeCellsMatch[0],
    refs: [...mergeCellsMatch[0].matchAll(/<mergeCell\b[^>]*\bref="([^"]+)"[^>]*\/>/g)].map((match) => match[1])
  };
}

function buildMergeCellsXml(refs) {
  if (refs.length === 0) {
    return '';
  }

  return `<mergeCells count="${refs.length}">${refs.map((ref) => `<mergeCell ref="${escapeXml(ref)}"/>`).join('')}</mergeCells>`;
}

function applyImageMergeAdjustments(sheetXml, images) {
  const adjustments = images.map((image) => normalizeMergeAdjustment(image.mergeAdjustment)).filter(Boolean);
  if (adjustments.length === 0) {
    return sheetXml;
  }

  const { originalXml, refs } = parseMergeCellRefs(sheetXml);
  const removeRefs = new Set(adjustments.map((adjustment) => adjustment.unmergeRange).filter(Boolean));
  const addRefs = adjustments.map((adjustment) => adjustment.textMergeRange).filter(Boolean);
  const nextRefs = [...refs.filter((ref) => !removeRefs.has(ref))];
  for (const ref of addRefs) {
    if (!nextRefs.includes(ref)) {
      nextRefs.push(ref);
    }
  }

  const nextXml = buildMergeCellsXml(nextRefs);
  if (originalXml) {
    return sheetXml.replace(originalXml, nextXml);
  }

  if (!nextXml) {
    return sheetXml;
  }

  const worksheetEnd = sheetXml.lastIndexOf('</worksheet>');
  if (worksheetEnd === -1) {
    throw new Error('Invalid worksheet XML: worksheet end not found');
  }

  return `${sheetXml.slice(0, worksheetEnd)}${nextXml}${sheetXml.slice(worksheetEnd)}`;
}

function buildAnchorXml({ image, imageRelId, shapeId, sheetMetrics }) {
  const markers = buildAnchorMarkers(image, sheetMetrics);
  const name = image.originalFileName || `image-${shapeId}`;

  return `
  <xdr:twoCellAnchor editAs="oneCell">
    <xdr:from>
      <xdr:col>${markers.from.column}</xdr:col>
      <xdr:colOff>${markers.from.columnOffset}</xdr:colOff>
      <xdr:row>${markers.from.row}</xdr:row>
      <xdr:rowOff>${markers.from.rowOffset}</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>${markers.to.column}</xdr:col>
      <xdr:colOff>${markers.to.columnOffset}</xdr:colOff>
      <xdr:row>${markers.to.row}</xdr:row>
      <xdr:rowOff>${markers.to.rowOffset}</xdr:rowOff>
    </xdr:to>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="${shapeId}" name="${escapeXml(name)}"/>
        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip r:embed="${escapeXml(imageRelId)}"/>
        <a:stretch><a:fillRect/></a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`;
}

function emptyDrawingXml() {
  return '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"></xdr:wsDr>';
}

function ensureWorksheetDrawing({ entries, sheetXml }) {
  const sheetRelsPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  let relsXml = getTextEntry(entries, sheetRelsPath, '');
  const existingDrawingRelId = sheetXml.match(/<drawing\b[^>]*\br:id="([^"]+)"/)?.[1] || null;
  if (existingDrawingRelId && relsXml) {
    const relMatch = relsXml.match(new RegExp(`<Relationship\\b(?=[^>]*\\bId="${existingDrawingRelId}")[^>]*\\bTarget="([^"]+)"[^>]*/>`));
    if (relMatch) {
      const target = relMatch[1].replace(/^\/+/, '');
      const drawingPath = target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\.\//, '')}`;
      return { sheetXml, relsXml, sheetRelsPath, drawingPath };
    }
  }

  const drawingIndex = nextDrawingIndex(entries);
  const drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;
  const drawingRelId = nextRelationshipId(relsXml);
  relsXml = appendRelationship(relsXml, {
    id: drawingRelId,
    type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing',
    target: `../drawings/drawing${drawingIndex}.xml`
  });

  let updatedSheetXml = sheetXml;
  if (!/\bxmlns:r=/.test(updatedSheetXml.match(/^<worksheet\b[^>]*>/)?.[0] || '')) {
    updatedSheetXml = updatedSheetXml.replace(
      /^<worksheet\b([^>]*)>/,
      '<worksheet$1 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    );
  }
  updatedSheetXml = updatedSheetXml.replace('</worksheet>', `<drawing r:id="${drawingRelId}"/></worksheet>`);

  return {
    sheetXml: updatedSheetXml,
    relsXml,
    sheetRelsPath,
    drawingPath
  };
}

function addImagesToXlsxPackage(buffer, imageValues = []) {
  const images = prepareImageLayouts(
    (imageValues || []).filter((image) => Buffer.isBuffer(image?.buffer) && image.buffer.length > 0)
  );
  if (images.length === 0) {
    return buffer;
  }

  const entries = readZipEntries(buffer);
  const sheetEntry = getEntry(entries, 'xl/worksheets/sheet1.xml');
  if (!sheetEntry) {
    throw new Error('OOXML entry not found: xl/worksheets/sheet1.xml');
  }
  const contentTypesEntry = getEntry(entries, '[Content_Types].xml');
  if (!contentTypesEntry) {
    throw new Error('OOXML entry not found: [Content_Types].xml');
  }

  const originalSheetXml = applyImageMergeAdjustments(sheetEntry.data.toString('utf8'), images);
  sheetEntry.data = Buffer.from(originalSheetXml, 'utf8');
  const worksheetDrawing = ensureWorksheetDrawing({
    entries,
    sheetXml: originalSheetXml
  });
  const sheetMetrics = buildWorksheetMetrics(originalSheetXml);
  let contentTypesXml = contentTypesEntry.data.toString('utf8');
  const drawingRelsPath = `xl/drawings/_rels/${worksheetDrawing.drawingPath.split('/').pop()}.rels`;
  let drawingRelsXml = getTextEntry(entries, drawingRelsPath, '');
  let drawingXml = getTextEntry(entries, worksheetDrawing.drawingPath, emptyDrawingXml());
  const anchors = [];
  let mediaIndex = nextMediaIndex(entries);

  images.forEach((image, index) => {
    const extension = normalizeImageExtension(image.mimeType, image.originalFileName);
    const mediaPath = `xl/media/image${mediaIndex}.${extension}`;
    mediaIndex += 1;
    setEntry(entries, mediaPath, image.buffer, { compressionMethod: 0 });
    contentTypesXml = ensureContentType(contentTypesXml, {
      extension,
      contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      overridePartName: `/${worksheetDrawing.drawingPath}`,
      overrideContentType: 'application/vnd.openxmlformats-officedocument.drawing+xml'
    });

    const imageRelId = nextRelationshipId(drawingRelsXml);
    drawingRelsXml = appendRelationship(drawingRelsXml, {
      id: imageRelId,
      type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      target: `../media/${mediaPath.split('/').pop()}`
    });
    anchors.push(buildAnchorXml({ image, imageRelId, shapeId: 1000 + index + 1, sheetMetrics }));
  });

  if (!drawingXml.includes('</xdr:wsDr>')) {
    throw new Error('Invalid Excel drawing XML');
  }
  drawingXml = drawingXml.replace('</xdr:wsDr>', `${anchors.join('')}</xdr:wsDr>`);

  sheetEntry.data = Buffer.from(worksheetDrawing.sheetXml, 'utf8');
  contentTypesEntry.data = Buffer.from(contentTypesXml, 'utf8');
  setEntry(entries, worksheetDrawing.sheetRelsPath, worksheetDrawing.relsXml);
  setEntry(entries, worksheetDrawing.drawingPath, drawingXml);
  setEntry(entries, drawingRelsPath, drawingRelsXml);

  return writeZipEntries(entries);
}

export function renderXlsxTemplate(templateBuffer, { cellValues, imageValues = [], richCheckboxValues = [] }) {
  const withCells = updateXlsxCells(templateBuffer, { cellValues });
  const withRichCheckboxes = updateXlsxRichCheckboxes(withCells, { richCheckboxValues });
  return addImagesToXlsxPackage(withRichCheckboxes, imageValues);
}

function setWordCellText(cellXml, value) {
  let textIndex = 0;
  const updated = cellXml.replace(/<w:t(\s[^>]*)?>[\s\S]*?<\/w:t>/g, (match, attributes = '') => {
    const text = textIndex === 0 ? escapeXml(value) : '';
    textIndex += 1;
    const normalizedAttributes = /\bxml:space=/.test(attributes)
      ? attributes
      : `${attributes} xml:space="preserve"`;
    return `<w:t${normalizedAttributes}>${text}</w:t>`;
  });

  if (textIndex > 0) {
    return updated;
  }

  const insertionIndex = cellXml.lastIndexOf('</w:tc>');
  if (insertionIndex === -1) {
    return cellXml;
  }

  const paragraph = `<w:p><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
  return `${cellXml.slice(0, insertionIndex)}${paragraph}${cellXml.slice(insertionIndex)}`;
}

function replaceWordRowCells(rowXml, values) {
  let cellIndex = 0;
  return rowXml.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cellXml) => {
    const value = cellIndex < values.length ? values[cellIndex] : '';
    cellIndex += 1;
    return setWordCellText(cellXml, value);
  });
}

function resolveWordTableIndex(value) {
  if (value === 'firstTable' || value === undefined || value === null) {
    return 0;
  }
  return Number(value);
}

function resolveWordRowIndex(value) {
  if (value === 'dataRow') {
    return 1;
  }
  return Number(value);
}

function replaceWordRowCellTargets(rowXml, valuesByCellIndex) {
  let cellIndex = 0;
  let updatedAny = false;
  const updatedRow = rowXml.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cellXml) => {
    const value = valuesByCellIndex.get(cellIndex);
    cellIndex += 1;
    if (value === undefined) {
      return cellXml;
    }
    updatedAny = true;
    return setWordCellText(cellXml, value);
  });

  return {
    rowXml: updatedRow,
    cellCount: cellIndex,
    updatedAny
  };
}

function buildWordTableTargets(tableCellValues) {
  const targets = new Map();
  for (const item of tableCellValues || []) {
    const tableIndex = resolveWordTableIndex(item.target?.tableIndex);
    const rowIndex = resolveWordRowIndex(item.target?.rowIndex);
    const cellIndex = Number(item.target?.cellIndex);
    if (!Number.isSafeInteger(tableIndex) || tableIndex < 0) {
      throw new Error(`Invalid Word table target index: ${item.target?.tableIndex}`);
    }
    if (!Number.isSafeInteger(rowIndex) || rowIndex < 0) {
      throw new Error(`Invalid Word row target index: ${item.target?.rowIndex}`);
    }
    if (!Number.isSafeInteger(cellIndex) || cellIndex < 0) {
      throw new Error(`Invalid Word cell target index: ${item.target?.cellIndex}`);
    }

    const tableKey = String(tableIndex);
    if (!targets.has(tableKey)) {
      targets.set(tableKey, new Map());
    }
    const rows = targets.get(tableKey);
    const rowKey = String(rowIndex);
    if (!rows.has(rowKey)) {
      rows.set(rowKey, new Map());
    }
    rows.get(rowKey).set(cellIndex, item.value ?? '');
  }
  return targets;
}

function buildWordTableRowTargets(tableRows) {
  const targets = new Map();
  for (const item of tableRows || []) {
    const tableIndex = resolveWordTableIndex(item.target?.tableIndex);
    const templateRowIndex = resolveWordRowIndex(item.target?.templateRowIndex);
    if (!Number.isSafeInteger(tableIndex) || tableIndex < 0) {
      throw new Error(`Invalid Word table target index: ${item.target?.tableIndex}`);
    }
    if (!Number.isSafeInteger(templateRowIndex) || templateRowIndex < 0) {
      throw new Error(`Invalid Word row target index: ${item.target?.templateRowIndex}`);
    }

    targets.set(String(tableIndex), {
      templateRowIndex,
      rows: Array.isArray(item.rows) ? item.rows : [],
      removeRowsAfterTemplate: item.removeRowsAfterTemplate !== false
    });
  }
  return targets;
}

function replaceWordTableRowsFromTemplate(tableXml, rowTarget) {
  const rowMatches = [...tableXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)];
  const templateRow = rowMatches[rowTarget.templateRowIndex];
  if (!templateRow) {
    throw new Error(`Invalid Word document XML: target row not found ${rowTarget.templateRowIndex}`);
  }

  const templateCellCount = [...templateRow[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].length;
  const generatedRows = rowTarget.rows.map((values) => {
    if (values.length > templateCellCount) {
      throw new Error(`Invalid Word table row mapping: too many values for row ${rowTarget.templateRowIndex}`);
    }
    return replaceWordRowCells(templateRow[0], values);
  });

  const start = templateRow.index;
  const replacementEnd = rowTarget.removeRowsAfterTemplate
    ? rowMatches[rowMatches.length - 1].index + rowMatches[rowMatches.length - 1][0].length
    : templateRow.index + templateRow[0].length;

  return `${tableXml.slice(0, start)}${generatedRows.join('')}${tableXml.slice(replacementEnd)}`;
}

function updateWordTables(documentXml, { tableCellValues = [], tableRows = [], clearRowsAfterDataRow = false } = {}) {
  const tableMatches = [...documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)];
  if (tableMatches.length === 0) {
    throw new Error('Invalid Word document XML: table not found');
  }

  const targets = buildWordTableTargets(tableCellValues);
  const rowTargets = buildWordTableRowTargets(tableRows);
  const updatedTables = new Map();

  tableMatches.forEach((tableMatch, tableIndex) => {
    const tableTargets = targets.get(String(tableIndex));
    const tableRowTarget = rowTargets.get(String(tableIndex));
    if (!tableTargets && !tableRowTarget && !clearRowsAfterDataRow) {
      return;
    }

    let workingTableXml = tableRowTarget
      ? replaceWordTableRowsFromTemplate(tableMatch[0], tableRowTarget)
      : tableMatch[0];
    let rowIndex = 0;
    workingTableXml = workingTableXml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (rowXml) => {
      const rowTargets = tableTargets?.get(String(rowIndex));
      let nextRowXml = rowXml;
      let result = null;
      if (rowTargets) {
        result = replaceWordRowCellTargets(rowXml, rowTargets);
        nextRowXml = result.rowXml;
      } else if (clearRowsAfterDataRow && tableIndex === 0 && rowIndex > 1) {
        nextRowXml = replaceWordRowCells(rowXml, []);
      }
      rowIndex += 1;
      return nextRowXml;
    });

    if (tableTargets) {
      for (const [targetRowIndex, valuesByCellIndex] of tableTargets.entries()) {
        if (Number(targetRowIndex) >= rowIndex) {
          throw new Error(`Invalid Word document XML: target row not found ${targetRowIndex}`);
        }
        const maxCellIndex = Math.max(...valuesByCellIndex.keys());
        const rowXml = [...tableMatch[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)][Number(targetRowIndex)]?.[0];
        const cellCount = [...(rowXml || '').matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].length;
        if (cellCount <= maxCellIndex) {
          throw new Error(`Invalid Word document XML: target cell not found ${targetRowIndex}.${maxCellIndex}`);
        }
      }
    }
    updatedTables.set(tableMatch[0], workingTableXml);
  });

  return [...updatedTables.entries()].reduce(
    (xml, [originalTableXml, updatedTableXml]) => xml.replace(originalTableXml, updatedTableXml),
    documentXml
  );
}

function updateWordTextReplacements(documentXml, { textReplacements = [] } = {}) {
  return textReplacements.reduce((xml, replacement) => {
    const matchText = replacement.target?.matchText;
    if (typeof matchText !== 'string' || matchText.length === 0) {
      throw new Error('Invalid Word text replacement target');
    }

    const escapedMatchText = escapeXml(matchText);
    if (!xml.includes(escapedMatchText)) {
      throw new Error(`Invalid Word document XML: replacement text not found ${matchText}`);
    }

    return xml.split(escapedMatchText).join(escapeXml(replacement.value ?? ''));
  }, documentXml);
}

export function renderDocxTemplate(
  templateBuffer,
  { tableCellValues = [], tableRows = [], textReplacements = [], clearRowsAfterDataRow = false }
) {
  return updateZipTextEntry(templateBuffer, 'word/document.xml', (documentXml) => {
    const updatedTablesXml = updateWordTables(documentXml, { tableCellValues, tableRows, clearRowsAfterDataRow });
    return updateWordTextReplacements(updatedTablesXml, { textReplacements });
  });
}
