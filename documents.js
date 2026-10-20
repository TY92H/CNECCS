/* CNECCS local document extraction. No upload, AI service, telemetry, or formula
 * execution. Returned text is untrusted data: render with textContent/escaping. */
(function (root) {
  'use strict';
  const LIMITS = Object.freeze({ fileBytes: 16 * 1024 * 1024, expandedBytes: 32 * 1024 * 1024, archiveEntries: 2000, xmlNodes: 200000, xmlDepth: 100, rows: 20000, columns: 256, cells: 100000, textCharacters: 400000, pdfPages: 80 });
  const ACCEPT = '.txt,.csv,.xlsx,.docx,.pdf';
  const messages = {
    UNSUPPORTED_FORMAT: ['请使用 TXT、CSV、XLSX、DOCX 或文本型 PDF。旧版 DOC/XLS、图片和其他格式不受支持。', 'Use TXT, CSV, XLSX, DOCX, or a text-based PDF. Legacy DOC/XLS, images, and other formats are unsupported.'],
    MACRO_REJECTED: ['不处理含宏或可执行嵌入内容的 Office 文件。请另存为不含宏的普通 XLSX/DOCX 或文本文件。', 'Office files containing macros or executable embedded content are not processed. Save a macro-free XLSX/DOCX or plain-text copy.'],
    TOO_LARGE: ['文件或展开后的内容超过本地处理限额。请拆分为较小的文件。', 'The file or expanded content exceeds local processing limits. Split it into smaller files.'],
    ENCRYPTED: ['不支持加密或受密码保护的文件。请提供经授权解密的副本。', 'Encrypted or password-protected files are unsupported. Provide an authorized decrypted copy.'],
    INVALID_FILE: ['文件结构无效或已损坏。请使用原应用重新保存后重试。', 'The file structure is invalid or damaged. Save it again in its source application.'],
    UNSUPPORTED_ZIP: ['此浏览器无法处理该 Office 压缩格式。请使用较新的 Chrome/Edge，或另存为 TXT/CSV。', 'This browser cannot process the Office compression format. Use a recent Chrome/Edge release or save as TXT/CSV.'],
    UNSUPPORTED_ENCODING: ['文本编码无法可靠识别。请另存为 UTF-8 或 UTF-16 文本后重试。', 'The text encoding could not be reliably decoded. Save it as UTF-8 or UTF-16 and try again.'],
    INVALID_XML: ['Office 文档 XML 无效或包含不支持的外部实体声明。', 'The Office XML is invalid or contains unsupported external entity declarations.'],
    CSV_INVALID: ['CSV 引号或列结构无效，请检查文件后重试。', 'The CSV quoting or column structure is invalid. Check the file and retry.'],
    PDF_UNAVAILABLE: ['本地 PDF 解析组件未能载入。请使用完整工程包或嵌入解析组件的独立 HTML。', 'The local PDF parser could not load. Use the complete project or a standalone HTML with the parser embedded.'],
    PDF_INVALID: ['无法解析此 PDF。它可能已损坏、受保护或使用不支持的结构。', 'This PDF could not be parsed. It may be damaged, protected, or use an unsupported structure.'],
    CANCELLED: ['文件处理已取消。', 'Document processing was canceled.']
  };
  class DocumentError extends Error {
    constructor(code) { super((messages[code] || messages.INVALID_FILE)[1]); this.name = 'DocumentError'; this.code = code; this.userMessage = pair(...(messages[code] || messages.INVALID_FILE)); }
  }
  function pair(zh, en = zh) { return { zh, en }; }
  function fail(code) { throw new DocumentError(code); }
  function checkAbort(options) { if (options?.signal?.aborted) fail('CANCELLED'); }
  function warning(result, code, zh, en) { if (!result.warnings.some(w => w.code === code)) result.warnings.push({ code, message: pair(zh, en) }); }
  function resultFor(name, format) { return { fileName: name, format, text: '', sections: [], tables: [], warnings: [], metadata: {}, requiresReview: true }; }
  function finish(result) {
    result.text = result.sections.map(s => s.text).filter(Boolean).join('\n\n');
    if (result.text.length > LIMITS.textCharacters) fail('TOO_LARGE');
    if (!result.text.trim()) warning(result, 'NO_TEXT', '没有提取到可确认的文本。本功能不执行 OCR；扫描件、图片及缺少字符映射的内容需要另行提供文本。', 'No reviewable text was extracted. This feature does not perform OCR; scans, images, and content without usable character mappings need a text alternative.');
    result.metadata.characters = result.text.length;
    return result;
  }
  function limitCharacters(text) { if (text.length > LIMITS.textCharacters) fail('TOO_LARGE'); return text; }
  function decodeText(bytes) {
    let encoding = 'utf-8';
    if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
    else if (bytes.length >= 8) {
      let even = 0, odd = 0;
      for (let i = 0; i < Math.min(bytes.length, 200); i++) if (bytes[i] === 0) i % 2 ? odd++ : even++;
      if (odd > 10 && even === 0) encoding = 'utf-16le';
      else if (even > 10 && odd === 0) encoding = 'utf-16be';
    }
    try {
      const text = new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      if (/\u0000/.test(text)) fail('UNSUPPORTED_ENCODING');
      return { text: limitCharacters(text), encoding };
    } catch (error) { if (error instanceof DocumentError) throw error; fail('UNSUPPORTED_ENCODING'); }
  }
  function detectDelimiter(text) {
    const line = text.split('\n').find(s => s.trim()) || '';
    const counts = { ',': 0, ';': 0, '\t': 0 }; let quoted = false;
    for (let i = 0; i < line.length; i++) { if (line[i] === '"') { if (quoted && line[i + 1] === '"') i++; else quoted = !quoted; } else if (!quoted && line[i] in counts) counts[line[i]]++; }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  }
  function parseCSV(text) {
    const delimiter = detectDelimiter(text); const rows = []; let row = [], field = '', quoted = false, closed = false, cells = 0;
    function pushField() { if (++cells > LIMITS.cells || row.length >= LIMITS.columns) fail('TOO_LARGE'); row.push(field); field = ''; closed = false; }
    function pushRow() { pushField(); if (rows.length >= LIMITS.rows) fail('TOO_LARGE'); rows.push(row); row = []; }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += c; }
      else if (c === delimiter) pushField();
      else if (c === '\n') pushRow();
      else if (c === '"') { if (field || closed) fail('CSV_INVALID'); quoted = true; }
      else if (closed) { if (c !== ' ' && c !== '\t') fail('CSV_INVALID'); }
      else field += c;
    }
    if (quoted) fail('CSV_INVALID');
    if (field || row.length || closed) pushRow();
    return { rows, delimiter };
  }
  const crcTable = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
  function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  async function readZIP(bytes, options) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) if (view.getUint32(p, true) === 0x06054b50 && p + 22 + view.getUint16(p + 20, true) === bytes.length) { end = p; break; }
    if (end < 0) fail('INVALID_FILE');
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== view.getUint16(end + 10, true)) fail('UNSUPPORTED_ZIP');
    const count = view.getUint16(end + 10, true), start = view.getUint32(end + 16, true), size = view.getUint32(end + 12, true);
    if (count > LIMITS.archiveEntries || count === 65535 || start === 0xffffffff || start + size > end) fail('TOO_LARGE');
    const entries = new Map(); let p = start, totalExpanded = 0;
    for (let i = 0; i < count; i++) {
      checkAbort(options);
      if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) fail('INVALID_FILE');
      const flags = view.getUint16(p + 8, true), method = view.getUint16(p + 10, true), crc = view.getUint32(p + 16, true), compressed = view.getUint32(p + 20, true), expanded = view.getUint32(p + 24, true), nlen = view.getUint16(p + 28, true), elen = view.getUint16(p + 30, true), clen = view.getUint16(p + 32, true), offset = view.getUint32(p + 42, true);
      if (flags & 1) fail('ENCRYPTED');
      if (p + 46 + nlen + elen + clen > start + size) fail('INVALID_FILE');
      const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nlen));
      if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..') || name.includes('\u0000') || entries.has(name)) fail('INVALID_FILE');
      if (/vbaproject|activex|embeddings\/.*\.(?:bin|exe|dll)$/i.test(name)) fail('MACRO_REJECTED');
      if (![0, 8].includes(method)) fail('UNSUPPORTED_ZIP');
      totalExpanded += expanded;
      if (totalExpanded > LIMITS.expandedBytes || expanded > LIMITS.expandedBytes || offset + 30 > bytes.length) fail('TOO_LARGE');
      if (offset + 30 > start || view.getUint16(p + 34, true)) fail('INVALID_FILE');
      entries.set(name, { name, flags, method, crc, compressed, expanded, offset }); p += 46 + nlen + elen + clen;
    }
    if (p !== start + size) fail('INVALID_FILE');
    let consumed = 0;
    return {
      names: [...entries.keys()],
      async read(name, optional = false) {
        const entry = entries.get(name); if (!entry) { if (optional) return null; fail('INVALID_FILE'); }
        checkAbort(options); const o = entry.offset;
        if (view.getUint32(o, true) !== 0x04034b50) fail('INVALID_FILE');
        const dataStart = o + 30 + view.getUint16(o + 26, true) + view.getUint16(o + 28, true);
        if (dataStart + entry.compressed > start) fail('INVALID_FILE');
        if (view.getUint16(o + 6, true) !== entry.flags || view.getUint16(o + 8, true) !== entry.method || new TextDecoder().decode(bytes.subarray(o + 30, o + 30 + view.getUint16(o + 26, true))) !== entry.name) fail('INVALID_FILE');
        // Bit 3 permits sizes/CRC to follow the data. Otherwise both headers must agree.
        if (!(entry.flags & 8) && (view.getUint32(o + 14, true) !== entry.crc || view.getUint32(o + 18, true) !== entry.compressed || view.getUint32(o + 22, true) !== entry.expanded)) fail('INVALID_FILE');
        const data = bytes.subarray(dataStart, dataStart + entry.compressed); let output;
        if (entry.method === 0) output = data.slice();
        else {
          let decompressor; try { decompressor = new DecompressionStream('deflate-raw'); } catch { fail('UNSUPPORTED_ZIP'); }
          const reader = new Blob([data]).stream().pipeThrough(decompressor).getReader(); const chunks = []; let length = 0;
          const abort = () => { reader.cancel().catch(() => {}); };
          options.signal?.addEventListener('abort', abort, { once: true });
          try {
            while (true) { checkAbort(options); const chunk = await reader.read(); checkAbort(options); if (chunk.done) break; length += chunk.value.byteLength; if (length > entry.expanded || consumed + length > LIMITS.expandedBytes) fail('TOO_LARGE'); chunks.push(chunk.value); }
          } catch (error) { await reader.cancel().catch(() => {}); checkAbort(options); if (error instanceof DocumentError) throw error; fail('INVALID_FILE'); }
          finally { options.signal?.removeEventListener('abort', abort); reader.releaseLock(); }
          output = new Uint8Array(length); let cursor = 0; for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; }
        }
        consumed += output.length;
        if (output.length !== entry.expanded || crc32(output) !== entry.crc) fail('INVALID_FILE');
        if (consumed > LIMITS.expandedBytes) fail('TOO_LARGE');
        return output;
      }
    };
  }
  function xmlDecode(text) {
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(text)) fail('INVALID_XML');
    return text.replace(/&([^;]*);/g, (_, value) => {
      if (value === 'amp') return '&'; if (value === 'lt') return '<'; if (value === 'gt') return '>'; if (value === 'quot') return '"'; if (value === 'apos') return "'";
      const code = /^#x[0-9a-f]+$/i.test(value) ? parseInt(value.slice(2), 16) : /^#\d+$/.test(value) ? Number(value.slice(1)) : NaN;
      if (!Number.isInteger(code) || code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) fail('INVALID_XML');
      return String.fromCodePoint(code);
    });
  }
  function parseXML(bytes) {
    let xml; try { xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('INVALID_XML'); }
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail('INVALID_XML');
    const doc = { name: '#document', attrs: {}, children: [] }, stack = [doc]; let cursor = 0, count = 0;
    const token = /<!--[^]*?-->|<\?[^]*?\?>|<!\[CDATA\[[^]*?\]\]>|<\/(?:[^>]+)>|<(?:[^>"']|"[^"]*"|'[^']*')+>|[^<]+/g;
    let match;
    while ((match = token.exec(xml))) {
      if (match.index !== cursor) fail('INVALID_XML'); cursor = token.lastIndex;
      if (++count > LIMITS.xmlNodes) fail('TOO_LARGE');
      const value = match[0];
      if (value.startsWith('<!--') || value.startsWith('<?')) continue;
      if (value.startsWith('<![CDATA[')) { stack.at(-1).children.push({ name: '#text', text: value.slice(9, -3) }); continue; }
      if (value.startsWith('</')) { if (stack.length === 1 || stack.at(-1).name !== value.slice(2, -1).trim()) fail('INVALID_XML'); stack.pop(); continue; }
      if (value.startsWith('<')) {
        if (value.startsWith('<!')) fail('INVALID_XML');
        if (stack.length > LIMITS.xmlDepth) fail('TOO_LARGE');
        const self = /\/\s*>$/.test(value), inside = value.slice(1, self ? value.lastIndexOf('/') : -1).trim(), nameMatch = /^([\w:.-]+)([\s\S]*)$/.exec(inside);
        if (!nameMatch) fail('INVALID_XML');
        const attrs = Object.create(null), remainder = nameMatch[2], attr = /\s+([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g; let a, used = 0;
        while ((a = attr.exec(remainder))) { if (a.index !== used || Object.hasOwn(attrs, a[1]) || (a[2] ?? a[3]).includes('<')) fail('INVALID_XML'); attrs[a[1]] = xmlDecode(a[2] ?? a[3]); used = attr.lastIndex; }
        if (remainder.slice(used).trim()) fail('INVALID_XML');
        const node = { name: nameMatch[1], attrs, children: [] }; stack.at(-1).children.push(node); if (!self) stack.push(node);
      } else { if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(value)) fail('INVALID_XML'); stack.at(-1).children.push({ name: '#text', text: xmlDecode(value) }); }
    }
    if (cursor !== xml.length || stack.length !== 1 || doc.children.filter(n => n.name !== '#text').length !== 1 || doc.children.some(n => n.name === '#text' && n.text.trim())) fail('INVALID_XML');
    return doc;
  }
  const localName = node => node.name?.split(':').at(-1);
  function children(node, name) { return (node?.children || []).filter(n => localName(n) === name); }
  function descendants(node, name, found = []) { for (const child of node?.children || []) { if (localName(child) === name) found.push(child); descendants(child, name, found); } return found; }
  function nodeText(node) { return node?.name === '#text' ? node.text : (node?.children || []).map(nodeText).join(''); }
  function attr(node, name) { return node?.attrs?.[name] ?? Object.entries(node?.attrs || {}).find(([key]) => key.split(':').at(-1) === name)?.[1]; }
  async function officeZIP(bytes, options) {
    const zip = await readZIP(bytes, options); const types = await zip.read('[Content_Types].xml');
    if (/macroEnabled|vbaProject|activeX/i.test(new TextDecoder().decode(types))) fail('MACRO_REJECTED');
    parseXML(types); return zip;
  }
  function wordText(node) {
    const type = localName(node);
    if (['del', 'instrText', 'drawing', 'pict', 'object'].includes(type)) return '';
    if (type === 't') return nodeText(node);
    if (type === 'tab') return '\t'; if (type === 'br' || type === 'cr') return '\n';
    const text = (node.children || []).map(wordText).join(''); return type === 'p' ? text + '\n' : text;
  }
  async function parseDOCX(bytes, result, options) {
    const zip = await officeZIP(bytes, options), xml = parseXML(await zip.read('word/document.xml'));
    const body = descendants(xml, 'body')[0]; if (!body) fail('INVALID_FILE');
    let bodyText = '', tableNo = 0, rowsCount = 0, cellCount = 0;
    for (const node of body.children) {
      checkAbort(options);
      if (localName(node) === 'tbl') {
        const rows = children(node, 'tr').map(row => children(row, 'tc').map(cell => wordText(cell).trim()));
        rowsCount += rows.length; for (const row of rows) { cellCount += row.length; if (row.length > LIMITS.columns) fail('TOO_LARGE'); }
        if (rowsCount > LIMITS.rows || cellCount > LIMITS.cells) fail('TOO_LARGE');
        const label = pair(`表格 ${++tableNo}`, `Table ${tableNo}`);
        result.tables.push({ id: `docx-table-${tableNo}`, label, rows }); bodyText += rows.map(row => row.join('\t')).join('\n') + '\n';
      } else bodyText += wordText(node);
      limitCharacters(bodyText);
    }
    result.sections.push({ id: 'docx-body', label: pair('文档正文', 'Document body'), text: bodyText.trim() }); result.metadata.tables = tableNo;
    warning(result, 'DOCX_LAYOUT', '仅提取正文与表格文字；图片、图表、页眉页脚、批注和版式不参与解析。请核对原文件。', 'Only body and table text is extracted. Images, charts, headers, footers, comments, and layout are excluded. Check the original document.');
    if (descendants(body, 'ins').length || descendants(body, 'del').length) warning(result, 'TRACKED_CHANGES', '检测到修订：保留插入文字、忽略删除文字，请在原文中确认最终版本。', 'Tracked changes were found: inserted text is included and deleted text omitted. Confirm the final wording in the original.');
  }
  function resolvePart(base, target) {
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target) || target.includes('\\') || target.includes('?') || target.includes('#')) fail('INVALID_FILE');
    const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1);
    for (const p of target.split('/')) { if (!p || p === '.') continue; if (p === '..') { if (!parts.length) fail('INVALID_FILE'); parts.pop(); } else parts.push(p); }
    return parts.join('/');
  }
  function columnIndex(reference) { const m = /^([A-Z]+)\d+$/.exec(reference || ''); if (!m) fail('INVALID_FILE'); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; if (n > LIMITS.columns) fail('TOO_LARGE'); return n - 1; }
  async function parseXLSX(bytes, result, options) {
    const zip = await officeZIP(bytes, options); const workbook = parseXML(await zip.read('xl/workbook.xml'));
    const rels = descendants(parseXML(await zip.read('xl/_rels/workbook.xml.rels')), 'Relationship');
    const sharedRaw = await zip.read('xl/sharedStrings.xml', true); const shared = sharedRaw ? descendants(parseXML(sharedRaw), 'si').map(si => descendants(si, 't').map(nodeText).join('')) : [];
    let totalRows = 0, totalCells = 0, totalCharacters = 0, formulas = 0, missingValues = 0;
    for (const sheet of descendants(workbook, 'sheet')) {
      checkAbort(options);
      const name = attr(sheet, 'name') || 'Sheet', id = attr(sheet, 'id'); const rel = rels.find(r => attr(r, 'Id') === id);
      if (!rel || attr(rel, 'TargetMode') === 'External') { warning(result, 'EXTERNAL_SHEET_SKIPPED', '有外部或缺失的工作表关系未解析；不会访问外部链接。', 'An external or missing worksheet relationship was skipped; external links are never followed.'); continue; }
      const sheetPath = resolvePart('xl/workbook.xml', attr(rel, 'Target'));
      const sheetXML = parseXML(await zip.read(sheetPath)); const rows = [], rowNumbers = []; let previousRow = 0;
      for (const row of descendants(sheetXML, 'row')) {
        if (++totalRows > LIMITS.rows) fail('TOO_LARGE'); const values = [], cells = children(row, 'c'), usedColumns = new Set();
        const rowReference = attr(row, 'r') ?? (attr(cells[0], 'r')?.match(/\d+$/)?.[0]) ?? String(previousRow + 1);
        const sourceRow = Number(rowReference);
        if (!/^[1-9]\d*$/.test(rowReference) || !Number.isInteger(sourceRow) || sourceRow <= previousRow || sourceRow > 1048576) fail('INVALID_FILE');
        previousRow = sourceRow;
        for (const cell of cells) {
          if (++totalCells > LIMITS.cells) fail('TOO_LARGE'); const index = columnIndex(attr(cell, 'r')); const type = attr(cell, 't');
          if (Number(attr(cell, 'r').match(/\d+$/)[0]) !== sourceRow || usedColumns.has(index)) fail('INVALID_FILE'); usedColumns.add(index);
          const v = children(cell, 'v')[0], formula = children(cell, 'f')[0]; let value = v ? nodeText(v) : '';
          if (formula) { formulas++; if (!v) missingValues++; }
          if (type === 's') { const i = Number(value); if (!/^\d+$/.test(value) || !Number.isInteger(i) || i >= shared.length) fail('INVALID_FILE'); value = shared[i]; }
          else if (type === 'inlineStr') value = descendants(cell, 't').map(nodeText).join('');
          else if (type === 'b') value = value === '1' ? 'TRUE' : value === '0' ? 'FALSE' : value;
          while (values.length <= index) values.push(''); values[index] = value; totalCharacters += value.length;
          if (totalCharacters > LIMITS.textCharacters) fail('TOO_LARGE');
        }
        if (values.some(v => v !== '')) { rows.push(values); rowNumbers.push(sourceRow); }
      }
      const index = result.tables.length + 1, label = pair(name); result.tables.push({ id: `xlsx-sheet-${index}`, label, rows, rowNumbers, hidden: attr(sheet, 'state') === 'hidden' || attr(sheet, 'state') === 'veryHidden' });
      result.sections.push({ id: `xlsx-sheet-${index}`, label, text: rows.map(row => row.join('\t')).join('\n') });
    }
    result.metadata.sheets = result.tables.length; result.metadata.formulaCells = formulas;
    warning(result, 'XLSX_VALUES', '读取存储的单元格值，不执行公式或外部链接；格式化日期、单位样式、合并单元格、图表和隐藏行列可能与原表显示不同。隐藏工作表会标记但仍读取。', 'Stored cell values are read without evaluating formulas or external links. Formatted dates, unit styles, merged cells, charts, and hidden rows/columns may differ from the source display. Hidden sheets are marked and included.');
    if (formulas) warning(result, 'CACHED_FORMULAS', `检测到 ${formulas} 个公式单元格，仅读取已有缓存值；其中 ${missingValues} 个缺少缓存值，保留为空。`, `${formulas} formula cells were found. Only stored cached values are read; ${missingValues} cells without cached values remain blank.`);
  }
  let pdfLibraryPromise;
  function blobModule(base64) { const binary = atob(base64); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); return URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' })); }
  async function pdfLibrary(options) {
    if (options.pdfjsLib) return options.pdfjsLib;
    if (!pdfLibraryPromise) pdfLibraryPromise = (async () => {
      const embedded = root.CNECCS_PDFJS; let moduleURL, workerURL;
      if (embedded?.module && embedded?.worker) { moduleURL = blobModule(embedded.module); workerURL = blobModule(embedded.worker); }
      else {
        if (!root.document?.baseURI) fail('PDF_UNAVAILABLE');
        moduleURL = new URL('vendor/pdfjs/pdf.min.mjs', root.document.baseURI).href; workerURL = new URL('vendor/pdfjs/pdf.worker.min.mjs', root.document.baseURI).href;
        if (root.location?.protocol === 'file:') fail('PDF_UNAVAILABLE');
        if (new URL(moduleURL).origin !== root.location.origin) fail('PDF_UNAVAILABLE');
      }
      try { const lib = await import(moduleURL); lib.GlobalWorkerOptions.workerSrc = workerURL; return lib; }
      catch { if (workerURL.startsWith('blob:')) URL.revokeObjectURL(workerURL); fail('PDF_UNAVAILABLE'); }
      finally { if (moduleURL.startsWith('blob:')) URL.revokeObjectURL(moduleURL); }
    })().catch(error => { pdfLibraryPromise = null; throw error; });
    return pdfLibraryPromise;
  }
  async function parsePDF(bytes, result, options) {
    if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')) fail('INVALID_FILE');
    const pdfjs = await pdfLibrary(options); checkAbort(options); let loadingTask, document, blockedResources = 0, passwordRequired = false, destroyPromise;
    const destroy = () => { if (!destroyPromise && loadingTask) destroyPromise = Promise.resolve().then(() => loadingTask.destroy()).catch(() => {}); return destroyPromise; };
    const abort = () => { destroy(); };
    class NoNetworkBinaryDataFactory { async fetch() { blockedResources++; throw new Error('CNECCS blocks external PDF resources.'); } }
    try {
      loadingTask = pdfjs.getDocument({ data: bytes, useWorkerFetch: false, useWasm: false, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, enableXfa: false, disableAutoFetch: true, disableStream: true, disableRange: true, isOffscreenCanvasSupported: false, isImageDecoderSupported: false, stopAtErrors: false, verbosity: 0, BinaryDataFactory: NoNetworkBinaryDataFactory });
      options.signal?.addEventListener('abort', abort, { once: true });
      loadingTask.onPassword = () => { passwordRequired = true; destroy(); };
      checkAbort(options); document = await loadingTask.promise; checkAbort(options);
      if (document.numPages > LIMITS.pdfPages) fail('TOO_LARGE'); result.metadata.pages = document.numPages;
      let characters = 0, emptyPages = 0;
      for (let pageNo = 1; pageNo <= document.numPages; pageNo++) {
        checkAbort(options); options.onProgress?.({ page: pageNo, total: document.numPages });
        const page = await document.getPage(pageNo); let text = '';
        try {
          const content = await page.getTextContent(); let previousY = null, previousEndX = null;
          for (const item of content.items) {
            checkAbort(options);
            if (typeof item.str !== 'string') continue;
            if (characters + text.length + item.str.length > LIMITS.textCharacters) fail('TOO_LARGE');
            const y = item.transform?.[5], x = item.transform?.[4];
            const newLine = text && previousY !== null && Number.isFinite(y) && Math.abs(y - previousY) > 3;
            if (newLine && !text.endsWith('\n')) text += '\n';
            else if (text && !/\s$/.test(text) && item.str && !/^\s/.test(item.str)) {
              const gap = Number.isFinite(x) && Number.isFinite(previousEndX) ? x - previousEndX : null;
              const minimumWordGap = Math.max(1, Math.abs(item.transform?.[0] || 0) * 0.15);
              if (gap === null || gap > minimumWordGap) text += ' ';
            }
            text += item.str; if (item.hasEOL) text += '\n';
            if (Number.isFinite(y)) previousY = y;
            previousEndX = Number.isFinite(x) && Number.isFinite(item.width) ? x + item.width : null;
          }
          text = text.trim(); characters += text.length; if (characters > LIMITS.textCharacters) fail('TOO_LARGE');
        } finally { page.cleanup?.(); }
        if (!text) emptyPages++;
        result.sections.push({ id: `pdf-page-${pageNo}`, label: pair(`第 ${pageNo} 页`, `Page ${pageNo}`), text, page: pageNo });
      }
      result.metadata.emptyPages = emptyPages;
      warning(result, 'PDF_READING_ORDER', 'PDF 仅提取已有文本层。多栏、表格、上下标及特殊字符可能错序或缺失；本功能不还原表格，也不执行 OCR。请确认原文件中的单位和数值。', 'Only the PDF text layer is extracted. Columns, tables, superscripts, and special characters may be misordered or missing. Tables are not reconstructed and OCR is not performed. Verify units and numbers against the original.');
      if (emptyPages) warning(result, 'PDF_EMPTY_PAGES', `${emptyPages} 页未提取到文本，可能是扫描页、空白页或缺少字符映射。`, `${emptyPages} pages yielded no text; they may be scans, blank pages, or lack usable character mappings.`);
      if (blockedResources) warning(result, 'PDF_RESOURCE_BLOCKED', 'PDF 请求了未内嵌的字体或字符映射；为保持本地处理，已阻止加载，提取可能不完整。', 'The PDF requested nonembedded fonts or character maps. These loads were blocked to keep processing local; extraction may be incomplete.');
    } catch (error) {
      checkAbort(options);
      if (error instanceof DocumentError) throw error;
      if (passwordRequired || error?.name === 'PasswordException') fail('ENCRYPTED');
      fail('PDF_INVALID');
    } finally { options.signal?.removeEventListener('abort', abort); await destroy(); }
  }
  async function parseFile(file, options = {}) {
    checkAbort(options);
    if (!file || typeof file.arrayBuffer !== 'function' || typeof file.name !== 'string') fail('INVALID_FILE');
    const name = file.name.split(/[\\/]/).at(-1), format = name.split('.').at(-1).toLowerCase();
    if (['xlsm', 'xltm', 'xlsb', 'docm', 'dotm'].includes(format)) fail('MACRO_REJECTED');
    if (!['txt', 'csv', 'xlsx', 'docx', 'pdf'].includes(format)) fail('UNSUPPORTED_FORMAT');
    if (file.size > LIMITS.fileBytes) fail('TOO_LARGE');
    const bytes = new Uint8Array(await file.arrayBuffer()); if (bytes.length > LIMITS.fileBytes) fail('TOO_LARGE'); checkAbort(options);
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf && ['docx', 'xlsx'].includes(format)) fail('ENCRYPTED');
    const result = resultFor(name, format); result.metadata.fileBytes = bytes.length;
    if (format === 'txt' || format === 'csv') {
      const decoded = decodeText(bytes); result.metadata.encoding = decoded.encoding;
      if (format === 'csv') { const parsed = parseCSV(decoded.text); result.tables.push({ id: 'csv-table-1', label: pair(name), rows: parsed.rows }); result.metadata.delimiter = parsed.delimiter; }
      result.sections.push({ id: `${format}-text`, label: pair(name), text: decoded.text });
    } else if (format === 'docx') await parseDOCX(bytes, result, options);
    else if (format === 'xlsx') await parseXLSX(bytes, result, options);
    else await parsePDF(bytes, result, options);
    checkAbort(options); return finish(result);
  }
  const api = { parseFile, LIMITS, ACCEPT, DocumentError, errorMessage: error => error?.userMessage || pair(...messages.INVALID_FILE) };
  root.CNECCSDocuments = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
