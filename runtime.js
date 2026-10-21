(function(){
if(window.CNECCS_RUNTIME_STARTED)return;
window.CNECCS_RUNTIME_STARTED=true;
try{
/* CNECCS local bilingual retrieval. No network, telemetry, or automated classification. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CNECCSSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ENGINE_VERSION = '1.0.0', INDEX_SCHEMA_VERSION = 1, COMPACT_INDEX_SCHEMA_VERSION = 2;

  // These are retrieval aliases, never legal equivalences or classification rules.
  var CONCEPTS = [
    ['wireless', ['wifi', 'wi fi', 'wi-fi', 'wlan', 'wireless', '无线', '无线网络', '无线通信']],
    ['wireless-module', ['wireless module', 'radio module', 'rf module', '无线模块', '射频模块', '无线模组']],
    ['encryption', ['encryption', 'encrypt', 'encrypted', 'cryptography', 'cryptographic', 'aes', '加密', '密码功能', '密码技术']],
    ['information-security', ['information security', '信息安全']],
    ['air-purifier', ['air purifier', 'air purifiers', 'air cleaner', '空气净化器', '空气净化机']],
    ['air-filter', ['air filter', 'hepa filter', '空气过滤器', '空气滤网', '高效空气过滤器']],
    ['humidifier', ['humidifier', '加湿器']],
    ['air-fryer', ['air fryer', '空气炸锅']],
    ['weighing', ['weighing scale', 'smart scale', 'electronic scale', '电子秤', '智能秤']],
    ['wearable', ['wearable', 'smart watch', 'smartwatch', '可穿戴', '穿戴设备', '智能手表']],
    ['bluetooth', ['bluetooth', '蓝牙']],
    ['numerical-control', ['cnc', 'computer numerical control', 'numerical control', 'numerically controlled', '数控', '数字控制']],
    ['machine-tool', ['machine tool', 'machine tools', '机床']],
    ['milling', ['milling machine', 'milling', '铣床', '铣削']],
    ['lathe', ['lathe', 'turning machine', '车床']],
    ['carbon-fiber', ['carbon fiber', 'carbon fibre', 'carbon fibers', 'carbon fibres', '碳纤维']],
    ['composite', ['composite', 'composites', '复合材料', '复合结构']],
    ['drone', ['drone', 'drones', 'uav', 'uavs', 'unmanned aerial vehicle', 'unmanned aerial vehicles', 'unmanned aircraft', '无人机', '无人驾驶航空器', '无人驾驶飞行器']],
    ['laser', ['laser', 'lasers', '激光', '镭射']],
    ['lidar', ['lidar', 'laser radar', '激光雷达']],
    ['sensor', ['sensor', 'sensors', 'transducer', '传感器', '感应器']],
    ['infrared', ['infrared', 'infra-red', '红外', '红外线']],
    ['thermal-imaging', ['thermal camera', 'thermal imaging', 'thermal imager', '热成像', '热像仪']],
    ['semiconductor', ['semiconductor', 'semiconductors', '半导体']],
    ['integrated-circuit', ['integrated circuit', 'integrated circuits', 'microchip', 'chip', 'chips', '芯片', '集成电路']],
    ['processor', ['processor', 'microprocessor', '处理器', '微处理器']],
    ['accelerometer', ['accelerometer', 'accelerometers', '加速度计', '加速度传感器']],
    ['gyroscope', ['gyroscope', 'gyroscopes', 'gyro', '陀螺仪']],
    ['navigation', ['navigation', '导航']],
    ['satellite', ['satellite', 'satellites', '卫星']],
    ['graphite', ['graphite', '石墨']],
    ['gallium', ['gallium', '镓']],
    ['germanium', ['germanium', '锗']],
    ['antimony', ['antimony', '锑']],
    ['rare-earth', ['rare earth', 'rare-earth', '稀土']],
    ['tungsten', ['tungsten', '钨']],
    ['lithium', ['lithium', '锂']],
    ['battery', ['battery', 'batteries', '电池']],
    ['chemical', ['chemical', 'chemicals', '化学品', '化学制品']],
    ['biological', ['biological', '生物']],
    ['toxin', ['toxin', 'toxins', '毒素']],
    ['centrifuge', ['centrifuge', 'centrifuges', '离心机']],
    ['vacuum-pump', ['vacuum pump', 'vacuum pumps', '真空泵']],
    ['valve', ['valve', 'valves', '阀门']],
    ['pressure', ['pressure', '压力']],
    ['frequency', ['frequency', '频率']],
    ['precision', ['accuracy', 'precision', '精度']],
    ['software', ['software', '软件']],
    ['technology', ['technology', '技术']],
    ['source-code', ['source code', '源代码']],
    ['mass-market', ['mass market', '大众市场', '大众消费']],
    ['de-minimis', ['de minimis', '最低比例']],
    ['ear99', ['ear99', 'ear 99']],
    ['license-exception', ['license exception', 'license exceptions', '许可例外']],
    ['end-use', ['end use', 'end-use', '最终用途']],
    ['end-user', ['end user', 'end-user', '最终用户']]
  ].map(function (entry) { return { id: entry[0], terms: unique(entry[1].map(normalize)) }; });

  var STOP = new Set(('a an the and or with without of for to from in on at by as is are be has have can may does do i we our my this that these those it its into please find search looking need want product products device devices basic specification specifications spec specs model export imports import exporting classify classification control controlled controls eccn code number cas hs hts country china chinese us usa american united states system tell whether check').split(' '));
  var ZH_STOP = ['请帮我查询', '请帮我查找', '帮我查询', '帮我查找', '帮我查', '查询一下', '我想查询', '我想查', '是否需要许可证', '需要许可证吗', '是否受管制', '是否受到管制', '出口到美国', '出口到中国', '请问', '查询', '查找', '搜索', '产品名称', '基本规格', '规格信息', '技术参数', '这个产品', '这种产品', '出口管制', '是否', '属于', '需要', '可以', '有没有', '以及', '并且', '还有', '带有', '具有', '带', '的', '和', '与', '或', '且', '到', '吗', '了'];

  function unique(a) { return Array.from(new Set(a.filter(Boolean))); }
  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFKC').toLowerCase()
      .replace(/[‐‑‒–—−]/g, '-').replace(/[“”‘’]/g, "'")
      .replace(/\s+/g, ' ').trim();
  }
  function compactCode(value) { return normalize(value).replace(/\s+/g, '').toUpperCase(); }
  // IMP/EXP are display aliases for the compilation's 进/出 catalog IDs.
  // Require both numeric segments and token boundaries; never infer them from CAS.
  function catalogCodePattern() { return /(^|[^a-z0-9_-])((?:exp|imp|出|进)\s*-\s*\d+\s*-\s*\d+)(?=$|[^a-z0-9_-])/gi; }
  function normalizeCatalogIdentifiers(value) {
    return normalize(value).replace(catalogCodePattern(), function (match, boundary, code) {
      return boundary + compactCode(code).replace(/^出-/, 'EXP-').replace(/^进-/, 'IMP-');
    });
  }
  function escapeRe(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function collectText(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(collectText).join(' ');
    if (value && typeof value === 'object') return Object.keys(value).map(function (k) { return collectText(value[k]); }).join(' ');
    return '';
  }
  function pair(value) { return typeof value === 'string' ? { zh: value, en: value } : (value || {}); }
  function hasTerm(text, term) {
    if (!term || !text) return false;
    if (/[\u3400-\u9fff]/.test(term)) return text.indexOf(term) !== -1;
    var at = text.indexOf(term);
    while (at !== -1) {
      var left = at ? text.charAt(at - 1) : '', right = text.charAt(at + term.length);
      if ((!left || !/[a-z0-9]/.test(left)) && (!right || !/[a-z0-9]/.test(right))) return true;
      at = text.indexOf(term, at + 1);
    }
    return false;
  }
  function extractCodes(value) {
    value = normalizeCatalogIdentifiers(value);
    var matches = [], re = /(^|[^a-z0-9])([0-9]\s*[a-e]\s*[0-9]\s*[0-9]\s*[0-9](?:\s*\.\s*(?:[a-z]|\d{1,3})(?![a-z0-9]))*)(?=$|[^a-z0-9])/gi, m;
    while ((m = re.exec(value)) !== null) matches.push(compactCode(m[2]).replace(/\.+$/, ''));
    re = catalogCodePattern();
    while ((m = re.exec(value)) !== null) matches.push(compactCode(m[2]));
    return unique(matches);
  }
  function extractCAS(value) { return unique(value.match(/\b\d{2,7}-\d{2}-\d\b/g) || []); }
  function validCAS(value) {
    var bits = value.split('-'), digits = (bits[0] + bits[1]).split('').reverse();
    return digits.reduce(function (sum, digit, i) { return sum + Number(digit) * (i + 1); }, 0) % 10 === Number(bits[2]);
  }
  function extractHS(value) {
    var result = [], re = /(?:\b(?:hs|hts|htsus)|海关编码|商品编码)\s*(?:code|编码|号)?\s*[:：#]?\s*([0-9][0-9.\s]{4,15}[0-9])/gi, m;
    while ((m = re.exec(value)) !== null) {
      var digits = m[1].replace(/\D/g, '');
      if (digits.length >= 6 && digits.length <= 10) result.push(digits);
    }
    if (/^\d{6,10}$/.test(value.trim())) result.push(value.trim());
    return unique(result);
  }
  function extractSpecs(value) {
    var result = [], re = /(?:(>=|<=|>|<|≥|≤|=|不小于|不大于|大于|小于|至少|至多|超过|以上|以下)\s*)?(-?\d+(?:[.,]\d+)?(?:\s*(?:-|~|～|至|to)\s*\d+(?:[.,]\d+)?)?)\s*(?:-\s*)?(ghz|mhz|khz|hz|gpa|mpa|kpa|pa|gw|mw|kw|w|μm|µm|um|nm|mm|cm|km|m|kg|mg|g|ms|ns|ps|s|mbps|gbps|kbps|bit\/s|bits?|tb|gb|mb|kb|mah|ah|wh|v|a|rpm|r\/min|axes|axis|channels?|°c|℃|°|%|毫米|微米|纳米|厘米|千米|千克|公斤|克|兆赫|吉赫|千赫|赫兹|千瓦|瓦|摄氏度|位|轴|通道)(?![a-z])/gi, m;
    while ((m = re.exec(value)) !== null) {
      result.push({ raw: m[0], operator: m[1] || null, value: m[2], unit: m[3], evaluated: false });
    }
    return result;
  }
  function distanceOneOrTwo(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = Array.from({ length: b.length + 1 }, function (_, i) { return i; }), prev2 = null;
    for (var i = 1; i <= a.length; i++) {
      var row = [i], min = i;
      for (var j = 1; j <= b.length; j++) {
        row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prev2[j - 2] + 1);
        min = Math.min(min, row[j]);
      }
      if (min > max) return max + 1;
      prev2 = prev; prev = row;
    }
    return prev[b.length];
  }

  function preferredForms(groups, query) {
    var concepts = groups.map(function (g) { return g.concept; });
    if (concepts.indexOf('software') !== -1 || concepts.indexOf('source-code') !== -1) return ['D'];
    if (concepts.indexOf('technology') !== -1) return ['E'];
    if (/\bmaterials?\b|材料/.test(query)) return ['C'];
    var equipment = ['numerical-control', 'machine-tool', 'milling', 'lathe'];
    if (concepts.some(function (c) { return equipment.indexOf(c) !== -1; })) return ['B'];
    var materials = ['carbon-fiber', 'composite', 'graphite', 'gallium', 'germanium', 'antimony', 'rare-earth', 'tungsten', 'lithium', 'chemical', 'biological', 'toxin'];
    if (concepts.some(function (c) { return materials.indexOf(c) !== -1; })) return ['C'];
    var products = ['wireless', 'wireless-module', 'encryption', 'air-purifier', 'air-filter', 'humidifier', 'air-fryer', 'weighing', 'wearable', 'bluetooth', 'drone', 'laser', 'lidar', 'sensor', 'infrared', 'thermal-imaging', 'integrated-circuit', 'processor', 'accelerometer', 'gyroscope', 'navigation', 'satellite', 'battery', 'vacuum-pump', 'valve'];
    return concepts.some(function (c) { return products.indexOf(c) !== -1; }) ? ['A'] : [];
  }

  function createSearchEngineBuilder(prebuiltVocabulary) {
    var indexes = { CN: [], US: [] }, vocab = new Map(prebuiltVocabulary || []), snippetCache = new WeakMap(), snippetTexts = new WeakMap();
    var vocabularyFinalized = !!prebuiltVocabulary;
    var compareCodes = new Intl.Collator(undefined, { numeric: true }).compare;
    var prepared = [];
    function addPrepared(record, fields, index, candidates, allText) {
      var item = {
        record: record, index: index, title: fields.title, titleParts: fields.titleParts,
        summary: fields.summary, keywords: fields.keywords, body: fields.body,
        codes: fields.codes, cas: fields.cas, hs: fields.hs
      };
      item.all = allText === undefined ? [item.title, item.summary, item.keywords, item.body].join('\n') : allText;
      item.references = new Set(fields.references);
      if (!indexes[record.regime]) indexes[record.regime] = [];
      indexes[record.regime].push(item);
      prepared[index] = item;
      if (candidates) snippetTexts.set(record, { zh: candidates[0], en: candidates[1] });
      return item;
    }
    function addRecord(record, index) {
      var title = pair(record.title), summary = pair(record.summary), blocks = record.blocks || [];
      var body = blocks.map(function (b) { return collectText(b.text) + ' ' + collectText(b.cells || b.rows || b.table); }).join('\n');
      body += '\n' + (record.subitems || []).map(function (s) { return [s.code || '', collectText(s.text), collectText(s.parentConditions)].join(' '); }).join('\n');
      var item = {
        record: record, index: index, title: normalize(collectText(title)), titleParts: [normalize(title.zh), normalize(title.en)], summary: normalize(collectText(summary)),
        keywords: normalize(collectText(record.keywords)), body: normalize(body),
        codes: unique([compactCode(record.code)].concat(extractCodes(String(record.code || '')), extractCodes(String(record.catalogId || '')))),
        cas: unique((record.cas || []).map(String).concat(extractCAS(body))),
        hs: unique((record.hs || []).map(function (x) { return String(x).replace(/\D/g, ''); }))
      };
      item.all = [item.title, item.summary, item.keywords, item.body].join('\n');
      item.references = new Set(extractCodes(item.all));
      addPrepared(record, item, index, null, item.all);
      // Vocabulary is drawn from record titles and keywords, keeping typo expansion conservative.
      unique((item.title + ' ' + item.keywords).match(/[a-z]{4,30}/g) || []).forEach(function (word) {
        if (!STOP.has(word)) vocab.set(word, (vocab.get(word) || 0) + 1);
      });
    }
    function finalizeVocabulary() {
      if (vocabularyFinalized) return;
      CONCEPTS.forEach(function (c) { c.terms.forEach(function (term) { if (/^[a-z]{4,30}$/.test(term)) vocab.set(term, (vocab.get(term) || 0) + 2); }); });
      vocabularyFinalized = true;
    }
    function finish() {
      finalizeVocabulary();
      return { search: search };
    }
    function serialize(regime, compact) {
      finalizeVocabulary();
      var records = [], items = [];
      indexes[regime].forEach(function (item) {
        records.push(makeRecordStub(item.record));
        if (compact) {
          var value = { keywords: item.keywords, codes: item.codes.slice(), cas: item.cas.slice(),
            hs: item.hs.slice(), references: Array.from(item.references),
            texts: (item.record.blocks || []).map(function (block) {
              var text = block.text === undefined ? null : JSON.parse(JSON.stringify(block.text));
              var cells = collectText(block.cells || block.rows || block.table);
              return cells ? [text, cells] : [text];
            }) };
          var tail = normalize((item.record.subitems || []).map(function (subitem) {
            return [subitem.code || '', collectText(subitem.text), collectText(subitem.parentConditions)].join(' ');
          }).join('\n'));
          if (tail) value.tail = tail;
          items.push(value);
        } else {
          items.push({ title: item.title, titleParts: item.titleParts.slice(), summary: item.summary,
            keywords: item.keywords, body: item.body, codes: item.codes.slice(), cas: item.cas.slice(),
            hs: item.hs.slice(), references: Array.from(item.references),
            snippets: [snippetCandidates(item.record, 'zh'), snippetCandidates(item.record, 'en')] });
        }
      });
      return { schemaVersion: compact ? COMPACT_INDEX_SCHEMA_VERSION : INDEX_SCHEMA_VERSION, engineVersion: ENGINE_VERSION, regime: regime,
        records: records, items: items, vocab: Array.from(vocab) };
    }

    function interpret(query) {
      var raw = String(query == null ? '' : query).trim(), q = normalize(raw), codes = extractCodes(q), cas = extractCAS(q), hs = extractHS(q), specInput = raw;
      specInput = specInput.replace(catalogCodePattern(), function (match, boundary) { return boundary + ' '; });
      codes.forEach(function (code) { specInput = specInput.replace(new RegExp(escapeRe(code).replace(/[0-9A-Z]/g, '$&\\s*'), 'gi'), ' '); });
      var specs = extractSpecs(specInput);
      var working = normalizeCatalogIdentifiers(q), groups = [], seen = new Set(), expansions = [], corrections = [];
      // Keep identifiers and specifications out of fuzzy lexical matching.
      codes.forEach(function (code) { working = working.replace(new RegExp(escapeRe(code).replace(/[0-9A-Z]/g, '$&\\s*'), 'gi'), ' '); });
      cas.forEach(function (x) { working = working.split(x).join(' '); });
      specs.forEach(function (x) { working = working.split(normalize(x.raw)).join(' '); });
      working = working.replace(/\b(?:hs|hts|htsus|cas|eccn)\b\s*(?:code|number)?\s*[:：#]?/g, ' ').replace(/\b\d{6,10}\b/g, ' ');
      function addGroup(input, terms, type, concept) {
        var key = concept || normalize(input);
        if (seen.has(key)) return;
        seen.add(key);
        var group = { input: input, terms: unique(terms), type: type, concept: concept || null };
        groups.push(group);
        if (type !== 'literal') expansions.push({ input: input, terms: group.terms.filter(function (t) { return t !== input; }), type: type, concept: group.concept });
      }
      var matchedAliases = [];
      CONCEPTS.forEach(function (concept) {
        var hits = concept.terms.filter(function (term) { return hasTerm(working, term); });
        if (hits.length) {
          var input = hits.sort(function (a, b) { return b.length - a.length; })[0];
          addGroup(input, concept.terms, 'synonym', concept.id);
          matchedAliases = matchedAliases.concat(hits);
        }
      });
      matchedAliases.sort(function (a, b) { return b.length - a.length; }).forEach(function (t) { working = working.split(t).join(' '); });
      ZH_STOP.forEach(function (t) { working = working.split(t).join(' '); });
      var english = unique(working.match(/[a-z][a-z'-]{1,39}/g) || []).filter(function (t) { return !STOP.has(t) && !/^(ghz|mhz|khz|hz|kw|mw|mm|cm|nm|um|kg|gpa|mpa|rpm|mbps|gbps)$/.test(t); });
      english.forEach(function (token) {
        if (vocab.has(token) || token.length < 4 || /\d/.test(token)) { addGroup(token, [token], 'literal'); return; }
        var max = token.length >= 9 ? 2 : 1, alternatives = [];
        vocab.forEach(function (frequency, word) {
          if (Math.abs(word.length - token.length) > max) return;
          var d = distanceOneOrTwo(token, word, max);
          if (d <= max) alternatives.push({ word: word, distance: d, frequency: frequency });
        });
        alternatives.sort(function (a, b) { return a.distance - b.distance || b.frequency - a.frequency || a.word.localeCompare(b.word); });
        if (alternatives.length && (alternatives.length === 1 || alternatives[0].distance < alternatives[1].distance || alternatives[0].frequency >= alternatives[1].frequency * 2)) {
          var chosen = alternatives[0].word, concept = CONCEPTS.find(function (c) { return c.terms.indexOf(chosen) !== -1; });
          corrections.push({ input: token, suggested: chosen });
          addGroup(token, unique([token, chosen].concat(concept ? concept.terms : [])), 'typo', concept ? concept.id : null);
        } else addGroup(token, [token], 'literal');
      });
      unique(working.match(/[\u3400-\u9fff]{2,}/g) || []).forEach(function (token) {
        // Exact Chinese fragments only. Broad character-level fuzzy matching would be misleading.
        addGroup(token, [token], 'literal');
      });
      var warnings = [];
      if (codes.length) warnings.push({ zh: '编号按原样检索，目录编号中的进／出与 IMP／EXP 仅作显示别名对应；中美条目分别处理。条文提及该编号不代表该条目就是该编号。', en: 'Identifiers are searched without fuzzy correction; IMP/EXP are display aliases for the Chinese import/export catalog prefixes. Jurisdictions remain separate. A code reference is not an exact-code entry.' });
      if (hs.length) warnings.push({ zh: 'HS 编码仅用于寻找目录线索，不等同于出口管制归类。', en: 'HS codes provide catalog clues and do not determine export-control classification.' });
      if (specs.length) warnings.push({ zh: '已保留输入的数值与单位，尚未与法规阈值进行比较；请继续核对候选条目的完整条件。', en: 'Entered values and units are retained but have not been compared with regulatory thresholds. Review the complete conditions for each candidate.' });
      if (cas.some(function (x) { return !validCAS(x); })) warnings.push({ zh: '输入的部分 CAS 号校验位不匹配；仍按原样检索，请核对。', en: 'At least one entered CAS number has an invalid check digit. It is searched unchanged; verify the number.' });
      if (corrections.length) warnings.push({ zh: '检索包含显示在下方的拼写建议；技术参数和管制编号未作模糊替换。', en: 'Search includes the spelling suggestions shown below. Technical values and control codes have not been fuzzy-corrected.' });
      var forms = preferredForms(groups, q);
      return { query: raw, normalized: q, tokens: groups.map(function (g) { return g.input; }), code: codes[0] || null, codes: codes, cas: cas, hs: hs, expanded: expansions, corrections: corrections, specs: specs, warnings: warnings, groups: groups, preferredProductGroups: forms, rankingNote: forms.length ? { zh: '按输入中的产品形态优先排序；设备、材料、软件和技术等其他相关结果仍保留。这只是检索排序，不是管制归类。', en: 'Ranking gives preference to the product form described; other relevant equipment, materials, software, and technology remain available. This is retrieval ranking, not classification.' } : null };
    }

    function search(query, options) {
      options = options || {};
      var interpretation = interpret(query), groups = interpretation.groups, isEmpty = !interpretation.query;
      var regime = String(options.regime || '').toUpperCase(), source = indexes[regime] || (regime && regime !== 'ALL' ? [] : prepared);
      var limit = Math.max(1, Math.min(500, Number.isFinite(Number(options.limit)) ? Math.floor(Number(options.limit)) : 20));
      var offset = Math.max(0, Number.isFinite(Number(options.offset)) ? Math.floor(Number(options.offset)) : 0);
      var scored = [], identifierQuery = interpretation.codes.length || interpretation.cas.length || interpretation.hs.length;
      source.forEach(function (item) {
        var r = item.record;
        if (['category', 'kind', 'direction'].some(function (k) { return options[k] !== undefined && options[k] !== null && options[k] !== '' && options[k] !== 'all' && String(r[k]) !== String(options[k]); })) return;
        if (isEmpty) { scored.push({ record: r, score: 0, matchType: 'browse', matchedTerms: [] }); return; }
        var score = 0, matched = [], matchType = 'text', codeExact = false, codeParent = false, codeReference = false, casHit = false, hsHit = false;
        interpretation.codes.forEach(function (code) {
          if (item.codes.indexOf(code) !== -1) { score += 10000; codeExact = true; matched.push(code); }
          else if (item.codes.some(function (own) { return code.indexOf(own + '.') === 0; }) && item.references.has(code)) { score += 4000; codeParent = true; matched.push(code); }
          else if (item.references.has(code)) { score += 900; codeReference = true; matched.push(code); }
        });
        interpretation.cas.forEach(function (cas) { if (item.cas.indexOf(cas) !== -1 || hasTerm(item.all, cas)) { score += 7000; casHit = true; matched.push(cas); } });
        interpretation.hs.forEach(function (hs) { if (item.hs.some(function (own) { return own === hs || (hs.length === 6 && own.indexOf(hs) === 0); })) { score += 2500; hsHit = true; matched.push(hs); } });
        if (identifierQuery && !(codeExact || codeParent || codeReference || casHit || hsHit)) return;
        var hitGroups = 0, typoHit = false, synonymHit = false;
        groups.forEach(function (group) {
          var best = 0, termHit = null;
          group.terms.forEach(function (term) {
            var inTitle = hasTerm(item.title, term);
            var w = inTitle ? 140 : hasTerm(item.keywords, term) ? 105 : hasTerm(item.summary, term) ? 70 : hasTerm(item.body, term) ? 30 : 0;
            if (inTitle) {
              // A term naming the entry near its beginning is stronger than an incidental
              // application mention in a long title (e.g. UAVs versus materials used in UAVs).
              var focus = 0;
              item.titleParts.forEach(function (part) {
                var at = part.indexOf(term);
                if (at !== -1 && hasTerm(part, term)) focus = Math.max(focus, (at < 12 ? 75 : at < 30 ? 30 : 0) + Math.min(35, 90 * term.length / Math.max(part.length, 1)));
              });
              w += focus;
            }
            if (w && term === group.input) w += 15;
            if (w > best) { best = w; termHit = term; }
          });
          if (best) {
            score += best; hitGroups++; matched.push(termHit);
            if (group.type === 'typo' && termHit !== group.input) typoHit = true;
            else if (termHit !== group.input) synonymHit = true;
          }
        });
        if (!identifierQuery && hitGroups === 0) return;
        if (groups.length && hitGroups) score += 80 * (hitGroups / groups.length) + 25 * Math.max(0, hitGroups - 1);
        if (!identifierQuery && interpretation.preferredProductGroups.length) {
          var groupMatch = compactCode(r.code).match(/^\d([A-E])\d{3}/), productGroup = r.productGroup || (groupMatch && groupMatch[1]);
          if (interpretation.preferredProductGroups.indexOf(productGroup) !== -1) score = score * 1.2 + 70;
          else if ((productGroup === 'D' || productGroup === 'E') && interpretation.preferredProductGroups.every(function (g) { return g !== 'D' && g !== 'E'; })) score *= 0.55;
          if (r.kind === 'term' || r.kind === 'rule') score *= 0.7;
        }
        if (codeExact) matchType = 'code-exact';
        else if (casHit) matchType = 'cas-exact';
        else if (codeParent) matchType = 'code-parent';
        else if (hsHit) matchType = 'hs-clue';
        else if (codeReference) matchType = 'code-reference';
        else if (typoHit) matchType = 'typo';
        else if (synonymHit) matchType = 'synonym';
        else if (matched.some(function (t) { return hasTerm(item.title, normalize(t)); })) matchType = 'title';
        var terms = unique(matched);
        scored.push({ record: r, score: Math.round(score), matchType: matchType, matchedTerms: terms, matchedConcepts: hitGroups, queryConcepts: groups.length });
      });
      scored.sort(function (a, b) { return b.score - a.score || compareCodes(String(a.record.code || ''), String(b.record.code || '')) || String(a.record.id).localeCompare(String(b.record.id)); });
      delete interpretation.groups;
      interpretation.scope = regime && regime !== 'ALL' ? regime : 'ALL';
      interpretation.mode = isEmpty ? 'browse' : identifierQuery ? 'identifier' : 'text';
      if (!isEmpty && !scored.length) interpretation.warnings.push({ zh: '当前资料与筛选条件下未找到匹配项；这不表示物项不受管制。可尝试部件、功能、英文名称或清除筛选。', en: 'No match was found in the current data and filters. This does not establish that the item is uncontrolled. Try a component, function, English name, or fewer filters.' });
      var page = scored.slice(offset, offset + limit).map(function (hit) { hit.snippet = makeSnippet(hit.record, hit.matchedTerms, snippetCache, snippetTexts); return hit; });
      return { results: page, total: scored.length, interpretation: interpretation, offset: offset, limit: limit };
    }
    return { addRecord: addRecord, addPrepared: addPrepared, finish: finish, serialize: serialize };
  }

  // Result cards and related-entry links need only these fields. The complete
  // unchanged reference record is fetched separately when its detail is opened.
  function makeRecordStub(record) {
    var stub = {};
    ['id', 'regime', 'code', 'kind', 'category', 'direction', 'title', 'summary', 'entryStatus', 'cas', 'hs', 'productGroup'].forEach(function (key) {
      if (record[key] !== undefined) stub[key] = JSON.parse(JSON.stringify(record[key]));
    });
    return stub;
  }

  function snippetCandidates(record, lang) {
    var summary = pair(record.summary)[lang], title = pair(record.title)[lang], candidates = [];
    if (summary) candidates.push(String(summary));
    (record.blocks || []).forEach(function (b) { var t = pair(b.text)[lang]; if (t) candidates.push(String(t)); });
    if (title) candidates.push(String(title));
    return candidates;
  }

  // Called by the build process with the complete corpus, not a filtered subset:
  // typo suggestions use the same vocabulary frequencies in both jurisdictions.
  function serializeSearchIndex(records, regime) {
    if (!Array.isArray(records)) throw new TypeError('Search index records must be an array');
    if (regime !== 'CN' && regime !== 'US') throw new TypeError('Search index regime must be CN or US');
    var builder = createSearchEngineBuilder();
    records.forEach(builder.addRecord);
    return builder.serialize(regime);
  }

  // Store source text once. Identifiers, vocabulary and matching rules stay
  // precomputed; body fields and exact snippet candidates are restored locally.
  function serializeCompactSearchIndex(records, regime) {
    if (!Array.isArray(records)) throw new TypeError('Search index records must be an array');
    if (regime !== 'CN' && regime !== 'US') throw new TypeError('Search index regime must be CN or US');
    var builder = createSearchEngineBuilder();
    records.forEach(builder.addRecord);
    return builder.serialize(regime, true);
  }

  function validateSearchIndex(payload) {
    function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
    function strings(value) {
      if (!Array.isArray(value)) return false;
      for (var i = 0; i < value.length; i++) if (typeof value[i] !== 'string') return false;
      return true;
    }
    function invalid(message) { throw new TypeError('Invalid search index: ' + message); }
    if (!object(payload)) invalid('expected an object');
    if (payload.schemaVersion !== INDEX_SCHEMA_VERSION && payload.schemaVersion !== COMPACT_INDEX_SCHEMA_VERSION) invalid('unsupported schema version');
    if (payload.engineVersion !== ENGINE_VERSION) invalid('incompatible search engine version');
    if (payload.regime !== 'CN' && payload.regime !== 'US') invalid('regime must be CN or US');
    if (!Array.isArray(payload.records) || !Array.isArray(payload.items) || payload.records.length !== payload.items.length) invalid('unaligned record arrays');
    var ids = new Set();
    for (var index = 0; index < payload.records.length; index++) {
      var record = payload.records[index];
      if (!object(record) || typeof record.id !== 'string' || !record.id || record.regime !== payload.regime || ids.has(record.id)) invalid('record identity');
      ids.add(record.id);
      ['code', 'kind', 'direction', 'productGroup'].forEach(function (key) {
        if (record[key] !== undefined && record[key] !== null && typeof record[key] !== 'string') invalid('record ' + key);
      });
      if (record.category !== undefined && record.category !== null && typeof record.category !== 'string' &&
        (typeof record.category !== 'number' || !Number.isFinite(record.category))) invalid('record category');
      ['title', 'summary', 'entryStatus'].forEach(function (key) {
        var value = record[key];
        if (value === undefined || value === null || typeof value === 'string') return;
        if (!object(value) || Object.keys(value).some(function (lang) { return typeof value[lang] !== 'string'; })) invalid('record ' + key);
      });
      ['cas', 'hs'].forEach(function (key) {
        if (record[key] !== undefined && !strings(record[key])) invalid('record ' + key);
      });
      var item = payload.items[index];
      if (!object(item) || typeof item.keywords !== 'string' ||
        ['codes', 'cas', 'hs', 'references'].some(function (key) { return !strings(item[key]); })) invalid('prepared fields');
      if (payload.schemaVersion === COMPACT_INDEX_SCHEMA_VERSION) {
        if (!Array.isArray(item.texts) || (item.tail !== undefined && typeof item.tail !== 'string')) invalid('compact text fields');
        for (var blockIndex = 0; blockIndex < item.texts.length; blockIndex++) {
          var block = item.texts[blockIndex];
          if (!Array.isArray(block) || block.length < 1 || block.length > 2 || !(0 in block) ||
            (block.length === 2 && typeof block[1] !== 'string')) invalid('compact text block');
          var text = block[0];
          if (text !== null && typeof text !== 'string' &&
            !(typeof text === 'number' && Number.isFinite(text)) &&
            !(object(text) && Object.keys(text).every(function (language) { return typeof text[language] === 'string'; }))) invalid('compact block text');
        }
      } else {
        if (['title', 'summary', 'body'].some(function (key) { return typeof item[key] !== 'string'; }) ||
          !strings(item.titleParts) || item.titleParts.length !== 2) invalid('prepared fields');
        var snippets = item.snippets;
        if (!Array.isArray(snippets) || snippets.length !== 2 || !strings(snippets[0]) || !strings(snippets[1])) invalid('snippet candidates');
      }
    }
    if (!Array.isArray(payload.vocab)) invalid('vocabulary');
    var words = new Set();
    for (var vocabularyIndex = 0; vocabularyIndex < payload.vocab.length; vocabularyIndex++) {
      var entry = payload.vocab[vocabularyIndex];
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !/^[a-z]{4,30}$/.test(entry[0]) ||
        !Number.isSafeInteger(entry[1]) || entry[1] < 1 || words.has(entry[0])) invalid('vocabulary entry');
      words.add(entry[0]);
    }
  }

  function expandCompactItem(record, item) {
    var title = pair(record.title), summary = pair(record.summary);
    var body = item.texts.map(function (block) { return collectText(block[0]) + ' ' + (block[1] || ''); }).join('\n');
    body += '\n' + (item.tail || '');
    var snippets = ['zh', 'en'].map(function (language) {
      var candidates = [];
      if (summary[language]) candidates.push(String(summary[language]));
      item.texts.forEach(function (block) { var text = pair(block[0])[language]; if (text) candidates.push(String(text)); });
      if (title[language]) candidates.push(String(title[language]));
      return candidates;
    });
    return { title: normalize(collectText(title)), titleParts: [normalize(title.zh), normalize(title.en)],
      summary: normalize(collectText(summary)), keywords: item.keywords, body: normalize(body),
      codes: item.codes, cas: item.cas, hs: item.hs, references: item.references, snippets: snippets };
  }

  function addIndexRecord(builder, payload, index) {
    var record = payload.records[index], item = payload.items[index];
    if (payload.schemaVersion === COMPACT_INDEX_SCHEMA_VERSION) item = expandCompactItem(record, item);
    builder.addPrepared(record, item, index, item.snippets);
  }

  // Schema 1 already contains normalized fields. Schema 2 restores these from
  // compact source text, preserving order, tables, subitems and exact snippets.
  function createSearchEngineFromIndex(payload) {
    validateSearchIndex(payload);
    var builder = createSearchEngineBuilder(payload.vocab);
    payload.records.forEach(function (_, index) { addIndexRecord(builder, payload, index); });
    return builder.finish();
  }

  async function createSearchEngineFromIndexAsync(payload, options) {
    options = options || {};
    var chunkSize = options.chunkSize === undefined ? 32 : options.chunkSize;
    var budget = options.timeBudgetMs === undefined ? 6 : options.timeBudgetMs;
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 256 ||
      typeof budget !== 'number' || !Number.isFinite(budget) || budget < 1 || budget > 50 ||
      (options.onProgress !== undefined && typeof options.onProgress !== 'function')) throw new TypeError('Invalid index hydration options');
    function checkAbort() {
      if (options.signal && options.signal.aborted) { var error = new Error('Index hydration was canceled'); error.name = 'AbortError'; throw error; }
    }
    function yieldTask() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    var now = typeof performance === 'object' && typeof performance.now === 'function'
      ? function () { return performance.now(); } : Date.now;
    checkAbort(); await yieldTask(); checkAbort();
    validateSearchIndex(payload);
    var builder = createSearchEngineBuilder(payload.vocab), index = 0, length = payload.records.length;
    while (index < length) {
      checkAbort(); var start = now(), count = 0;
      do {
        addIndexRecord(builder, payload, index); index++; count++;
      } while (index < length && count < chunkSize && now() - start < budget);
      if (options.onProgress) options.onProgress({ completed: index, total: length });
      if (index < length) await yieldTask();
    }
    checkAbort(); return builder.finish();
  }

  function createSearchEngine(records) {
    records = Array.isArray(records) ? records : [];
    var builder = createSearchEngineBuilder();
    records.forEach(builder.addRecord);
    return builder.finish();
  }

  // Network-loaded corpora are prepared in bounded tasks so typing and rendering
  // can continue. The same builder and original record order serve both APIs.
  // A record cap also guarantees yielding when the device clock is coarse.
  async function createSearchEngineAsync(records) {
    records = Array.isArray(records) ? records : [];
    var builder = createSearchEngineBuilder(), index = 0, length = records.length;
    var now = typeof performance === 'object' && typeof performance.now === 'function'
      ? function () { return performance.now(); } : Date.now;
    function yieldTask() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }
    await yieldTask();
    while (index < length) {
      var start = now(), count = 0;
      do {
        if (index in records) builder.addRecord(records[index], index);
        index++; count++;
      } while (index < length && count < 128 && now() - start < 8);
      if (index < length) await yieldTask();
    }
    return builder.finish();
  }

  function makeSnippet(record, terms, cache, texts) {
    var result = {}, candidatesByLanguage = cache.get(record);
    // Full text is normalized only when a record first appears on a result page.
    // The source corpus remains untouched and returned snippets are fresh objects.
    if (!candidatesByLanguage) {
      candidatesByLanguage = {};
      ['zh', 'en'].forEach(function (lang) {
        var stored = texts && texts.get(record), candidates = stored ? stored[lang] : snippetCandidates(record, lang);
        candidatesByLanguage[lang] = candidates.map(function (text) {
          return { normalized: normalize(text), text: String(text).replace(/\s+/g, ' ').trim() };
        });
      });
      cache.set(record, candidatesByLanguage);
    }
    var normalizedTerms = terms.map(normalize);
    ['zh', 'en'].forEach(function (lang) {
      var best = '', bestScore = -1, bestAt = 0;
      candidatesByLanguage[lang].forEach(function (candidate) {
        var n = candidate.normalized, score = 0, at = -1;
        normalizedTerms.forEach(function (term) { var pos = n.indexOf(term); if (pos !== -1) { score++; if (at === -1 || pos < at) at = pos; } });
        if (score > bestScore) { best = candidate.text; bestScore = score; bestAt = Math.max(0, at); }
      });
      var start = Math.max(0, bestAt - 60), max = lang === 'zh' ? 180 : 280;
      if (start > best.length - max) start = Math.max(0, best.length - max);
      result[lang] = (start ? '…' : '') + best.slice(start, start + max) + (best.length > start + max ? '…' : '');
    });
    return result;
  }

  return { createSearchEngine: createSearchEngine, createSearchEngineAsync: createSearchEngineAsync,
    serializeSearchIndex: serializeSearchIndex, createSearchEngineFromIndex: createSearchEngineFromIndex,
    serializeCompactSearchIndex: serializeCompactSearchIndex, createSearchEngineFromIndexAsync: createSearchEngineFromIndexAsync,
    normalize: normalize, version: ENGINE_VERSION, searchIndexSchemaVersion: INDEX_SCHEMA_VERSION,
    compactSearchIndexSchemaVersion: COMPACT_INDEX_SCHEMA_VERSION };
});

;
/* CNECCS guided checks. Corpus-based preliminary checks, not an export authorization.
 * No dependency, no remote requests, no persistence. See docs/RULES.md.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CNECCSRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const L = (zh, en) => ({ zh, en });
  const unknown = { value: 'unknown', label: L('不确定 / 暂无资料', 'Not sure / Information unavailable') };
  const opts = rows => rows.map(r => ({ value: r[0], label: L(r[1], r[2]) })).concat([unknown]);
  const yesNo = () => opts([['yes', '是', 'Yes'], ['no', '否', 'No']]);
  const select = (id, zh, en, hintZh, hintEn, options, showWhen) => ({ id, label: L(zh, en), hint: L(hintZh, hintEn), type: 'select', options: options || yesNo(), ...(showWhen ? { showWhen } : {}) });
  const number = (id, zh, en, hintZh, hintEn, unit, showWhen, extra) => ({ id, label: L(zh, en), hint: L(hintZh, hintEn), type: 'number', unit, min: 0, ...(showWhen ? { showWhen } : {}), ...(extra || {}) });
  const text = (id, zh, en, hintZh, hintEn, showWhen) => ({ id, label: L(zh, en), hint: L(hintZh, hintEn), type: 'text', ...(showWhen ? { showWhen } : {}) });
  const when = (id, ...values) => ({ id, values });
  const sourceURLs = {
    CN: 'https://exportcontrol.mofcom.gov.cn/ckgzqdsjk.shtml',
    US: 'https://www.ecfr.gov/on/2026-10-15/title-15/part-774#Supplement-No.-1-to-Part-774'
  };
  const scopeNote = L('这里只核对所列条件。候选匹配、未达到某一阈值或没有匹配，都不等于最终归类或无需许可。请结合完整条目、例外和交易事实复核。', 'These checks cover only the criteria shown. A candidate match, a threshold not met, or no match is not a final classification or licensing decision. Review the complete entry, exclusions, and transaction facts.');
  const definitions = [
    {
      id: 'encryption', title: L('无线连接与加密', 'Wireless connectivity & encryption'),
      description: L('区分整机、模块和软件，梳理密码功能及后续核查路径。', 'Separate finished products, modules, and software, then identify cryptographic functions and the next review steps.'),
      keywords: ['加密', '密码', '无线', '蓝牙', 'wifi', 'wi-fi', 'wi fi', 'bluetooth', 'encryption', 'encrypt', 'cryptography', 'vpn', '路由器', 'router', '智能家电', 'smart appliance', '5a002', '5a992', '5d002'],
      candidateCodes: { CN: ['5A002', '5A004', '5D002'], US: ['5A002', '5A992', '5D002', '5D992'] },
      questions: {
        CN: [
          select('object', '你实际出口的是什么？', 'What is the item being exported?', '整机、独立安全芯片和密码软件需要分别审视。', 'A finished product, standalone security chip, and cryptographic software require separate review.', opts([['finished', '家电或其他整机', 'Appliance or other finished product'], ['chip', '安全芯片 / 模块', 'Security chip / module'], ['device', '独立密码设备', 'Standalone cryptographic equipment'], ['software', '软件 / 技术资料', 'Software / technology']])),
          select('cnFunction', '密码功能属于哪一类？', 'What cryptographic function does it provide?', '中国 5A002 按安全芯片、密码机、VPN、密钥管理、专用密码及量子密码等分项。', 'Chinese entry 5A002 separately addresses security chips, cryptographic devices, VPNs, key management, dedicated equipment, and quantum cryptography.', opts([['incidental', '普通整机的附带通信加密', 'Incidental communication encryption in a finished product'], ['chip', '安全芯片的密码运算', 'Cryptographic operations in a security chip'], ['crypto', '以密码运算为主要功能', 'Cryptographic operations as the primary function'], ['vpn', '以 IPSec / SSL VPN 为主要功能', 'IPSec / SSL VPN as the primary function'], ['key', '服务端密钥管理', 'Server-side key management'], ['sector', '电力、税务、公安或金融专用密码', 'Cryptography dedicated to power, taxation, public security, or finance'], ['quantum', '量子密码', 'Quantum cryptography'], ['analysis', '破解、弱化或绕过密码', 'Cryptanalysis or cryptographic bypass']])),
          text('algorithm', '算法名称和密钥长度是什么？', 'What are the algorithms and key lengths?', '例如 AES-128、RSA-2048；未知时留空，不能仅凭“有 Wi-Fi”推断。', 'For example, AES-128 or RSA-2048. Leave blank if unknown; Wi-Fi alone does not establish the relevant capability.'),
          number('cnRate', '最大加解密 / 加密通信速率', 'Maximum encryption / encrypted communication rate', '按实际子项使用加解密速率或 VPN 加密通信速率；不是无线链路标称速率。不知道可留空。', 'Use the processing or encrypted VPN communication rate required by the applicable subentry, not the advertised wireless link rate. Leave blank if unknown.', 'Gbps', when('cnFunction', 'chip', 'crypto', 'vpn')),
          number('cnSignRate', '最大非对称算法签名速率', 'Maximum asymmetric signature rate', '安全芯片或密码机还可能涉及签名速率；与加解密速率是不同参数。不知道可留空。', 'Security chips and cryptographic devices may also require signature throughput. This is distinct from encryption throughput. Leave blank if unknown.', 'tps', when('cnFunction', 'chip', 'crypto')),
          number('cnObjects', '可管理对象数量', 'Number of managed objects', '服务端密钥管理产品需核实受支持的最大对象数量。', 'For server-side key management products, verify the maximum supported number of managed objects.', '', when('cnFunction', 'key')),
          select('cnSector', '是否专门用于电力、税务、公安或金融领域？', 'Is it dedicated to power, taxation, public security, or finance?', '这一事实可能改变安全芯片或专用密码设备的核查分支。', 'This fact may change the applicable security-chip or dedicated-equipment branch.', null, when('cnFunction', 'chip', 'sector'))
        ],
        US: [
          select('object', '你实际出口的是什么？', 'What is the item being exported?', '美国 5A 类设备和 5D 类软件分别核查；整机与嵌入模块不能直接共用结论。', 'Review U.S. 5A equipment and 5D software separately; do not automatically apply a module classification to its host product.', opts([['finished', '家电或其他整机', 'Appliance or other finished product'], ['module', '通信 / 加密模块', 'Communication / encryption module'], ['network', '网络或信息安全设备', 'Networking or information-security equipment'], ['software', '软件 / 技术资料', 'Software / technology']])),
          select('usPrimary', '产品的主要功能是什么？', 'What is the product’s primary function?', '5A002.a 区分信息安全、通信网络、计算及其他设备；附带加密也需审查相应注释。', '5A002.a distinguishes information security, communications/networking, computing, and other equipment. Incidental encryption requires review of the relevant notes.', opts([['security', '信息安全', 'Information security'], ['network', '通信 / 通用网络', 'Communication / general-purpose networking'], ['computing', '计算 / 存储', 'Computing / storage'], ['civil', '家电或特定民用联网应用', 'Appliance or a specific connected civil application']])),
          select('confidentiality', '是否使用加密保护数据机密性？', 'Does it use cryptography for data confidentiality?', '仅身份认证、数字签名或完整性功能与数据机密性加密的处理不同；需核对实际功能。', 'Authentication, digital signatures, and integrity-only functions are treated differently from data confidentiality; verify the actual functions.'),
          text('algorithm', '算法名称和密钥长度是什么？', 'What are the algorithms and key lengths?', '提供算法、密钥位数及是否可启用；仅“支持 AES”信息不足。不确定可留空。', 'Provide the algorithm, key size, and activation capability. “Supports AES” alone is insufficient. Leave blank if unknown.'),
          select('civilLimited', '加密是否仅支持该特定民用联网应用？', 'Is encryption limited to that specific connected civil application?', '5A002.a 注释 2.j 涉及设备用途、数据范围等条件；需要逐项核对。', 'Note 2.j to 5A002.a includes application and data-scope conditions that must be checked individually.', null, when('usPrimary', 'civil')),
          select('standardsFixed', '是否仅使用公开 / 商用标准，且用户不能轻易改变密码功能？', 'Does it use only published/commercial standards with cryptographic functions the user cannot easily change?', '这只是注释 2.j 的部分条件，不是完整排除结论。', 'This captures only part of Note 2.j, not a complete exclusion determination.', null, when('usPrimary', 'civil')),
          select('massMarket', '是否有可核实的大众市场审查 / 归类资料？', 'Is there verifiable mass-market review or classification documentation?', '5A992.c / 5D992.c 及相关程序不能仅凭零售或“消费级”标签认定。', 'Retail sale or a “consumer-grade” label alone does not establish 5A992.c / 5D992.c treatment or satisfaction of the applicable procedures.')
        ]
      }
    },
    {
      id: 'carbon-fiber', title: L('碳纤维与纤维材料', 'Carbon fiber & fibrous materials'),
      description: L('核对材料形态及比模量、比抗拉强度，区分“或”与“且”。', 'Check material form, specific modulus, and specific tensile strength, preserving OR versus AND criteria.'),
      keywords: ['碳纤维', '芳纶', '芳族聚酰胺', '玻璃纤维', '预浸', 'carbon fiber', 'carbon fibre', 'aramid', 'fiberglass', 'glass fiber', 'prepreg', '1c210', '1c010'],
      candidateCodes: { CN: ['1C210', '1A202', '9C110'], US: ['1C010', '1C210', '1C990', '9C110'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'machine-tools', title: L('数控机床与加工设备', 'CNC machine tools & machining'),
      description: L('先区分机床功能与测量标准，再核对精度、轴数及排除条件。', 'Identify machining functions and measurement standards before reviewing accuracy, axes, and exclusions.'),
      keywords: ['数控', '机床', '铣床', '车床', '磨床', '加工中心', 'cnc', 'machine tool', 'milling', 'lathe', 'grinding', 'machining', '2b001', '2b201'],
      candidateCodes: { CN: ['2B201', '2D203'], US: ['2B001', '2B201', '2B991'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'drones', title: L('无人机与相关部件', 'Drones & related components'),
      description: L('区分飞行器、发动机和载荷，并按所选制度核对飞行能力。', 'Separate aircraft, engines, and payloads, then review flight capability under the selected legal regime.'),
      keywords: ['无人机', '无人驾驶', '飞艇', 'drone', 'uav', 'unmanned', '9a012', '9a501', '9a120'],
      candidateCodes: { CN: ['9A012', '9A501'], US: ['9A012', '9A120', '9A610'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'lasers', title: L('激光器与光学设备', 'Lasers & optical equipment'),
      description: L('收集波长、工作模式和功率等关键参数，定位适用分支。', 'Collect wavelength, operating mode, and power specifications to locate the relevant branch.'),
      keywords: ['激光', 'laser', '6a205', '6a005', '6a995'],
      candidateCodes: { CN: ['6A205'], US: ['6A005', '6A205', '6A995'] },
      questions: { CN: [], US: [] }
    },
    {
      id: 'chemicals', title: L('化学品与 CAS 号码', 'Chemicals & CAS numbers'),
      description: L('核对物质身份、混合物含量和具体条目，不把 CAS 命中当作完整归类。', 'Check substance identity, mixture concentration, and the actual entry; a CAS match alone is not a complete classification.'),
      keywords: ['化学', '化工', '混合物', '氟化', '三乙醇胺', 'chemical', 'cas', 'mixture', 'fluoride', 'triethanolamine', '1c350', '1c450'],
      candidateCodes: { CN: ['1C350', '1C450'], US: ['1C350', '1C355', '1C395'] },
      questions: { CN: [], US: [] }
    }
  ];

  for (const regime of ['CN', 'US']) {
    const us = regime === 'US';
    definitions[1].questions[regime] = [
      select('fiberType', '材料的基本类型是什么？', 'What is the basic material type?', '1C210.a 的碳 / 芳纶使用“或”；1C210.b 的玻璃纤维使用“且”。', 'Carbon/aramid in 1C210.a uses OR; glass fiber in 1C210.b uses AND.', opts([['carbon', '碳纤维 / 纤丝材料', 'Carbon fibrous / filamentary material'], ['aramid', '芳族聚酰胺（芳纶）', 'Aramid fibrous / filamentary material'], ['glass', '玻璃纤维 / 纤丝材料', 'Glass fibrous / filamentary material'], ['prepreg', '预浸料', 'Prepreg'], ['finished', '成型复合结构 / 成品', 'Finished composite structure / article'], ['other', '其他材料', 'Other material']])),
      number('specificModulus', '比模量（不是通常的弹性模量）', 'Specific modulus (not ordinary elastic modulus)', '请填以米为单位的条目定义参数，例如 12700000。GPa 不能直接填入；不知道可留空。', 'Enter the entry-defined quantity in meters, for example 12700000. Do not enter a GPa value directly; leave blank if unknown.', 'm', when('fiberType', 'carbon', 'aramid', 'glass')),
      number('specificStrength', '比抗拉强度（不是通常的抗拉强度）', 'Specific tensile strength (not ordinary tensile strength)', '请填以米为单位的条目定义参数，例如 235000。MPa 不能直接填入；不知道可留空。', 'Enter the entry-defined quantity in meters, for example 235000. Do not enter an MPa value directly; leave blank if unknown.', 'm', when('fiberType', 'carbon', 'aramid', 'glass')),
      select('specificBasis', '参数是否按条目中“比模量 / 比抗拉强度”的定义提供？', 'Were the values provided under the entry’s specific-modulus / specific-strength definitions?', '应由供应商技术资料支持，不能把常规模量、强度或密度值直接代入。', 'Use supplier technical documentation. Do not substitute ordinary modulus, strength, or density values.', null, when('fiberType', 'carbon', 'aramid', 'glass')),
      number('esterModifier', '酯基纤维表面改性剂含量', 'Ester-based fiber surface modifier', '仅适用于芳纶：按重量计；0.25% 或更多涉及 1C210.a 的排除。', 'Aramid only: percent by weight. At least 0.25% triggers the exclusion specified in 1C210.a.', '%', when('fiberType', 'aramid'), { max: 100 }),
      text('prepregDetails', '基材、树脂类型及形态 / 带宽是什么？', 'What are the base fiber, resin, form, and tape width?', '1C210.c 涉及受 a / b 管制的碳或玻璃纤维、热固性树脂及连续线 / 纱 / 带；带宽也需核实。', '1C210.c involves carbon or glass fiber controlled by a/b, thermoset resin, and continuous yarn/roving/tow/tape forms. Verify tape width where relevant.', when('fiberType', 'prepreg')),
      ...(us ? [select('prior1C010', '是否已按 1C010.a / .b / .e 先行审查？', 'Has the material first been reviewed under 1C010.a / .b / .e?', '美国 1C210 明确排除先受这些 1C010 分项管制的材料；本问答不自动完成该先行审查。', 'U.S. 1C210 excludes material already controlled under these 1C010 subentries. This questionnaire does not perform that prior review.', opts([['not_controlled', '已有资料确认不属于这些分项', 'Documented as outside those subentries'], ['controlled', '已有资料确认属于这些分项', 'Documented as controlled by those subentries'], ['pending', '尚未完成先行审查', 'Prior review not completed']]))] : [])
    ];
    definitions[2].questions[regime] = [
      select('machineType', '有哪些加工功能？', 'What machining functions does it have?', '具有多种功能的机床，需要分别核对相应分项。', 'A multifunction machine must be checked against each applicable functional subentry.', opts([['milling', '仅铣削', 'Milling only'], ['turning', '仅车削', 'Turning only'], ['grinding', '仅磨削', 'Grinding only'], ['edm', '电火花加工', 'Electrical discharge machining'], ['multi', '多功能 / 其他加工', 'Multifunction / other machining']])),
      select('materialScope', '是否用于切削金属、陶瓷或复合材料？', 'Is it for removing or cutting metals, ceramics, or composites?', '这是 2B201 的上位范围条件。', 'This is part of the introductory scope of 2B201.'),
      number('contourAxes', '可同时协调成形控制的轴数', 'Axes coordinated simultaneously for contouring control', '按制造商规格核实；机床总轴数不等于同时成形控制轴数。', 'Verify manufacturer specifications. Total installed axes are not the same as simultaneous contouring axes.', '', null, { integer: true }),
      number('rotaryAxes', '成形旋转轴数量', 'Number of contouring rotary axes', '另行记录旋转轴，不能把线性轴与旋转轴混为一谈。', 'Record rotary axes separately; linear and rotary axes are not interchangeable.', '', null, { integer: true }),
      select('accuracyBasis', '定位精度采用什么测量依据？', 'What measurement basis is used for positioning accuracy?', us ? '美国 2B201 使用 ISO 230/2:2006；2B001 的单向定位重复性是不同参数。' : '中国 2B201 使用 ISO 230-2:1988 或等效国家标准；不要与重复定位精度混用。', us ? 'U.S. 2B201 uses ISO 230/2:2006. Unidirectional positioning repeatability in 2B001 is a different metric.' : 'Chinese 2B201 uses ISO 230-2:1988 or an equivalent national standard. Do not substitute repeatability.', opts([['iso1988', 'ISO 230-2:1988', 'ISO 230-2:1988'], ['iso2006', 'ISO 230/2:2006', 'ISO 230/2:2006'], ['equivalent', '声称为等效标准，尚待验证', 'Claimed equivalent standard; verification pending'], ['repeatability', '只有重复定位精度', 'Repeatability only'], ['other', '其他测量依据', 'Other measurement basis']])),
      number('accuracy', '全补偿后的最佳直线轴总定位精度', 'Best linear-axis overall positioning accuracy with all compensation', '填正数，单位 µm；只用于当前铣床精度分支的有限比对。未知可留空。', 'Enter a positive value in µm. Used only for the limited milling-accuracy branch. Leave blank if unknown.', 'µm', when('machineType', 'milling'), { positive: true }),
      select('exclusionsReviewed', '是否已排查条目中的专用机床及行程 / 精度排除？', 'Have the entry’s special-purpose and travel/accuracy exclusions been checked?', us ? '包括专用零件加工排除、铣床 X 轴条件；还需先审查 2B001。' : '包括专用零件加工排除，以及铣床 X 轴行程和总定位精度的组合条件。', us ? 'Includes dedicated-part exclusions and milling X-axis conditions. Review 2B001 first as well.' : 'Includes dedicated-part exclusions and the combined X-axis travel and overall-accuracy conditions.', opts([['none', '已核实，未发现适用排除', 'Reviewed; no applicable exclusion identified'], ['possible', '可能适用某项排除', 'An exclusion may apply'], ['pending', '尚未完成核查', 'Review not completed']]))
    ];
    definitions[3].questions[regime] = [
      select('droneObject', '查询的是哪一类物项？', 'What kind of item are you checking?', '整机与发动机、载荷、通信设备分别核查。', 'Review the complete aircraft separately from engines, payloads, and communication equipment.', opts([['aircraft', '无人机 / 无人飞艇整机', 'Complete UAV / unmanned airship'], ['engine', '发动机', 'Engine'], ['payload', '载荷 / 光电或惯性设备', 'Payload / optical or inertial equipment'], ['radio', '无线电通信设备', 'Radio communication equipment'], ['conversion', '有人飞行器改装设备', 'Manned-aircraft conversion equipment']])),
      select('beyondVision', '是否设计为可在操作人员自然视距外受控飞行？', 'Is it designed for controlled flight beyond the operator’s direct natural vision?', us ? '美国 9A012.a 的“自然视距”是无辅助人眼视力（可佩戴矫正镜片）；以条目定义核实。' : '按中国 9A012.a 及技术说明核实“自然视距”，不能只凭遥控距离。', us ? 'U.S. 9A012.a defines natural vision as unaided human sight, with or without corrective lenses. Apply the entry definition.' : 'Apply Chinese 9A012.a and its technical notes; advertised remote-control range alone is insufficient.', null, when('droneObject', 'aircraft')),
      number('endurance', '最大续航时间', 'Maximum endurance', '按 ISO 2533:1975 标准大气、海平面零风条件核实；填分钟。', 'Verify ISA conditions under ISO 2533:1975, at sea level in zero wind. Enter minutes.', 'min', when('droneObject', 'aircraft')),
      ...(!us ? [select('gustCapability', '能否在至少 46.3 km/h 阵风下起飞并稳定可控飞行？', 'Can it take off and maintain stable controlled flight in gusts of at least 46.3 km/h?', '这是中国 9A012.a.1 的组合条件，与 30 至不足 60 分钟续航分支相关。', 'This is a combined criterion in Chinese 9A012.a.1, relevant to the 30-to-under-60-minute endurance branch.', null, when('droneObject', 'aircraft'))] : [select('spraySystem', '是否装有或设计可安装容量超过 20 L 的气溶胶喷洒系统？', 'Does it incorporate, or is it designed for, an aerosol dispensing system exceeding 20 L?', '用于提示另行核查美国 9A120 的飞行能力、喷洒系统和模型飞机说明。', 'Prompts separate review of U.S. 9A120 flight capability, dispensing-system criteria, and the model-aircraft note.', null, when('droneObject', 'aircraft'))]),
      text('payloadDetails', '关键载荷 / 部件及型号是什么？', 'What are the key payloads / components and model numbers?', us ? '例如红外成像、雷达、激光或惯性测量装置；美国 9A012.a.3–a.5 引用其他 ECCN。' : '中国 9A012 对发动机、载荷和无线电设备另设参数；请提供规格及配套机型。', us ? 'For example, infrared imaging, radar, laser, or inertial equipment. U.S. 9A012.a.3–a.5 references other ECCNs.' : 'Chinese 9A012 separately specifies engines, payloads, and radios; provide specifications and the host aircraft.'),
      select('military', '是否为军用设计 / 改装，或存在军事用途线索？', 'Is it designed/modified for military use, or are there military-use indicators?', us ? '军用无人机还需审查 9A610 / USML 管辖及最终用途限制；本模块不完成该判断。' : '军品、最终用途及临时管制需要独立审查；不能仅凭“民用”产品名称排除。', us ? 'Military UAVs require separate 9A610 / USML jurisdiction and end-use review, which this module does not perform.' : 'Military-item, end-use, and temporary controls require separate review; a “civil” product name is not conclusive.')
    ];
    definitions[4].questions[regime] = [
      select('laserType', '激光介质 / 类型是什么？', 'What is the laser medium / type?', us ? '美国 6A005、6A205、6A995 的覆盖与优先关系需要先区分。' : '中国 6A205 按激光介质和输出方式区分；类别名称本身不构成归类。', us ? 'Distinguish the scope and priority of U.S. 6A005, 6A205, and 6A995.' : 'Chinese 6A205 distinguishes laser media and output characteristics; a type name alone does not classify the item.', opts([['copper', '铜蒸气', 'Copper vapor'], ['argon', '氩离子', 'Argon ion'], ['nd', '掺钕（非玻璃）', 'Neodymium-doped (other than glass)'], ['co2', '二氧化碳', 'Carbon dioxide'], ['semiconductor', '半导体', 'Semiconductor'], ['fiber', '光纤', 'Fiber'], ['other', '其他', 'Other']])),
      select('laserMode', '输出是连续波还是脉冲？', 'Is the output continuous-wave or pulsed?', '连续波与脉冲分支可能使用不同参数。', 'Continuous-wave and pulsed branches may use different parameters.', opts([['cw', '连续波', 'Continuous-wave'], ['pulsed', '脉冲', 'Pulsed'], ['both', '两者均可', 'Both']])),
      number('wavelength', '输出波长', 'Output wavelength', '以 nm 输入。例如 1.064 µm 应先准确换算为 1064 nm；不要将其他单位直接填入。', 'Enter nm. For example, accurately convert 1.064 µm to 1064 nm first; do not enter another unit directly.', 'nm', null, { positive: true }),
      number('averagePower', '平均输出功率 / 连续波输出功率', 'Average / continuous-wave output power', '与峰值功率不同；以光学输出规格为准。', 'This is different from peak power; use the optical output specification.', 'W'),
      number('pulseWidth', '脉冲宽度', 'Pulse duration', '以 ns 输入；不知道可留空。本模块暂不自动计算激光归类。', 'Enter ns; leave blank if unknown. This module does not automatically classify lasers.', 'ns', when('laserMode', 'pulsed', 'both'), { positive: true }),
      number('repetition', '脉冲重复率', 'Pulse repetition rate', '以 Hz 输入；1 kHz = 1000 Hz。', 'Enter Hz; 1 kHz = 1000 Hz.', 'Hz', when('laserMode', 'pulsed', 'both')),
      select('transverse', '输出横模是什么？', 'What is the transverse mode?', '部分掺钕及其他激光器的阈值区分单横模与多横模。', 'Some neodymium-doped and other laser thresholds distinguish single and multiple transverse modes.', opts([['single', '单横模', 'Single transverse mode'], ['multiple', '多横模', 'Multiple transverse modes'], ['na', '资料标明不适用', 'Documented as not applicable']]))
    ];
    definitions[5].questions[regime] = [
      text('cas', '物质 CAS 号码', 'Substance CAS number', '例如 7664-39-3。CAS 命中可能对应多个条目，仍需核对物质身份和范围。', 'For example, 7664-39-3. A CAS number can appear in multiple entries; verify identity and scope.'),
      select('chemicalForm', '是单一物质还是混合物？', 'Is it a single substance or a mixture?', '混合物应取得完整成分信息和质量百分比。', 'For mixtures, obtain complete composition and weight percentages.', opts([['single', '单一物质', 'Single substance'], ['mixture', '混合物 / 溶液', 'Mixture / solution'], ['article', '含化学品的制品', 'Article containing a chemical']])),
      number('weightPercent', '该物质在混合物中的质量百分比', 'Weight percentage of the substance in the mixture', us ? '美国 1C350 存在分组浓度及低浓度规则；需同时核对 1C355 / 1C395 等相关条目。' : '中国条目及监控化学品规则需要分别核对，不能套用美国的混合物阈值。', us ? 'U.S. 1C350 has group-specific concentration provisions; also review related entries such as 1C355 / 1C395.' : 'Review the applicable Chinese entry and monitored-chemical rules separately; do not import U.S. mixture thresholds.', '%', when('chemicalForm', 'mixture'), { max: 100 }),
      text('chemicalName', '规格书 / SDS 中的物质名称', 'Substance name in the specification / SDS', '同时提供盐、异构体、水合物或其他形态信息；CAS 校验通过也不证明物质身份。', 'Include salt, isomer, hydrate, or other form information. A valid CAS checksum does not establish substance identity.'),
      select('compositionVerified', '成分和含量是否已有供应商资料支持？', 'Are composition and concentration supported by supplier documentation?', '可使用 SDS、分析证书和规格书交叉核对；文件辅助可在本机提取内容，不会上传文件。', 'Cross-check SDSs, certificates of analysis, and specifications. File assistance can extract content locally without uploading the file.')
    ];
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function getScenario(id, regime) {
    if (!['CN', 'US'].includes(regime)) return null;
    const d = definitions.find(s => s.id === id);
    if (!d) return null;
    return clone({ ...d, regimes: ['CN', 'US'], regime, questions: d.questions[regime], source: { url: sourceURLs[regime], snapshot: regime === 'US' ? '2026-10-15' : null } });
  }
  const scenarios = definitions.map(d => getScenario(d.id, 'CN'));
  function detectScenario(query, regime) {
    if (!['CN', 'US'].includes(regime) || typeof query !== 'string') return null;
    const q = query.normalize('NFKC').toLowerCase();
    let best = null;
    let score = 0;
    for (const d of definitions) {
      let n = d.keywords.reduce((sum, k) => sum + (q.includes(k) ? Math.min(k.length, 12) : 0), 0);
      if (d.id === 'chemicals' && /\b\d{2,7}-\d{2}-\d\b/.test(q)) n += 20;
      if (n > score) { best = d; score = n; }
    }
    return best ? getScenario(best.id, regime) : null;
  }
  function visible(q, answers) {
    return !q.showWhen || q.showWhen.values.includes(answers[q.showWhen.id]);
  }
  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !value.trim()) return null;
    const s = value.trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function answerValid(q, value) {
    if (value == null || value === '' || value === 'unknown') return false;
    if (q.type === 'select') return q.options.some(o => o.value === value && value !== 'unknown');
    if (q.type === 'number') {
      const n = parseNumber(value);
      return n !== null && n >= (q.min || 0) && (!q.positive || n > 0) && (q.max == null || n <= q.max) && (!q.integer || Number.isInteger(n));
    }
    return typeof value === 'string' && value.trim().length > 0;
  }
  function validCAS(value) {
    if (typeof value !== 'string') return false;
    const m = value.trim().match(/^(\d{2,7})-(\d{2})-(\d)$/);
    if (!m) return false;
    const digits = (m[1] + m[2]).split('').reverse();
    return digits.reduce((sum, d, i) => sum + Number(d) * (i + 1), 0) % 10 === Number(m[3]);
  }
  /** Optional dimensional conversion only. Explicit input units are part of the API.
   * Source definitions: CN terms T02/T03 and US 1C210 Related Definitions.
   * Standard gravity is an explicit conversion assumption, not a legal finding.
   */
  function calculateSpecificFiber(input) {
    input = input && typeof input === 'object' ? input : {};
    const density = parseNumber(input.densityGcm3);
    const modulus = parseNumber(input.modulusGPa);
    const strength = parseNumber(input.strengthMPa);
    const validDensity = density !== null && density > 0;
    const validModulus = modulus !== null && modulus > 0;
    const validStrength = strength !== null && strength > 0;
    const warnings = [];
    const supplied = v => v != null && v !== '' && !(typeof v === 'string' && (!v.trim() || v === 'unknown'));
    if (!validDensity) warnings.push(L('请输入大于零的纤维材料质量密度，单位 g/cm³；密度未知时不计算，不将其当作零。', 'Enter a positive fiber-material mass density in g/cm³. Unknown density is not treated as zero and prevents calculation.'));
    if (supplied(input.modulusGPa) && !validModulus) warnings.push(L('杨氏模量必须是大于零的有限数值，单位 GPa；不识别或猜测输入中的其他单位。', 'Young’s modulus must be a finite positive number in GPa. Other units are not interpreted or guessed.'));
    if (supplied(input.strengthMPa) && !validStrength) warnings.push(L('极限抗拉强度必须是大于零的有限数值，单位 MPa；不识别或猜测输入中的其他单位。', 'Ultimate tensile strength must be a finite positive number in MPa. Other units are not interpreted or guessed.'));
    if (!validModulus && !validStrength) warnings.push(L('至少提供杨氏模量或极限抗拉强度中的一项；另一项可以留空，保持未知。', 'Provide at least Young’s modulus or ultimate tensile strength. The other value may remain blank and unknown.'));
    const convert = (value, valid, multiplier) => {
      if (!validDensity || !valid) return null;
      // GPa / (g·cm⁻³ × g₀) × 10⁶; MPa / (g·cm⁻³ × g₀) × 10³.
      const result = (value / density) * multiplier / 9.80665;
      if (!Number.isFinite(result) || result <= 0) {
        warnings.push(L('输入数值超出可靠计算范围；请核对数值及单位。', 'The inputs exceed the reliable calculation range. Verify the values and units.'));
        return null;
      }
      return result; // Never round across a threshold before transferring a value.
    };
    return {
      specificModulus: convert(modulus, validModulus, 1e6),
      specificStrength: convert(strength, validStrength, 1e3),
      explanation: L(
        '换算假设标准重力 g₀ = 9.80665 m/s²：比模量(m) = 杨氏模量(GPa) × 10⁶ ÷ [密度(g/cm³) × g₀]；比抗拉强度(m) = 极限抗拉强度(MPa) × 10³ ÷ [密度(g/cm³) × g₀]。请确认是同一纤维材料的参数，非成品复合材料密度；原定义要求 23±2°C、相对湿度 50±5%。计算不会自动确认测量依据，也不作归类结论。',
        'Assuming standard gravity g₀ = 9.80665 m/s²: specific modulus (m) = Young’s modulus (GPa) × 10⁶ ÷ [density (g/cm³) × g₀]; specific tensile strength (m) = ultimate tensile strength (MPa) × 10³ ÷ [density (g/cm³) × g₀]. Use properties of the same fiber material, not the density of a finished composite. The source definitions require 23±2°C and 50±5% relative humidity. Calculation does not confirm the measurement basis or determine classification.'
      ),
      warnings
    };
  }
  const check = (labelZh, labelEn, state, detailZh, detailEn) => ({ label: L(labelZh, labelEn), state, detail: L(detailZh, detailEn) });

  function evaluate(scenarioId, answers, regime) {
    answers = answers && typeof answers === 'object' ? answers : {};
    const s = getScenario(scenarioId, regime);
    if (!s) return { status: 'needs_review', title: L('请选择有效的制度与场景', 'Select a valid regime and scenario'), notes: [scopeNote], missing: [], suggestedCodes: [], checks: [] };
    const visibleQuestions = s.questions.filter(q => visible(q, answers));
    let missing = visibleQuestions.filter(q => !answerValid(q, answers[q.id])).map(q => q.id);
    const checks = [];
    const notes = [scopeNote];
    let codes = s.candidateCodes[regime].slice();
    const us = regime === 'US';
    let status = 'needs_review';

    if (scenarioId === 'carbon-fiber') {
      const type = answers.fiberType;
      const mod = parseNumber(answers.specificModulus);
      const strength = parseNumber(answers.specificStrength);
      const supported = ['carbon', 'aramid', 'glass'].includes(type);
      if (supported && answers.specificBasis === 'yes') {
        const glass = type === 'glass';
        const modLimit = glass ? 3180000 : 12700000;
        const strengthLimit = glass ? 76200 : 235000;
        const validMod = mod !== null && mod >= 0;
        const validStrength = strength !== null && strength >= 0;
        const modMet = validMod && mod >= modLimit;
        const strengthMet = validStrength && strength >= strengthLimit;
        const branch = glass ? '1C210.b' : '1C210.a';
        const pairMet = glass ? modMet && strengthMet : modMet || strengthMet;
        const pairNotMet = glass ? (validMod && !modMet) || (validStrength && !strengthMet) : validMod && validStrength && !modMet && !strengthMet;
        if (!glass && pairMet) missing = missing.filter(id => !['specificModulus', 'specificStrength'].includes(id));
        if (glass && pairNotMet) missing = missing.filter(id => !['specificModulus', 'specificStrength'].includes(id));
        checks.push(check(`${branch}：比模量 ≥ ${modLimit.toLocaleString('en-US')} m`, `${branch}: specific modulus ≥ ${modLimit.toLocaleString('en-US')} m`, validMod ? modMet ? 'met' : 'not_met' : 'unknown', '仅核对这一技术参数；仍需结合材料类型、术语和完整条目。', 'This checks one technical parameter only; material type, definitions, and the complete entry remain relevant.'));
        checks.push(check(`${branch}：比抗拉强度 ≥ ${strengthLimit.toLocaleString('en-US')} m`, `${branch}: specific tensile strength ≥ ${strengthLimit.toLocaleString('en-US')} m`, validStrength ? strengthMet ? 'met' : 'not_met' : 'unknown', glass ? '玻璃纤维需要同时满足两项参数。' : '碳 / 芳纶材料的这两项参数使用“或”。', glass ? 'Glass fiber requires both parameter criteria.' : 'These two parameter criteria use OR for carbon/aramid.'));
        checks.push(check(`${branch} 参数组合`, `${branch} parameter combination`, pairMet ? 'met' : pairNotMet ? 'not_met' : 'unknown', pairMet ? '已达到所列参数组合；尚不能据此完成归类。' : pairNotMet ? '未达到本参数组合；不能据此排除其他条目。' : '尚无足够有效参数完成组合核对。', pairMet ? 'The listed parameter combination is met; this does not complete classification.' : pairNotMet ? 'This parameter combination is not met; other entries are not ruled out.' : 'Insufficient valid data to evaluate this combination.'));
        if (pairMet) status = 'candidate_match';
        if (pairNotMet) status = 'limited_check_not_met';
        if (type === 'aramid') {
          const ester = parseNumber(answers.esterModifier);
          const esterKnown = ester !== null && ester >= 0 && ester <= 100;
          checks.push(check('芳纶表面改性剂排除', 'Aramid surface-modifier exclusion', !esterKnown ? 'unknown' : ester >= 0.25 ? 'review' : 'not_met', '酯基表面改性剂达到 0.25%（重量）涉及 1C210.a 排除；应核实成分及比例。', 'An ester-based surface modifier of at least 0.25% by weight invokes the 1C210.a exclusion; verify composition and percentage.'));
          if (esterKnown && ester >= 0.25) status = 'needs_review';
        }
      } else {
        checks.push(check('材料形态与参数定义', 'Material form and parameter definitions', 'review', '先确认是条目定义的纤维 / 纤丝材料，并取得以米为单位的比值参数。预浸料和成型结构需要独立核查。', 'First confirm the entry-defined fibrous/filamentary form and obtain specific-property values in meters. Prepregs and finished structures require separate review.'));
      }
      if (us) {
        checks.push(check('1C010 优先审查', 'Prior 1C010 review', answers.prior1C010 === 'not_controlled' ? 'met' : answers.prior1C010 === 'controlled' ? 'review' : 'unknown', '美国 1C210 仅涵盖未先被 1C010.a / .b / .e 管制的相应材料。', 'U.S. 1C210 applies to the relevant materials only when not already controlled by 1C010.a / .b / .e.'));
        if (answers.prior1C010 !== 'not_controlled') {
          if (answers.prior1C010 === 'pending' && !missing.includes('prior1C010')) missing.push('prior1C010');
          if (status === 'candidate_match') status = 'needs_review';
        }
      }
      notes.push(L('数据来源：所选制度的 1C210 全文及其相关条目。参数单位不作推断；如使用换算助手，仍须自行确认材料、测量条件和依据。', 'Source: the selected regime’s complete 1C210 entry and related entries. Parameter units are not inferred. If using the conversion helper, independently confirm the material, measurement conditions, and basis.'));
    }

    if (scenarioId === 'machine-tools') {
      const basis = us ? 'iso2006' : 'iso1988';
      const value = parseNumber(answers.accuracy);
      const valueKnown = value !== null && value > 0;
      if (answers.machineType === 'milling' && answers.accuracyBasis === basis && valueKnown) {
        const thresholdMet = us ? value <= 4.5 : value < 6;
        checks.push(check(us ? '2B201.b.1：总定位精度 ≤ 4.5 µm' : '2B201.b.1：总定位精度 < 6 µm', us ? '2B201.b.1: overall positioning accuracy ≤ 4.5 µm' : '2B201.b.1: overall positioning accuracy < 6 µm', thresholdMet ? 'met' : 'not_met', us ? '仅对 ISO 230/2:2006、全补偿定位精度核对这一分项；还需先审查 2B001。' : '仅对 ISO 230-2:1988、全补偿定位精度核对这一分项。', us ? 'Checks this subcriterion using ISO 230/2:2006 with all compensation. Prior 2B001 review remains necessary.' : 'Checks this subcriterion using ISO 230-2:1988 with all compensation.'));
        status = thresholdMet ? 'candidate_match' : 'limited_check_not_met';
      } else {
        checks.push(check('定位精度分支', 'Positioning-accuracy branch', 'review', '只有确认铣削功能、正确标准版本和有效精度值后，才进行这一有限数值比对。不同标准和重复定位精度不自动互换。', 'This limited numerical check requires milling-only functionality, the correct standard edition, and a valid accuracy value. Standards and repeatability metrics are not automatically interchanged.'));
      }
      const axes = parseNumber(answers.contourAxes);
      const rotary = parseNumber(answers.rotaryAxes);
      if (axes !== null && Number.isInteger(axes) && axes >= 5 || rotary !== null && Number.isInteger(rotary) && rotary >= 2) {
        checks.push(check('其他轴数分支', 'Other axis-count branches', 'review', '已报告至少 5 个同时成形轴或至少 2 个成形旋转轴，请另行核对相应机床功能分项；精度分支不满足仍可能存在其他候选。', 'At least 5 simultaneous contouring axes or 2 contouring rotary axes were reported. Review the applicable functional branches; failure of the accuracy branch does not rule these out.'));
        if (status === 'limited_check_not_met') status = 'needs_review';
      }
      checks.push(check('上位条件及排除', 'Introductory conditions and exclusions', answers.materialScope === 'yes' && axes !== null && Number.isInteger(axes) && axes >= 2 && answers.exclusionsReviewed === 'none' ? 'review' : 'unknown', '必须核实材料范围、同时成形能力、专用机床排除及 X 轴行程 / 精度组合排除。本模块不自动认定排除成立。', 'Verify material scope, simultaneous contouring, dedicated-machine exclusions, and combined X-axis travel/accuracy exclusions. This module does not automatically determine an exclusion.'));
      if (answers.exclusionsReviewed === 'possible' || answers.materialScope !== 'yes' || axes === null || axes < 2) {
        if (status === 'candidate_match') status = 'needs_review';
      }
      if (answers.exclusionsReviewed === 'pending' && !missing.includes('exclusionsReviewed')) missing.push('exclusionsReviewed');
      notes.push(L(us ? '来源：美国 2B001、2B201 的上位描述、b.1 及说明。中国 6 µm 的阈值不得移植至美国。' : '来源：中国 2B201 上位描述、b.1 及说明。等于 6 µm 不满足 b.1 的“小于”，但其他分项仍须核查。', us ? 'Sources: U.S. 2B001 and 2B201, including its introductory scope, b.1, and notes. Do not import the Chinese 6 µm threshold.' : 'Source: Chinese 2B201 introductory scope, b.1, and notes. Exactly 6 µm does not satisfy b.1’s strict less-than test; other branches still require review.'));
    }

    if (scenarioId === 'encryption') {
      if (us) {
        checks.push(check('5A002.a 的功能与算法范围', '5A002.a functional and algorithm scope', 'review', '需结合主要功能、数据机密性、算法与可启用性核对；有加密或 Wi-Fi 都不能直接决定归类。', 'Review primary function, data confidentiality, algorithm, and activation capability. Encryption or Wi-Fi alone cannot determine classification.'));
        if (answers.usPrimary === 'civil') checks.push(check('联网民用应用注释 2.j', 'Connected civil application Note 2.j', 'review', '已进入该注释的核查路径。还需完整确认设备范围、用途限制、公开 / 商用标准及用户更改能力，不能据本问答自动认定排除。', 'This selects the Note 2.j review path. Confirm its full equipment scope, application limits, standards, and user-modification criteria; no exclusion is automatically established.'));
        checks.push(check('大众市场 / 许可程序', 'Mass-market / licensing procedures', 'review', '如评估 5A992.c 或 5D992.c，还需核实密码说明及适用程序；本工具不作 ENC、NLR 或 EAR99 结论。', 'For 5A992.c or 5D992.c, verify the Cryptography Note and applicable procedures. This tool does not issue ENC, NLR, or EAR99 conclusions.'));
        if (answers.object === 'software') codes = ['5D002', '5D992'];
        notes.push(L('来源：美国 5A002.a、技术说明、注释 2.j，以及 5A992 / 5D002 / 5D992；同一终端和其模块可能需要分别分析。', 'Sources: U.S. 5A002.a, technical notes, Note 2.j, and 5A992 / 5D002 / 5D992. A host device and its module may require separate analysis.'));
      } else {
        const path = { chip: '5A002.a', crypto: '5A002.b', vpn: '5A002.c', key: '5A002.d', sector: '5A002.e', quantum: '5A002.f', analysis: '5A004' }[answers.cnFunction];
        checks.push(check(path ? `${path} 条件核查路径` : '中国密码物项核查路径', path ? `${path} criteria review path` : 'Chinese cryptographic-item review path', 'review', path ? '已按产品功能定位到候选分项。算法长度、用途和速率 / 管理对象等组合条件仍需阅读完整条目核实。' : '普通附带通信加密不直接等同于中国 5A002；先确认产品实质功能及专用用途。', path ? 'The reported function points to a candidate subentry. Verify the complete combination of algorithm, application, throughput, or managed-object criteria.' : 'Incidental communication encryption is not automatically Chinese 5A002; establish the actual function and dedicated applications.'));
        if (answers.cnFunction === 'analysis') codes = ['5A004'];
        else if (answers.object === 'software') codes = ['5D002'];
        else codes = ['5A002'];
        notes.push(L('来源：中国 5A002.a–f、5A004 与 5D002。中国条件与美国加密规则分别维护，不按 ECCN 同号移植。', 'Sources: Chinese 5A002.a–f, 5A004, and 5D002. Chinese criteria are maintained separately from U.S. encryption rules; identical codes do not establish equivalence.'));
      }
    }

    if (scenarioId === 'drones') {
      const duration = parseNumber(answers.endurance);
      if (answers.droneObject === 'aircraft') {
        if (!us && duration !== null && duration >= 0) {
          checks.push(check('中国 9A012.a 续航组合', 'Chinese 9A012.a endurance combination', 'review', duration >= 60 ? '已报告至少 60 分钟续航：请重点核对 a.2 及自然视距外可控飞行条件。仍需验证规定测量条件。' : duration >= 30 ? '已报告 30 至不足 60 分钟续航：还需核实 a.1 的阵风下起飞、稳定受控飞行条件。' : '已报告不足 30 分钟续航；仍需独立检查 9A501、载荷、部件及用途规则。', duration >= 60 ? 'Reported endurance is at least 60 minutes: focus on a.2 and controlled flight beyond natural vision. Verify the prescribed measurement conditions.' : duration >= 30 ? 'Reported endurance is 30 to under 60 minutes: also verify the a.1 gust takeoff and stable controlled-flight criteria.' : 'Reported endurance is under 30 minutes; separately review 9A501, payloads, components, and end-use rules.'));
        }
        if (us) checks.push(check('美国 9A012.a 的独立结构', 'Independent U.S. 9A012.a structure', 'review', '资料快照将续航分为不足 3 小时和至少 3 小时，并保留上位自然视距外受控飞行条件及载荷分项。不得套用中国 30 / 60 分钟和阵风条件。', 'The source snapshot separates endurance below 3 hours and at least 3 hours, with the introductory beyond-natural-vision condition and payload branches. Do not substitute China’s 30/60-minute and gust criteria.'));
      }
      if (us && answers.spraySystem === 'yes') notes.push(L('喷洒系统信息提示进一步核查 9A120；其完整组合条件及相关说明仍需审查。', 'The dispensing-system response calls for 9A120 review; its complete combined criteria and notes remain to be checked.'));
      if (answers.military === 'yes') notes.push(L('已记录军用相关线索，请另行开展军品管辖及最终用途核查。', 'Military-related indicators were reported; perform separate military-item jurisdiction and end-use reviews.'));
      notes.push(L(us ? '来源：美国 9A012、9A120 及相关管辖提示；使用 2026-10-15 快照。' : '来源：中国 9A012、9A501 全文。模型飞机说明、临时管制和最终用途限制仍需独立核实。', us ? 'Sources: U.S. 9A012, 9A120, and related jurisdiction notes, using the October 15, 2026 snapshot.' : 'Sources: Chinese 9A012 and 9A501. Separately verify model-aircraft notes, temporary controls, and end-use restrictions.'));
    }

    if (scenarioId === 'lasers') {
      checks.push(check('激光技术参数组合', 'Combined laser specifications', 'review', '已整理介质、波长、模式及功率等字段。还可能需要峰值功率、脉冲能量、可调谐性、Q 开关或转换效率；本版不自动作激光归类。', 'The form collects medium, wavelength, mode, and power. Peak power, pulse energy, tunability, Q-switching, or efficiency may also be needed. This version does not automatically classify lasers.'));
      notes.push(L(us ? '来源：美国 6A005、6A205、6A995；6A205 明确要求先排查 6A005，并保留核管理权限例外。' : '来源：中国 6A205 及其说明。各子项必须按完整参数组合核对，不能只凭功率判定。', us ? 'Sources: U.S. 6A005, 6A205, and 6A995. 6A205 requires prior 6A005 review and retains the nuclear licensing-jurisdiction exclusion.' : 'Source: Chinese 6A205 and its notes. Review each full parameter combination; power alone is insufficient.'));
    }

    if (scenarioId === 'chemicals') {
      const casOK = validCAS(answers.cas);
      checks.push(check('CAS 格式与校验位', 'CAS format and checksum', casOK ? 'met' : answers.cas ? 'not_met' : 'unknown', casOK ? '格式和校验位通过；这只验证标识格式，不证明物质身份或管制状态。请用该号码检索全部相关条目。' : '请核实 CAS 号码格式及最后一位校验位，不自动更改或猜测编号。', casOK ? 'Format and checksum are valid. This verifies the identifier format only, not substance identity or control status. Search all entries containing this number.' : 'Verify the CAS format and final check digit. The identifier is not automatically corrected or guessed.'));
      if (!casOK && !missing.includes('cas')) missing.push('cas');
      checks.push(check('物质身份及混合物规则', 'Substance identity and mixture rules', 'review', us ? '需按实际 CAS 命中重新定位；1C350 不是所有化学品的通用规则，低浓度也可能涉及其他条目。' : '需按实际 CAS 命中重新定位；1C350 与 1C450 的物质范围及适用管理规则不同。', us ? 'Locate entries by the actual CAS match. 1C350 is not a universal chemical rule; lower concentrations can involve other entries.' : 'Locate entries by the actual CAS match. Chinese 1C350 and 1C450 cover different substances and management regimes.'));
      notes.push(L('这里列出的编号只是本场景常见检索入口，不表示输入的化学品已经命中这些条目。', 'The listed codes are common research starting points for this scenario; they do not mean that the entered chemical matches those entries.'));
    }

    if (missing.length) status = 'needs_information';
    const titles = {
      needs_information: L('还需要补充关键资料', 'Key information is still needed'),
      candidate_match: L('已达到部分候选条件，继续复核', 'Some candidate criteria are met; continue review'),
      limited_check_not_met: L('所核对的有限条件未满足', 'The limited criteria checked are not met'),
      needs_review: L('已整理核查路径，请继续复核条款', 'Review path prepared; verify the provisions')
    };
    notes.push(L(us ? '美国资料使用 2026-10-15 快照；查询日期不代表所有条款的生效日期。' : '中国资料沿用已提供工作簿的来源版本；本问答不声明已覆盖之后全部公告。', us ? 'U.S. material uses the October 15, 2026 snapshot. The research date is not the effective date of every provision.' : 'Chinese material follows the source versions in the supplied workbook. This questionnaire does not claim to cover all subsequent announcements.'));
    return { status, title: titles[status], notes, missing: Array.from(new Set(missing)), suggestedCodes: codes, checks, source: s.source };
  }
  return { scenarios, detectScenario, getScenario, evaluate, calculateSpecificFiber };
});

;
/* CNECCS entity screening. Local-only retrieval; a match is not a legal determination. */
(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CNECCSEntities=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var SOURCE_DEFS=[
 ['US-DTC','US','ITAR Debarred (DTC) - State Department','国防贸易禁入名单','ITAR Debarred List'],
 ['US-UVL','US','Unverified List (UVL) - Bureau of Industry and Security','未经核实名单','Unverified List'],
 ['US-SDN','US','Specially Designated Nationals (SDN) - Treasury Department','特别指定国民及被封锁人员名单','Specially Designated Nationals and Blocked Persons List'],
 ['US-MEU','US','Military End User (MEU) List - Bureau of Industry and Security','军事最终用户名单','Military End User List'],
 ['US-NS-MBS','US','Non-SDN Menu-Based Sanctions List (NS-MBS List) - Treasury Department','非特别指定国民菜单式制裁名单','Non-SDN Menu-Based Sanctions List'],
 ['US-CAP','US','Capta List (CAP) - Treasury Department','代理账户或通汇账户制裁名单','CAPTA List'],
 ['US-CMIC','US','Non-SDN Chinese Military-Industrial Complex Companies List (CMIC) - Treasury Department','非特别指定国民中国军工复合体企业名单','Non-SDN Chinese Military-Industrial Complex Companies List'],
 ['US-PLC','US','Palestinian Legislative Council List (PLC) - Treasury Department','巴勒斯坦立法委员会名单','Palestinian Legislative Council List'],
 ['US-SSI','US','Sectoral Sanctions Identifications List (SSI) - Treasury Department','行业制裁识别名单','Sectoral Sanctions Identifications List'],
 ['US-ACN','US','Nonproliferation Sanctions (ACN) - State Department','防扩散制裁名单','Nonproliferation Sanctions'],
 ['US-DPL','US','Denied Persons List (DPL) - Bureau of Industry and Security','被拒绝人员名单','Denied Persons List'],
 ['US-EL','US','Entity List (EL) - Bureau of Industry and Security','实体清单','Entity List'],
 ['CN-MFA','CN','Ministry of Foreign Affairs','外交部反制措施','Ministry of Foreign Affairs Countermeasures'],
 ['CN-UEL','CN','Unreliable Entity List','不可靠实体清单','Unreliable Entity List'],
 ['CN-EC','CN','Export Control List','出口管制管控名单','Export Control List of Restricted Parties'],
 ['CN-WATCH','CN','Export Control Watch List','出口管制关注名单','Export Control Watch List'],
 ['CN-MOFCOM-CM','CN','Ministry of Commerce countermeasures','商务部反制措施','Ministry of Commerce Countermeasures'],
 ['CN-TAO','CN','Taiwan Affairs measures','涉台列示或措施','Taiwan-Related Listings or Measures'],
 ['CN-TAO-REPORTED','CN','Taiwan-related reported persons','涉台被举报或核查对象','Taiwan-Related Reported or Investigated Persons'],
 ['CN-BLOCKING','CN','Blocking measures','阻断措施涉及主体','Parties Identified in Blocking Measures'],
 ['CN-MPS','CN','Terrorist designations','公安部恐怖组织及人员认定','Ministry of Public Security Terrorist Designations'],
 ['CN-UN','CN','UN auxiliary list','联合国辅助核对（中国适用性另核）','UN Auxiliary Screening (Chinese Applicability Requires Review)'],
 ['CN-OTHER','CN','Other Chinese measures','其他中国反制或限制措施','Other Chinese Countermeasures or Restrictions']
];
var SOURCE_MAP={},SOURCE_RAW={};SOURCE_DEFS.forEach(function(x){var d={key:x[0],regime:x[1],raw:x[2],label:{zh:x[3],en:x[4]}};SOURCE_MAP[d.key]=d;SOURCE_RAW[d.raw]=d;});
SOURCE_MAP['CN-BLOCKING'].detail={zh:'阻断外国法律与措施不当域外适用的相关主体；并非中国制裁对象名单。',en:'Parties relevant to measures blocking improper extraterritorial application of foreign laws and measures; not a Chinese sanctions-target list.'};SOURCE_MAP['CN-TAO-REPORTED'].detail={zh:'举报或核查类别；须逐人查证正式决定及措施。',en:'Reports or investigations; formal decisions and measures require individual verification.'};SOURCE_MAP['CN-UN'].detail={zh:'需核对具体联合国决议、列名及中国实施要求。',en:'Verify the relevant UN resolution, listing, and Chinese implementation requirements.'};
var SOURCE_GUIDANCE={
'CN-WATCH':{detail:{zh:'关注名单主要触发专门许可与风险核查要求，不等于全面禁止交易。',en:'Watch-list inclusion triggers specific licensing and risk-review requirements; it is not a blanket transaction ban.'},steps:[['先确认是否向本条主体出口两用物项，并核对对应公告与最新状态。','Confirm whether the transaction exports dual-use items to this party, then review the relevant notice and current status.'],['按所适用公告申请单项许可，准备风险评估报告、非军事用途书面承诺等材料；不能据名单名称推定可使用通用许可或登记填报。','Follow the applicable notice’s individual-license process and provide the risk assessment, written non-military-use assurance and other required materials. Do not assume general licensing or registration is available.'],['核对最终用途、最终用户及审查期限的特别要求；没有最终许可不等于已获授权。','Verify end use, end user and any special review-timing rules. A pending application is not an authorization.']]},
'CN-EC':{detail:{zh:'管控名单涉及公告规定的两用物项出口及相关转移限制；不能扩展为所有商品或所有交易的禁令。',en:'These notices restrict specified dual-use exports and related transfers; they are not automatically bans on all goods or all transactions.'},steps:[['确认物项、最终用户及交易路径是否落入公告范围，特别核对中国原产两用物项的境外转移或提供。','Check item scope, end user and transaction route against the notice, including overseas transfers or provision of China-origin dual-use items.'],['对公告禁止的交易，应先审查是否适用公告所列特殊情形申请程序，不得仅凭普通商业安排继续。','For a transaction prohibited by the notice, review any specified exceptional-application procedure before proceeding.'],['核对暂停、停止或移出公告及其具体范围；其他独立措施仍须分别核查。','Check the scope of any suspension, cessation or delisting notice; review other independent measures separately.']]},
'US-SDN':{detail:{zh:'需依据本条制裁项目核对冻结、交易限制及授权，不能由名称近似直接判断适用。',en:'Review blocking, transaction restrictions, and authorizations under the entry’s specific programs; a similar name does not establish applicability.'},steps:[['核对本条项目标签及其对应的资产冻结、交易限制、一般许可或特定许可。','Review the program tags and applicable blocking provisions, transaction restrictions, general licenses, or specific licenses.'],['另外核查相关所有权规则及未列名关联方；名单检索本身不完成所有权分析。','Separately assess applicable ownership rules and unlisted affiliates; list screening does not complete that analysis.']]},
'US-EL':{detail:{zh:'本条具体许可要求、审查政策和脚注决定核查路径，不等于所有交易均禁止。',en:'The entry’s license requirements, review policy, and footnotes guide the review; inclusion is not a blanket ban on every transaction.'},steps:[['先确认物项是否受美国出口管理条例管辖，再核对本条许可要求、审查政策及适用脚注。','First determine whether the items are subject to the EAR, then review this entry’s license requirements, review policy, and applicable footnotes.'],['按具体交易核实许可例外是否可用及是否需取得许可；保留物项与主体核验材料。','Determine whether a license exception is available or a license is required for the specific transaction; retain item and identity evidence.']]},
'US-DPL':{detail:{zh:'拒绝令规定的参与行为、范围和期限需逐项核对；来源结束日期不能单独证明解除。',en:'Review the denial order’s covered conduct, scope, and duration; a source end date alone does not establish removal.'},steps:[['打开标准拒绝令及适用于该主体的个别命令，核对禁止参与的行为和交易范围。','Review the standard denial order and the party’s specific order to identify prohibited participation and transaction scope.'],['核对起止日期、后续修改、恢复资格或新命令，不能仅凭资料中的结束日期继续交易。','Review dates, amendments, restoration of privileges, and subsequent orders rather than relying only on the dataset’s end date.']]},
'US-UVL':{detail:{zh:'未经核实名单涉及验证、声明、尽调及许可例外方面的要求，不能直接等同禁运。',en:'The Unverified List involves verification, statements, due diligence, and license-exception requirements; it is not itself a blanket embargo.'},steps:[['核对未能验证的事实、最终用途和最终用户，并解决交易中的警示信号。','Review the unresolved verification issues, end use, and end user, and address transaction red flags.'],['按当前规定核查所需声明、尽调材料及许可例外使用限制。','Check required statements, due-diligence evidence, and restrictions on using license exceptions under the current rules.']]},
'US-SSI':{detail:{zh:'按适用指令核对行业性限制，不将名单收录直接等同全面资产冻结。',en:'Review the applicable directives and sectoral restrictions; inclusion is not automatically equivalent to full asset blocking.'},steps:[['识别本条适用的指令、交易种类、相关日期和融资或债务条件。','Identify the applicable directives, transaction types, dates, and financing or debt conditions.'],['另查是否同时列入其他名单或受其他独立措施约束。','Check for concurrent listings and other independently applicable measures.']]},
'US-CMIC':{detail:{zh:'重点核查适用的证券投资限制及授权，不将其扩大为所有商品交易禁令。',en:'Focus on applicable securities-investment restrictions and authorizations; do not extend them into a blanket ban on goods transactions.'},steps:[['核对证券、投资行为、适用主体、相关期限与许可授权。','Review the securities, investment activity, covered persons, relevant deadlines, and authorizations.'],['另查本条主体是否受其他名单或独立交易限制影响。','Separately check other listings or independent transaction restrictions affecting the party.']]},
'US-CAP':{detail:{zh:'需核对特定代理账户或通汇账户措施及其条件。',en:'Review the specific correspondent-account or payable-through-account measures and their conditions.'},steps:[['确定涉及的金融机构、账户安排及适用的禁止或严格条件。','Identify the financial institution, account arrangements, and applicable prohibitions or strict conditions.'],['核对本条指令、有效日期及其他同时适用的制裁。','Review the entry’s directives, effective dates, and concurrently applicable sanctions.']]},
'US-NS-MBS':{detail:{zh:'应逐项核对选择适用的措施，不能假设所有条目具有相同限制。',en:'Review the measures selected for the particular entry; do not assume all entries carry identical restrictions.'},steps:[['从本条依据中识别实际选择适用的措施及相关交易范围。','Identify the measures actually selected and their transaction scope from the entry’s authorities.'],['核对生效日期、许可授权和其他独立名单，不直接推定全面冻结。','Review effective dates, authorizations, and other independent listings without assuming full asset blocking.']]},
'US-DTC':{detail:{zh:'重点核查军品、技术资料和防务服务的直接或间接参与资格。',en:'Review eligibility to participate directly or indirectly in defense-article, technical-data, and defense-service activities.'},steps:[['核对禁入决定及其法源、范围，确认交易是否涉及军品、技术资料或防务服务。','Review the debarment decision, authority, and scope, and determine whether the activity involves defense articles, technical data, or defense services.'],['确认当前资格状态、相关授权及后续决定。','Verify current eligibility, relevant authorizations, and subsequent decisions.']]},
'US-ACN':{detail:{zh:'不同防扩散法源和决定可能产生不同措施，应查阅具体联邦公报决定。',en:'Different nonproliferation authorities and determinations can impose different measures; consult the specific Federal Register determination.'},steps:[['核对本条联邦公报决定、适用法源、措施对象及限制范围。','Review the entry’s Federal Register determination, authority, covered party, and scope of restrictions.'],['核查措施期限、后续变更及可能同时适用的其他名单。','Check the duration, subsequent changes, and other potentially concurrent listings.']]},
'US-MEU':{detail:{zh:'核对军事最终用户规则、物项范围及许可要求，名单不是全部军事最终用户的穷尽列举。',en:'Review military-end-user rules, item scope, and licensing requirements; the list does not identify every possible military end user.'},steps:[['结合本条来源与现行规则，核对物项范围、最终用户或最终用途以及许可要求。','Review the entry and current rules for item scope, end user or end use, and licensing requirements.'],['即使没有命中本名单，也应独立核查已知的军事最终用途或用户事实。','Independently assess known military-end-use or military-end-user facts even without a list match.']]},
'US-PLC':{detail:{zh:'历史类别应结合当前官方名单和适用授权核查，不能仅凭类别名称判断效力。',en:'Review this historical category against current official lists and applicable authorizations; its label alone does not establish current effect.'},steps:[['核对主体是否已在当前官方名单中按其他标签列示，以及相应的具体授权。','Check whether the party appears under other tags in current official lists and review the relevant authorizations.'],['核对本次交易、参与人员及金融机构处理要求。','Review the transaction, parties involved, and applicable financial-institution requirements.']]}
};
Object.keys(SOURCE_GUIDANCE).forEach(function(k){SOURCE_MAP[k].detail=SOURCE_GUIDANCE[k].detail;SOURCE_MAP[k].description=SOURCE_GUIDANCE[k].detail;});
var STATUS={blocking_notice:{zh:'阻断措施涉及主体',en:'Party identified in blocking measures'},changed_review_required:{zh:'后续状态变化需核对',en:'Subsequent status change requires review'},unknown:{zh:'未提供当前状态',en:'Current status not provided'},listed_snapshot:{zh:'资料快照中收录',en:'Included in the supplied snapshot'},active_reported:{zh:'来源报告仍有效',en:'Source reports active measures'},suspended_reported:{zh:'来源报告暂停',en:'Source reports suspension'},removed_reported:{zh:'来源报告移除或终止',en:'Source reports removal or termination'},ceased_reported:{zh:'来源报告相关措施停止',en:'Source reports specified measures ceased'},mixed_reported:{zh:'其他状态，需核查原文',en:'Other reported status—review the source'}};
var TYPES={organization:{zh:'企业／组织',en:'Organization'},person:{zh:'个人',en:'Individual'},vessel:{zh:'船舶',en:'Vessel'},aircraft:{zh:'航空器',en:'Aircraft'},unknown:{zh:'来源未分类',en:'Type not provided'}};
var FIELD_LABELS={
 _id:['资料记录编号','CSL record ID'],source:['来源名单','Source list'],entity_number:['来源主体编号','Source entity number'],type:['主体类型','Entity type'],programs:['项目标签','Program tags'],name:['名称','Name'],title:['职务或称谓','Title'],addresses:['地址','Addresses'],federal_register_notice:['联邦公报公告','Federal Register notice'],start_date:['来源起始日期','Source start date'],end_date:['来源结束日期','Source end date'],standard_order:['标准命令','Standard order'],license_requirement:['许可要求原文','License requirement'],license_policy:['许可政策原文','License policy'],call_sign:['呼号','Call sign'],vessel_type:['船舶类型','Vessel type'],gross_tonnage:['总吨位','Gross tonnage'],gross_registered_tonnage:['登记总吨位','Gross registered tonnage'],vessel_flag:['船旗','Vessel flag'],vessel_owner:['船舶所有人','Vessel owner'],remarks:['备注原文','Remarks'],source_list_url:['名单原始链接','Source list URL'],alt_names:['其他名称','Alternative names'],citizenships:['公民身份','Citizenships'],dates_of_birth:['出生日期','Dates of birth'],nationalities:['国籍','Nationalities'],places_of_birth:['出生地','Places of birth'],source_information_url:['原始信息链接','Source information URL'],ids:['身份证明及其他标识原文','Identifiers and other source information'],
 Type:['主体类型','Entity type'],QID:['维基数据编号','Wikidata ID'],Name:['名称','Name'],Alias:['别名','Aliases'],'Chinese name':['中文名称原文','Chinese name as supplied'],Country:['国家或地区','Country or territory'],Topics:['主题标签','Topic tags'],Summary:['来源摘要原文','Source summary'],'Chinese summary':['中文摘要原文','Chinese summary as supplied'],Body:['发布机关','Issuing authority'],List:['名单名称','List name'],Date:['列示日期','Designation date'],'End date':['来源结束日期','Source end date'],'Source URL':['原始链接','Source URL'],Address:['地址','Address'],'Notice ID':['公告编号','Notice ID'],'Notice title':['公告标题原文','Notice title'],'Designation quote':['列示依据原文','Designation quotation'],'Designation quote language':['列示引文语言','Designation quotation language'],'Current status (source)':['来源报告的当前状态','Current status reported by source'],'Current status date':['状态日期','Status date'],'Current status notice title':['状态公告标题原文','Status notice title'],'Current status source URL':['状态原始链接','Status source URL'],'Current status quote':['状态依据原文','Status quotation'],'Current status quote language':['状态引文语言','Status quotation language'],
 nameZhProvenance:['中文名称依据','Chinese-name provenance'],nameCoverageNote:['名称覆盖说明','Name coverage note'],nameEnglishProvenance:['英文名称依据','English-name provenance'],nameNormalization:['名称整理说明','Name normalization'],address:['地址','Address'],identifiers:['识别信息','Identifiers'],jurisdiction:['来源法域','Source jurisdiction'],defaultEnabled:['是否默认启用','Enabled by default'],chinaApplicability:['中国法适用状态','Chinese-law applicability'],referenceNumber:['联合国参考编号','UN reference number'],UN_reference:['联合国参考编号','UN reference number'],UN_DATAID:['联合国数据编号','UN data ID'],dataId:['联合国数据编号','UN data ID'],unRegime:['联合国机制','UN regime'],nameOriginalScript:['原文字体名称','Name in original script'],aliasDetails:['别名及质量原文','Aliases and source quality labels'],datesOfBirth:['出生日期原文','Dates of birth'],placesOfBirth:['出生地原文','Places of birth'],documents:['证件原文','Identity documents'],lastUpdated:['更新日期原文','Source update dates'],comments:['来源备注','Source comments'],iranChinaReviewRequired:['伊朗机制中国适用性需核','Iran-regime Chinese applicability review'],chinaPositionSourceUrl:['中国立场原始链接','Official Chinese position URL'],rawEvidence:['完整原始证据','Complete source evidence'],directoryUrl:['官方目录链接','Official directory URL'],notASanctionsTarget:['是否并非制裁对象','Not a sanctions target'],statusLabel:['状态说明','Status description'],verifiedAt:['本次核验日期','Review date'],verification:['核验范围','Review scope'],correctionOf:['关联原始记录','Related original entry'],internal_record_id:['系统内部记录编号','Internal record ID'],CSL_id:['资料记录编号','CSL record ID'],identifier:['识别号','Identifier'],id:['记录编号','Record ID'],sourceKey:['来源分类','Source category'],nameZh:['中文名称原文','Chinese name as supplied'],aliases:['其他名称','Alternative names'],status:['来源报告的状态','Reported status'],noticeDate:['公告日期','Notice date'],sourceUrl:['原始链接','Source URL'],noticeTitle:['公告标题','Notice title'],restrictions:['措施摘要','Summary of measures'],statusDate:['状态日期','Status date'],statusUrl:['状态原始链接','Status source URL'],evidenceQuote:['来源引文','Source quotation'],name_zh:['中文名称原文','Chinese name as supplied']
};
function label(v,lang){if(v==null)return '';if(typeof v==='string')return v;return String(v[lang==='en'?'en':'zh']||v[lang==='en'?'zh':'en']||'');}
function fieldLabel(key,lang){var d=FIELD_LABELS[key];return d?d[lang==='en'?1:0]:key;}
function statusLabel(key,lang){return label(STATUS[key]||STATUS.unknown,lang);}
function typeLabel(key,lang){return label(TYPES[key]||TYPES.unknown,lang);}
function str(v){return v==null?'':String(v);}
function normalize(v){return str(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/g,' ').trim();}
// Identifier comparison preserves punctuation and leading zeros. It never uses edit distance.
function normalizeIdentifier(v){return str(v).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();}
function splitValues(v){if(Array.isArray(v))return v.map(str).filter(Boolean);return str(v).split(/;\s*|\n+/).map(function(x){return x.trim();}).filter(Boolean);}
function uniq(a){return Array.from(new Set(a.filter(Boolean)));}
function tokens(v){return normalize(v).split(' ').filter(Boolean).slice(0,30);}
function sourceDefinition(key){return SOURCE_MAP[key]||{key:key,regime:key.indexOf('CN')===0?'CN':'US',label:{zh:'其他来源',en:'Other source'}};}
function sources(regime){return Object.keys(SOURCE_MAP).map(function(k){var d=SOURCE_MAP[k];d.description=d.detail||{zh:'',en:''};return d;}).filter(function(d){return !regime||d.regime===regime;});}
function typeKey(v){var s=normalize(v);return /^(individual|person|个人|自然人)$/.test(s)?'person':/^(entity|organization|organisation|company|corporation|企业|组织|法人)$/.test(s)?'organization':/^(vessel|船舶)$/.test(s)?'vessel':/^(aircraft|航空器)$/.test(s)?'aircraft':'unknown';}
function statusKey(v){if(v==='measures_ended')return 'ceased_reported';if(Object.prototype.hasOwnProperty.call(STATUS,str(v)))return str(v);var s=normalize(v);if(!s||/^(unknown|not provided|未知)$/.test(s))return 'unknown';if(Object.prototype.hasOwnProperty.call(STATUS,s))return s;if(/suspend|暂停|中止/.test(s))return 'suspended_reported';if(/停止|ceased|cessation/.test(s))return 'ceased_reported';if(/removed|removal|delisted|terminated|rescinded|revoked|解除|移除|移出|取消|终止|撤销/.test(s))return 'removed_reported';if(/^(active|in force|listed|effective|有效|生效|仍有效)$/.test(s))return 'active_reported';return 'mixed_reported';}
function cnSource(o){var list=str(o.List),s=list+' '+str(o.Body)+' '+str(o.Topics);if(/henchmen|accomplices/i.test(list))return 'CN-TAO-REPORTED';if(/taiwan/i.test(list+' '+str(o.Body)))return 'CN-TAO';if(/export.control.watch|关注名单/i.test(list))return 'CN-WATCH';if(/unreliable|\bUEL\b|不可靠/i.test(s))return 'CN-UEL';if(/export.control|出口管制|管控名单/i.test(s))return 'CN-EC';if(/foreign.affairs|外交部/i.test(s))return 'CN-MFA';if(/commerce|商务部/i.test(s))return 'CN-MOFCOM-CM';return 'CN-OTHER';}
function rawObject(columns,cells){var o={};columns.forEach(function(k,i){o[k]=str(cells[i]);});return o;}
function identifierItems(rawId,entityNumber,rawIds,qid){var a=[];function add(t,v){v=str(v).trim();if(v)a.push({type:t,value:v});}add('CSL_id',rawId);add('entity_number',entityNumber);add('QID',qid);splitValues(rawIds).forEach(function(item){var p=item.split(',');var t=(p.shift()||'').trim();if(p.length&&/number|\bid\b|\bno\b|passport|registration|tax|credit.code|social|swift|bic|isin|ticker|imo|license|licence|identity|identification|national.id|legal.entity|unique|编号|证件|代码/i.test(t)&&!/information|determination|risk|date|website|issuer.name/i.test(t))add(t,p[0].trim());});var seen={};return a.filter(function(x){var k=x.type+'\0'+x.value;if(seen[k])return false;seen[k]=true;return true;});}
function isoDate(s){s=str(s).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;var m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);if(m)return (m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return '';}
function dateWarnings(r,asOf){var a=[];if(r.auxiliary)a.push({key:'un_auxiliary_only',text:{zh:'联合国辅助来源须另核中国法适用，不属于中国自主制裁名单。',en:'This UN auxiliary source requires separate Chinese-law applicability review and is not an autonomous Chinese sanctions list.'}});if(r.iranChinaReviewRequired)a.push({key:'iran_china_review',text:{zh:'本条属于伊朗机制。需核查中国反对恢复制裁的官方立场及相关国内适用文件，不能据联合国标签推定中国法禁止。',en:'This entry belongs to the Iran regime. Review China’s official position opposing reimposition and relevant domestic instruments; the UN label does not establish a Chinese-law prohibition.'}});if(r.endDate)a.push({key:'source_end_date',text:{zh:'来源载有结束日期；不得仅据该日期认定措施已解除，应核对当前命令及后续公告。',en:'The source contains an end date. Verify the current order and subsequent notices; this date alone does not establish that a measure has ended.'}});if(isoDate(r.endDate)&&isoDate(r.endDate)<asOf)a.push({key:'past_source_end_date',text:{zh:'来源结束日期早于本次检索日期，请优先核查当前状态。',en:'The source end date precedes this search date. Prioritize verification of the current status.'}});if(r.status==='unknown'||r.status==='listed_snapshot')a.push({key:'status_not_verified',text:{zh:'收录记录不代表已独立核实其当前法律状态。',en:'Inclusion in this dataset does not independently verify the current legal status.'}});return a;}
function prepare(r,asOf){r.source=sourceDefinition(r.sourceKey);r.source.description=r.source.detail||{zh:'',en:''};r.aliases=uniq(r.aliases||[]);r.addresses=uniq(r.addresses||[]);r.identifiers=(r.identifiers||[]).map(function(x){return {type:x.type,value:str(x.value)};});r.identifiers.push({type:'internal_record_id',value:r.id});r.dateWarnings=dateWarnings(r,asOf);var qualities=new Map();(r.aliasDetails||[]).forEach(function(a){var norm=normalize(a.ALIAS_NAME);if(!qualities.has(norm))qualities.set(norm,a.QUALITY||'');});r._names=uniq([r.name,r.nameZh].concat(r.aliases)).map(function(v){var norm=normalize(v);return {value:v,norm:norm,words:norm.split(' ').filter(Boolean).slice(0,30),field:v===r.name?'name':v===r.nameZh?'nameZh':'aliases',quality:qualities.get(norm)||''};});r._addresses=r.addresses.map(function(v){var norm=normalize(v);return {value:v,norm:norm,words:norm.split(' ').filter(Boolean).slice(0,30),field:'addresses'};});r._ids=r.identifiers.map(function(x){return {value:x.value,norm:normalizeIdentifier(x.value),field:'identifier',type:x.type};});return r;}
function createIndex(input,options){input=input||{};options=options||{};var asOf=options.asOf||new Date().toISOString().slice(0,10),records=[],byId=new Map(),duplicates=[],appliedCorrections=[],unappliedCorrections=[];function add(r){if(byId.has(r.id)){duplicates.push(r.id);return;}prepare(r,asOf);records.push(r);byId.set(r.id,r);}var us=input.us||{};(us.rows||[]).forEach(function(row,i){var o=rawObject(us.columns||[],row),src=SOURCE_RAW[o.source],key=src?src.key:'US-OTHER';var rawId=o._id||'row-'+(i+1);add({id:key+':'+rawId,regime:'US',sourceKey:key,name:o.name||'',nameZh:'',aliases:splitValues(o.alt_names),addresses:splitValues(o.addresses),identifiers:identifierItems(o._id,o.entity_number,o.ids,''),type:typeKey(o.type),status:'listed_snapshot',statusRaw:'',startDate:o.start_date||'',endDate:o.end_date||'',statusDate:'',sourceUrl:o.source_information_url||o.source_list_url||'',sourceListUrl:o.source_list_url||'',statusUrl:'',noticeTitle:{zh:'',en:''},restrictions:{zh:'',en:''},programs:o.programs||'',remarks:o.remarks||'',raw:{columns:us.columns||[],cells:row},provenance:{kind:'uploaded-csl',row:i+2,dataAsOf:us.metadata&&us.metadata.dataAsOf||null}});});var cn=input.cnUpload||{};(cn.rows||[]).forEach(function(row,i){var o=rawObject(cn.columns||[],row),key=cnSource(o);add({id:key+':upload-row-'+(i+1),regime:'CN',sourceKey:key,name:o.Name||o['Chinese name']||'',nameZh:o['Chinese name']||'',aliases:splitValues(o.Alias),addresses:splitValues(o.Address),identifiers:identifierItems('','','',o.QID),type:typeKey(o.Type),status:statusKey(o['Current status (source)']),statusRaw:o['Current status (source)']||'',startDate:o.Date||'',endDate:o['End date']||'',statusDate:o['Current status date']||'',sourceUrl:o['Source URL']||'',sourceListUrl:'',statusUrl:o['Current status source URL']||'',noticeTitle:{zh:o['Notice title']||'',en:o['Notice title']||''},restrictions:{zh:o['Chinese summary']||'',en:o.Summary||''},evidenceQuote:o['Designation quote']||'',statusEvidenceQuote:o['Current status quote']||'',raw:{columns:cn.columns||[],cells:row},provenance:{kind:'uploaded-cn-compilation',row:i+2,dataAsOf:cn.metadata&&cn.metadata.dataAsOf||null,pdfSource:(cn.rowSources||[])[i]||null}});});var official=input.cnOfficial||{};(official.records||[]).forEach(function(o,i){if(o.correctionOf){var c=o.correctionOf,target=records.find(function(r){return r.regime==='CN'&&r.provenance.kind==='uploaded-cn-compilation'&&r.provenance.row===Number(c.uploadRow)+1&&(!c.matchName||normalize(r.name)===normalize(c.matchName))&&(!c.matchDate||r.startDate===c.matchDate);});if(!target){unappliedCorrections.push(o);return;}target.originalStatus={status:target.status,statusRaw:target.statusRaw,statusDate:target.statusDate,statusUrl:target.statusUrl,restrictions:target.restrictions};target.statusReview=o;target.status=statusKey(o.status);target.statusRaw=str(o.status);target.statusLabel=o.statusLabel||STATUS[target.status];target.statusDate=o.statusDate||target.statusDate;target.statusUrl=o.statusUrl||o.sourceUrl||target.statusUrl;target.restrictions=o.restrictions||target.restrictions;target.dateWarnings=dateWarnings(target,asOf);appliedCorrections.push({id:o.id,targetId:target.id,uploadRow:c.uploadRow});return;}var key=o.sourceKey||'CN-OTHER';if(!SOURCE_MAP[key])SOURCE_MAP[key]={key:key,regime:'CN',label:o.sourceLabel||{zh:'中国官方补充来源',en:'Additional Chinese official source'},detail:o.sourceDetail||{zh:'',en:''}};var columns=Object.keys(o),cells=columns.map(function(k){return typeof o[k]==='object'?JSON.stringify(o[k]):str(o[k]);});add({id:key+':official:'+str(o.id||i+1),regime:'CN',sourceKey:key,name:o.name||o.nameZh||'',nameZh:o.nameZh||'',aliases:splitValues(o.aliases),addresses:splitValues(o.addresses||o.address),identifiers:Array.isArray(o.identifiers)?o.identifiers:[],type:typeKey(o.type),status:statusKey(o.status),statusRaw:str(o.status),startDate:o.noticeDate||'',endDate:o.endDate||'',statusDate:o.statusDate||'',sourceUrl:o.sourceUrl||'',sourceListUrl:o.sourceListUrl||'',statusUrl:o.statusUrl||'',noticeTitle:o.noticeTitle||{zh:'',en:''},restrictions:o.restrictions||{zh:'',en:''},evidenceQuote:o.evidenceQuote||'',statusEvidenceQuote:o.statusEvidenceQuote||'',notASanctionsTarget:o.notASanctionsTarget===true,statusLabel:o.statusLabel||null,raw:{columns:columns,cells:cells},provenance:{kind:'official-addition',dataAsOf:official.metadata&&official.metadata.dataAsOf||null}});});var un=input.unAux||{};(un.records||[]).forEach(function(o,i){var cols=Object.keys(o),cells=cols.map(function(k){return typeof o[k]==='object'?JSON.stringify(o[k]):str(o[k]);}),ids=[];if(o.referenceNumber)ids.push({type:'UN_reference',value:o.referenceNumber});if(o.dataId)ids.push({type:'UN_DATAID',value:o.dataId});(o.documents||[]).forEach(function(d){if(d.NUMBER)ids.push({type:d.TYPE_OF_DOCUMENT||'document',value:d.NUMBER});});var addr=(o.addresses||[]).map(function(a){return typeof a==='string'?a:Object.keys(a).map(function(k){return str(a[k]).trim();}).filter(Boolean).join(', ');}).filter(Boolean);add({id:'CN-UN:'+str(o.id||i+1),regime:'CN',jurisdiction:'UN',auxiliary:true,defaultEnabled:false,sourceKey:'CN-UN',name:o.name||'',nameZh:o.nameZh||'',aliases:uniq(splitValues(o.aliases).concat(o.nameOriginalScript?[o.nameOriginalScript]:[])),aliasDetails:o.aliasDetails||[],addresses:addr,identifiers:ids,type:typeKey(o.type),status:'listed_snapshot',statusRaw:o.status||'listed_snapshot',startDate:o.noticeDate||'',endDate:'',statusDate:'',sourceUrl:o.sourceUrl||un.metadata&&un.metadata.sourceUrl||'',sourceListUrl:o.directoryUrl||'',statusUrl:'',noticeTitle:o.noticeTitle||{},restrictions:o.restrictions||{},chinaApplicability:o.chinaApplicability||'not_determined',unRegime:o.unRegime||'',iranChinaReviewRequired:o.iranChinaReviewRequired===true,chinaPositionSourceUrl:o.chinaPositionSourceUrl||'',referenceNumber:o.referenceNumber||'',dataId:o.dataId||'',raw:{columns:cols,cells:cells},provenance:{kind:'un-auxiliary',dataAsOf:un.metadata&&un.metadata.xmlDateGenerated||null}});});return {records:records,byId:byId,metadata:{us:us.metadata||{},cnUpload:cn.metadata||{},cnOfficial:official.metadata||{},unAux:un.metadata||{},indexedAt:asOf,duplicates:duplicates,appliedCorrections:appliedCorrections,unappliedCorrections:unappliedCorrections,counts:{CN:records.filter(function(r){return r.regime==='CN'&&!r.auxiliary;}).length,US:records.filter(function(r){return r.regime==='US';}).length,UNAuxiliary:records.filter(function(r){return r.auxiliary;}).length,statusReviews:appliedCorrections.length}},facets:{CN:facets(records,'CN'),US:facets(records,'US')}};}
function getRecord(index,id){return index&&index.byId?index.byId.get(id)||null:null;}
function facets(records,regime){var s={},t={},st={};records.forEach(function(r){if(r.regime!==regime)return;s[r.sourceKey]=(s[r.sourceKey]||0)+1;t[r.type]=(t[r.type]||0)+1;st[r.status]=(st[r.status]||0)+1;});return {sources:Object.keys(s).sort().map(function(k){return {key:k,label:sourceDefinition(k).label,count:s[k]};}),types:Object.keys(t).sort().map(function(k){return {key:k,label:TYPES[k]||TYPES.unknown,count:t[k]};}),statuses:Object.keys(st).sort().map(function(k){return {key:k,label:STATUS[k]||STATUS.unknown,count:st[k]};})};}
function editDistance(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;var prev=[],prev2=null,i,j;for(j=0;j<=b.length;j++)prev[j]=j;for(i=1;i<=a.length;i++){var cur=[i],min=i;for(j=1;j<=b.length;j++){var v=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(prev2&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,prev2[j-2]+1);cur[j]=v;if(v<min)min=v;}if(min>max)return max+1;prev2=prev;prev=cur;}return prev[b.length];}
// Compile once per search. These caches contain only transient comparison work;
// identifiers retain their separate normalization and never use edit distance.
function queryPart(raw){var norm=normalize(raw);return {raw:raw,norm:norm,idNorm:normalizeIdentifier(raw),partial:norm.length>=3||(/[\p{Script=Han}]/u.test(norm)&&norm.length>=2),fuzzy:/^[a-z]{5,}$/.test(norm),max:norm.length>=9?2:1,distances:new Map()};}
function compileQuery(raw){var q=queryPart(raw);q.tokens=q.norm.split(' ').filter(Boolean).slice(0,30).map(queryPart);return q;}
function textMatch(items,q,allowFuzzy){var nq=q.norm;if(!nq)return null;var best=null;items.forEach(function(item){var kind='',score=0,distance=0;if(item.norm===nq){kind='exact';score=1000;}else if(item.words.indexOf(nq)>=0){kind='token';score=800;}else if(q.partial&&item.norm.indexOf(nq)>=0){kind='partial';score=650;}else if(allowFuzzy&&q.fuzzy){var max=q.max;item.words.forEach(function(word){if(!/^[a-z]{5,}$/.test(word))return;var d=q.distances.get(word);if(d===undefined){d=editDistance(nq,word,max);q.distances.set(word,d);}if(d<=max&&(!score||d<distance)){kind='fuzzy';distance=d;score=450-d*50;}});}if(score&&(!best||score>best.score))best={field:item.field,kind:kind,value:item.value,query:q.raw,score:score,distance:distance,aliasQuality:item.quality||''};});return best;}
function idMatch(r,q){var n=q.idNorm;for(var i=0;i<r._ids.length;i++){var x=r._ids[i];if(x.norm===n)return {field:'identifier',identifierType:x.type,kind:'exact',value:x.value,query:q.raw,score:1200};}return null;}
function allTerms(items,q,allowFuzzy){var ts=q.tokens,result=[];if(!ts.length)return null;var whole=textMatch(items,q,false);if(whole)return [whole];for(var i=0;i<ts.length;i++){var match=textMatch(items,ts[i],allowFuzzy);if(!match)return null;result.push(match);}return result;}
function queryMatch(r,q,allowFuzzy){var direct=idMatch(r,q);if(direct)return [direct];var whole=textMatch(r._names,q,false);if(whole)return [whole];var ts=q.tokens,a=[];if(!ts.length)return null;for(var i=0;i<ts.length;i++){var token=ts[i],m=idMatch(r,token)||textMatch(r._names,token,allowFuzzy)||textMatch(r._addresses,token,false);if(!m)return null;a.push(m);}return a;}
function search(index,options){options=options||{};var regime=options.regime==='US'?'US':'CN',q=str(options.query).trim(),name=str(options.name).trim(),address=str(options.address).trim(),identifier=str(options.identifier).trim(),source=options.source||'all',type=options.type||'all',status=options.status||'all',fuzzy=options.fuzzy!==false,limit=Math.max(1,Math.min(100,Number(options.limit)||30)),offset=Math.max(0,Number(options.offset)||0),warnings=[],found=[];if(q.length>500||name.length>500||address.length>500||identifier.length>500)return {total:0,results:[],warnings:[{key:'query_too_long',text:{zh:'单项输入请控制在500个字符以内。',en:'Keep each search field within 500 characters.'}}],facets:index.facets[regime],query:options};if(!q&&!name&&!address&&!identifier)return {total:0,results:[],warnings:[],facets:index.facets[regime],query:options};if([q,name].some(function(x){return x&&normalize(x).length<3;}))warnings.push({key:'short_name',text:{zh:'短名称易出现重名；建议补充完整名称、地址或识别号。短拉丁字符仅按完整词匹配，不做模糊纠错。',en:'Short names are ambiguous. Add a full name, address, or identifier. Short Latin terms match complete tokens without fuzzy correction.'}});var compiled={query:compileQuery(q),name:compileQuery(name),address:compileQuery(address),identifier:queryPart(identifier)};index.records.forEach(function(r){if(r.regime!==regime||(r.sourceKey==='CN-UN'&&source!=='CN-UN')||(source!=='all'&&r.sourceKey!==source)||(type!=='all'&&r.type!==type)||(status!=='all'&&r.status!==status))return;var reasons=[],m;if(q){m=queryMatch(r,compiled.query,fuzzy);if(!m)return;reasons=reasons.concat(m);}if(name){m=allTerms(r._names,compiled.name,fuzzy);if(!m)return;reasons=reasons.concat(m);}if(address){m=allTerms(r._addresses,compiled.address,false);if(!m)return;reasons=reasons.concat(m);}if(identifier){m=idMatch(r,compiled.identifier);if(!m)return;reasons.push(m);}var seen={};reasons=reasons.filter(function(x){var k=x.field+'|'+x.kind+'|'+x.value+'|'+x.query;if(seen[k])return false;seen[k]=true;return true;});var score=reasons.reduce(function(n,x){return n+x.score;},0),kind=reasons.some(function(x){return x.kind==='fuzzy';})?'fuzzy':reasons.some(function(x){return x.kind==='partial';})?'partial':reasons.every(function(x){return x.kind==='exact';})?'exact':'token';var ws=r.dateWarnings.slice();if(reasons.some(function(x){return /low/i.test(x.aliasQuality||'');}))ws.push({key:'low_quality_alias',text:{zh:'匹配涉及来源标注的低质量别名；不得仅凭该别名确认身份，应取得独立识别信息。',en:'A match involves an alias the source labels low quality. Do not establish identity from that alias alone; obtain independent identifying information.'}});found.push({record:r,score:score,matchKind:kind,reasons:reasons,warnings:ws});});found.sort(function(a,b){return b.score-a.score||a.record.name.localeCompare(b.record.name)||a.record.id.localeCompare(b.record.id);});return {total:found.length,results:found.slice(offset,offset+limit),warnings:warnings,facets:index.facets[regime],query:{regime:regime,query:q,name:name,address:address,identifier:identifier,source:source,type:type,status:status,fuzzy:fuzzy,limit:limit,offset:offset}};}
function nextSteps(record,lang){var zh=lang!=='en';if(record&&SOURCE_GUIDANCE[record.sourceKey]){var specific=SOURCE_GUIDANCE[record.sourceKey].steps.map(function(step){return step[zh?0:1];});if(record.regime==='US')specific.unshift(zh?'先比对完整名称、别名、地址及识别号，确认是否同一主体。':'First compare the full name, aliases, addresses, and identifiers to establish whether this is the same party.');if(record.endDate)specific.unshift(zh?'来源载有结束日期，应核对当前命令及后续变更，不据该日期自动认定措施解除。':'The source contains an end date. Review the current order and later changes; do not infer removal from that date alone.');return specific;}if(record&&record.sourceKey==='CN-UN'){var steps=zh?['本条仅为联合国辅助核对结果；先查明对应机制、具体措施及中国实施要求。','对照完整姓名、别名质量、地址、出生信息及证件号码确认身份，低质量别名不能单独确认命中。','核对名单更新、移除、豁免和交易范围，并保存官方依据。']:['This is an auxiliary UN result. First identify the relevant regime, specific measures, and Chinese implementation requirements.','Compare full names, alias quality, addresses, birth details, and document numbers. A low-quality alias alone does not establish identity.','Check updates, removals, exemptions, and transaction scope, and retain official evidence.'];if(record.iranChinaReviewRequired)steps.unshift(zh?'伊朗机制须另核中国反对恢复制裁的官方立场及国内适用文件，不能将本条直接作为中国法交易禁止结论。':'For the Iran regime, separately review China’s official position opposing reimposition and applicable domestic instruments. Do not treat this entry as a finding that Chinese law prohibits the transaction.');return steps;}if(record&&record.sourceKey==='CN-BLOCKING')return zh?['本条涉及中国阻断措施中的主体，不表示中国对其施加交易禁止。','核对中国禁止承认、执行或遵守的外国措施及其适用范围，并审阅官方决定。','针对具体交易评估中国法与外国措施的冲突，必要时核查豁免程序及寻求法律复核。']:['This entry identifies a party relevant to Chinese blocking measures; it does not mean China prohibits transactions with that party.','Review the official decision and identify the foreign measures China prohibits recognizing, enforcing, or complying with, including their scope.','Assess conflicts between Chinese law and foreign measures for the specific transaction; review exemption procedures and obtain legal review where needed.'];if(record&&record.sourceKey==='CN-TAO-REPORTED')return zh?['本条属于涉台举报或核查线索，不能据名单名称推定存在统一交易禁止。','逐人核对有权机关的正式决定、当前状态和具体措施；未取得依据前保持未核实状态。','补充身份信息并留存核查依据，区分举报线索、人员认定与具体限制措施。']:['This entry relates to reported or investigated Taiwan-related persons. Its list label does not establish a general transaction prohibition.','Verify the competent authority’s formal decision, current status, and specific measures for the individual. Keep the status unverified without supporting evidence.','Obtain identity details and retain the evidence. Distinguish allegations, individual designations, and specific restrictions.'];var a=zh?['比对完整名称、别名、地址和识别号，排除同名主体；相关信息不足时补充交易对手材料。','打开本条记录的官方来源及后续公告，确认当前状态、措施对象、适用交易和例外条件。','结合本次交易、货物、目的地、最终用户和所有权结构开展合规复核；保留核查依据和日期。']:['Compare the full name, aliases, addresses, and identifiers to rule out a different party with a similar name. Obtain additional counterparty information where needed.','Review the official source and subsequent notices to confirm current status, the party covered, relevant transactions, and applicable exceptions.','Review the transaction, items, destination, end users, and ownership structure. Retain the evidence and review date.'];if(record&&record.sourceKey==='US-UVL')a.splice(1,0,zh?'本条来源为未经核实名单；请按该名单的专门要求核查，不将其直接等同于资产冻结名单。':'This source is the Unverified List. Review its specific requirements; do not equate it with an asset-blocking list.');if(record&&record.endDate)a.unshift(zh?'来源载有结束日期，先查明当前命令及后续变更；本系统不据此自动认定措施解除。':'The source provides an end date. First verify the current order and subsequent changes; this system does not infer that measures have ended.');return a;}
return {createIndex:createIndex,search:search,getRecord:getRecord,sources:sources,label:label,statusLabel:statusLabel,typeLabel:typeLabel,fieldLabel:fieldLabel,nextSteps:nextSteps,normalize:normalize,normalizeIdentifier:normalizeIdentifier,statuses:STATUS,types:TYPES};
});

;
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

;
/* Local party screening. Public reference data only; inputs never leave this page. */
(function (root) {
'use strict';
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {lang:'zh',regime:'CN',query:'',name:'',address:'',identifier:'',source:'all',type:'all',status:'all',fuzzy:true,advanced:false,offset:0,result:null,detail:null,batch:null,batchScope:null,batchProgress:null,error:null,pending:false};
const bundles = {}, indexes = {}, loading = {};
let callbacks = {}, operation = 0, pendingBatchInputs = null;
const t = (zh,en) => state.lang === 'zh' ? zh : en;
const L = o => o == null ? '' : typeof o === 'string' ? o : o[state.lang] || o.en || o.zh || '';
const E = () => root.CNECCSEntities;
const TEXT_FIELDS = new Set(['query','name','address','identifier']);
const FILTER_FIELDS = new Set(['source','type','status']);
const textValue = value => value == null ? '' : String(value);
const clock = () => root.performance?.now ? root.performance.now() : Date.now();
const yieldWork = () => new Promise(resolve => setTimeout(resolve, 0));
const button = (text,action,cls='secondary',attrs='') => '<button type="button" class="'+cls+'" data-ent-action="'+action+'" '+attrs+'>'+esc(text)+'</button>';
const safe = value => {try{const u = new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}};
const rerender = () => callbacks.rerender && callbacks.rerender();
function configure(options) {callbacks = options || {};}
const RETRY_DELAYS = [2000,5000,10000,20000,30000];
function referenceError(code,message){const error=new Error(message);error.code=code;return error;}
function referenceLoad(work){
 const controller=typeof root.AbortController==='function'?new root.AbortController():null;
 const attempt={active:true,signal:controller?.signal};
 attempt.check=()=>{if(!attempt.active)throw referenceError('PARTY_CANCELED','Party reference loading was canceled');};
 attempt.wait=ms=>new Promise((resolve,reject)=>{
  attempt.check();let timer;
  const cancel=()=>{root.clearTimeout?.(timer);reject(referenceError('PARTY_CANCELED','Party reference loading was canceled'));};
  timer=setTimeout(()=>{attempt.signal?.removeEventListener('abort',cancel);resolve();},ms);
  attempt.signal?.addEventListener('abort',cancel,{once:true});
 });
 // Slow valid transfers stay alive; only a completed or terminally failed group is cleaned up.
 return Promise.resolve().then(()=>work(attempt)).finally(()=>{attempt.active=false;controller?.abort();});
}
async function getJSON(path, embedded, attempt) {
 attempt.check();if(embedded)return embedded;
 for(let tries=0;;tries++){
  attempt.check();
  try{
   const response=await fetch(path,{credentials:'omit',referrerPolicy:'no-referrer',...(attempt.signal?{signal:attempt.signal}:{})});
   attempt.check();
   if(!response.ok){
    // Release an error body before retrying, without waiting on its stream or aborting sibling requests.
    try{Promise.resolve(response.body?.cancel?.()).catch(()=>{});}catch{}
    const error=referenceError('PARTY_HTTP','Reference HTTP '+response.status);error.transient=response.status===408||response.status===429||response.status>=500;throw error;
   }
   const value=await response.json();attempt.check();return value;
  }catch(error){
   attempt.check();
   const transient=error.transient===true||(!error.code&&error.name!=='SyntaxError'&&error.name!=='AbortError');
   if(transient){await attempt.wait(RETRY_DELAYS[Math.min(tries,RETRY_DELAYS.length-1)]);continue;}
   if(!error.code)error.code=error.name==='SyntaxError'?'PARTY_INVALID':'PARTY_NETWORK';throw error;
  }
 }
}
function requireTable(data, required){if(!data||!Array.isArray(data.columns)||!Array.isArray(data.rows)||required.some(key=>!data.columns.includes(key))||data.rows.some(row=>!Array.isArray(row)||row.length!==data.columns.length))throw Error('Invalid reference table');return data;}
function requireRecords(data){if(!data||!Array.isArray(data.records)||data.records.some(record=>!record||typeof record!=='object'||Array.isArray(record)))throw Error('Invalid reference records');return data;}
function scopeReady(regime=state.regime,source=state.source){return !!indexes[regime]&&(regime!=='CN'||source!=='CN-UN'||!!bundles.unAux);}
function loadKey(regime,source){return regime==='CN'&&source==='CN-UN'?'CN-UN':regime;}
async function ensure(regime,source='all') {
 if(!['CN','US'].includes(regime))throw referenceError('PARTY_REGIME','Unknown party regime');
 if(scopeReady(regime,source))return indexes[regime];
 const key=loadKey(regime,source);if(loading[key])return loading[key];
 const task=referenceLoad(async attempt=>{
  const embedded=root.CNECCS_ENTITY_DATA||{};let prepared;
  if(regime==='US')prepared={us:requireTable(await getJSON('data/us-entities-official.json',embedded.us,attempt),['_id','source','name'])};
  else if(source==='CN-UN'&&!embedded.unAux){
   // The auxiliary source never blocks normal China screening.
   await ensure('CN');attempt.check();
   prepared={cnUpload:bundles.cnUpload,cnOfficial:bundles.cnOfficial,unAux:requireRecords(await getJSON('data/un-entities-auxiliary.json',null,attempt))};
  }else{
   const values=await Promise.all([getJSON('data/cn-entities-upload.json',embedded.cnUpload,attempt),getJSON('data/cn-entities-official-additions.json',embedded.cnOfficial,attempt),embedded.cnOfficial?Promise.resolve(null):getJSON('data/cn-entities-extra.json',embedded.cnExtra,attempt)]);
   requireTable(values[0],['Type','Name']);requireRecords(values[1]);if(values[2])requireRecords(values[2]);
   prepared={cnUpload:values[0],cnOfficial:values[2]?{metadata:{...values[1].metadata,extra:values[2].metadata},records:[...values[1].records,...values[2].records]}:values[1]};
   if(embedded.unAux)prepared.unAux=requireRecords(embedded.unAux);
  }
  attempt.check();const index=E().createIndex(prepared);attempt.check();return {index,prepared};
 }).then(({index,prepared})=>{Object.assign(bundles,prepared);indexes[regime]=index;return index;}).finally(()=>{if(loading[key]===task)delete loading[key];});
 loading[key]=task;return task;
}
function loadMessage(error){const code=error?.code||'PARTY_INVALID';return {kind:'load',code,
 zh:code==='PARTY_INVALID'?'名单文件暂时无法读取。输入内容已保留，请重试；持续失败时请反馈此问题。':'所选名单文件无法载入。输入内容已保留，请重试；持续失败时请反馈此问题。',
 en:code==='PARTY_INVALID'?'The list file could not be read. Your input is preserved. Retry, and report the issue if it persists.':'The selected list file could not load. Your input is preserved. Retry, and report the issue if it persists.'};}
function sourcesFor(index){const values=index?E().search(index,{regime:state.regime,limit:1}).facets.sources.slice():[];if(state.regime==='CN'&&index&&!values.some(x=>x.key==='CN-UN'))values.push({key:'CN-UN',label:{zh:'联合国辅助核对（选用时载入）',en:'UN auxiliary screening (loads when selected)'},count:null});return values;}
function reset(regime) {
 operation++;pendingBatchInputs=null;
 Object.assign(state,{regime,source:'all',type:'all',status:'all',offset:0,result:null,detail:null,batch:null,batchScope:null,batchProgress:null,error:null,pending:false});
}
function input(name,label,placeholder='') {
 return '<label class="entity-field"><span>'+esc(label)+'</span><input id="entity-'+name+'" data-ent-field="'+name+'" value="'+esc(state[name])+'" maxlength="500" autocomplete="off" spellcheck="false" placeholder="'+esc(placeholder)+'"></label>';
}
function options(key,values,all) {
 return '<label class="entity-filter"><span>'+esc({source:t('名单来源','List source'),type:t('主体类型','Party type'),status:t('记录状态','Record status')}[key])+'</span><select id="entity-filter-'+key+'" data-ent-filter="'+key+'"><option value="all">'+esc(all)+'</option>'+values.map(x=>'<option value="'+esc(x.key)+'" '+(state[key]===x.key?'selected':'')+'>'+esc(L(x.label))+(x.count==null?'':' · '+x.count)+'</option>').join('')+'</select></label>';
}
function sourceName(key) {
 const sources=E().sources(state.regime);const source=Array.isArray(sources)?sources.find(s=>s.key===key):sources[key];
 return L(source?.label)||key;
}
function regimeTabs(){return '<div class="regime-tabs" role="group" aria-label="'+t('选择管制制度','Choose a legal regime')+'">'+['CN','US'].map(r=>'<button type="button" class="regime-tab '+(state.regime===r?'active':'')+'" data-action="regime" data-value="'+r+'" aria-pressed="'+(state.regime===r)+'">'+esc(r==='CN'?t('中国制度','China'):t('美国制度','United States'))+'</button>').join('')+'</div>';}
function render(props) {
 state.lang=props.lang; if(state.regime!==props.regime)reset(props.regime);
 if(!scopeReady()&&!loading[loadKey(state.regime,state.source)]&&(!state.error||state.error.kind==='input')){const requestedRegime=state.regime,requestedSource=state.source;ensure(requestedRegime,requestedSource).then(()=>{if(state.regime===requestedRegime&&state.source===requestedSource)rerender();}).catch(error=>{if(state.regime!==requestedRegime||state.source!==requestedSource)return;state.error=loadMessage(error);state.pending=false;rerender();});}
 if(state.detail&&indexes[state.regime])return detailPage();
 const index=indexes[state.regime];
 const facets=index?{...E().search(index,{regime:state.regime,limit:1}).facets,sources:sourcesFor(index)}:{sources:[],types:[],statuses:[]};
 return '<section class="page-heading"><div><div class="eyebrow">'+t('核对身份 · 查明措施','Verify identity · Review measures')+'</div><h1>'+t('主体与限制措施查询','Party and restrictions screening')+'</h1><p>'+t('按名称、地址或识别号查找列示记录，核对身份后再判断具体措施。','Find listing records by name, address, or identifier. Verify the identity before evaluating the measures.')+'</p></div>'+regimeTabs()+'</section>'+
 '<section class="search-panel entity-search"><form id="entity-search-form"><div class="search-body">'+input('query',t('你需要核查哪个主体？','Who do you need to screen?'),t('输入企业名称、人员姓名、地址或识别号','Enter a business name, person’s name, address, or identifier'))+
 '<div class="entity-controls">'+button(state.advanced?t('收起精确条件','Hide specific fields'):t('补充名称、地址或识别号','Add specific name, address, or ID'),'advanced','quiet-button','id="entity-advanced"')+'<label class="entity-fuzzy"><input id="entity-fuzzy" type="checkbox" data-ent-field="fuzzy" '+(state.fuzzy?'checked':'')+'>'+t('包含近似名称','Include similar names')+'</label></div>'+
 (state.advanced?'<div class="entity-fields">'+input('name',t('名称／别名','Name / alias'))+input('address',t('地址关键词','Address keywords'))+input('identifier',t('识别号／名单编号','Identifier / list ID'))+'</div><p class="small muted">'+t('多个字段同时满足才返回；识别号采用精确匹配，不自动修正。','All supplied fields must match. Identifiers use exact matching without automatic correction.')+'</p>':'')+
 '<div class="entity-controls">'+button(t('从文件提取主体','Extract parties from a file'),'documents','secondary')+'<div>'+button(t('清空','Clear'),'clear','quiet-button')+' <button type="submit" class="primary">'+t('查询名单','Screen parties')+'</button></div></div></div></form></section>'+
 (state.batchProgress?'<div class="query-interpretation" role="status" aria-live="polite">'+esc(t('正在核对 '+state.batchProgress.done+' / '+state.batchProgress.total+' 个主体；完成后统一更新结果。下方仍为上次完成的结果，请以其查询条件为准。','Screening '+state.batchProgress.done+' / '+state.batchProgress.total+' parties; results update when the batch finishes. Any results below are from the last completed screening and retain its conditions.'))+' '+button(t('取消本批','Cancel this batch'),'cancel-batch','text-button','id="entity-cancel-batch"')+'</div>':'')+(state.error?'<div class="error-banner" role="alert">'+esc(L(state.error))+' '+(state.error.kind==='input'?'':button(t('重试载入','Retry loading'),'retry','text-button'))+'</div>':'')+
 (index?'<div class="entity-filters">'+options('source',facets.sources,state.regime==='CN'?t('中国默认来源（不含联合国辅助）','Default China sources (excluding UN auxiliary)'):t('全部来源','All sources'))+options('type',facets.types,t('全部类型','All types'))+options('status',facets.statuses,t('全部状态','All statuses'))+'</div>':'')+
 '<div class="entity-context"><span class="entity-context-number">'+(scopeReady()?(state.source==='CN-UN'?index.metadata.counts.UNAuxiliary:index.metadata.counts[state.regime]).toLocaleString(state.lang==='zh'?'zh-CN':'en-US'):'—')+'</span><span>'+(state.source==='CN-UN'?t('条联合国辅助记录 · 中国适用性另核','UN auxiliary records · Chinese applicability requires review'):t('条列示记录 · 按所选制度独立检索','listing records · searched within the selected regime'))+'</span><span>'+t('记录数不等于主体数；同一主体可涉及不同措施。','Record counts are not unique-party counts; one party may have several measures.')+'</span></div>'+
 (state.source==='CN-UN'?'<div class="query-interpretation entity-un-scope"><strong>'+t('当前仅查询联合国辅助来源','Searching the UN auxiliary source only')+'</strong><p>'+t('这些记录不属于中国自主制裁清单。须分别核查联合国具体机制及中国实施要求；伊朗机制尤其需要核查中国官方立场，不能直接形成中国法交易禁止结论。','These records are not an autonomous Chinese sanctions list. Review each UN regime and Chinese implementation requirements separately. Iran-regime results particularly require review of China’s official position; they do not establish a Chinese-law transaction prohibition.')+'</p></div>':'')+'<div class="entity-result-output" aria-busy="'+Boolean(state.batchProgress||state.pending||(!scopeReady()&&!state.error))+'">'+((state.pending||(!scopeReady()&&!state.error))?'<div class="query-interpretation" role="status" aria-live="polite">'+esc(t(state.pending?'已收到查询，正在准备所选名单。完成后将自动查询，无需重复提交。':'正在准备所选名单，你可以先输入身份信息。',state.pending?'Your search has been received. It will run automatically when the selected list is ready; no need to submit again.':'Preparing the selected list. You can enter identity details now.'))+'</div>':'')+(state.batch?batchPage():state.result?resultsPage():'<div class="entity-start"><div class="entity-step"><strong>01</strong><span>'+t('输入已知身份信息','Enter known identity details')+'</span></div><div class="entity-step"><strong>02</strong><span>'+t('比较名称、地址和识别号','Compare names, addresses, and IDs')+'</span></div><div class="entity-step"><strong>03</strong><span>'+t('核对措施及下一步动作','Review measures and next actions')+'</span></div></div>')+'</div>'+coverage(index);
}
function warningText(w){return L(w?.text||w?.message||w?.label||w)||'';}
function matchText(result) {
 const kinds=(result.reasons||[]).map(x=>x.kind).join(' ');
 if((result.reasons||[]).some(x=>/identifier|uid|id/.test(x.field)&&/exact/.test(x.kind)))return t('识别号一致 · 仍需交叉核对身份','Identifier match · Cross-check identity');
 if(/fuzzy|approx/.test(result.matchKind+' '+kinds))return t('名称近似 · 需要进一步辨认','Similar name · Identification required');
 if(/exact/.test(result.matchKind+' '+kinds))return t('存在精确字段匹配 · 仍需核实主体','Exact field match · Verify the party');
 return t('检索条件相关 · 核实是否同一主体','Related fields · Verify whether this is the same party');
}
function partyName(r){return state.lang==='zh'?(r.nameZh||r.name):r.name||r.nameZh;}
function reasonText(reason){return E().fieldLabel(reason.field,state.lang)+' · '+reason.value;}
function card(hit) {
 const r=hit.record;
 return '<article class="entity-card"><div class="result-top"><span class="pill">'+esc(sourceName(r.sourceKey))+'</span><span class="pill entity-status">'+esc(E().statusLabel(r.status,state.lang))+'</span></div><h3>'+esc(partyName(r))+'</h3>'+
 ((state.lang==='zh'&&r.nameZh&&r.name!==r.nameZh)?'<p class="entity-original">'+esc(r.name)+'</p>':'')+
 '<p class="entity-address">'+esc((r.addresses||[]).slice(0,2).join(' · ')||t('来源未提供可用于比对的地址','No address available in the source for comparison'))+'</p>'+
 '<div class="entity-evidence">'+(hit.reasons||[]).slice(0,3).map(reason=>'<span>'+esc(reasonText(reason))+'</span>').join('')+'</div>'+
 ((hit.warnings||r.dateWarnings||[]).filter(w=>['low_quality_alias','iran_china_review','un_auxiliary_only','past_source_end_date'].includes(w.key)).slice(0,3).map(w=>'<p class="small entity-warning">'+esc(warningText(w))+'</p>').join(''))+
 '<div class="result-bottom"><span class="match-reason">'+esc(matchText(hit))+'</span>'+button(t('核对身份与措施','Review identity and measures'),'detail','text-button','data-id="'+esc(r.id)+'"')+'</div></article>';
}
function searchConditions(query){query=query||{};const text=[['query',t('综合输入','General input')],['name',t('名称','Name')],['address',t('地址','Address')],['identifier',t('识别号','Identifier')]].filter(([key])=>query[key]).map(([key,label])=>label+': '+query[key]);text.push(query.source&&query.source!=='all'?sourceName(query.source):t('默认来源','Default sources'));if(query.type&&query.type!=='all')text.push(E().typeLabel(query.type,state.lang));if(query.status&&query.status!=='all')text.push(E().statusLabel(query.status,state.lang));text.push(query.fuzzy===false?t('不使用近似名称','Similar names disabled'):t('包含近似名称','Similar names included'));return t('查询时的条件：','Conditions used for this screening: ')+text.join(' · ');}
function resultsPage(){const result=state.result;return '<section class="entity-results" aria-live="polite"><div class="results-header"><div><h2>'+t('找到 '+result.total+' 条候选记录',result.total+' candidate records')+'</h2><p>'+t('匹配描述的是检索相似性，不是被制裁概率或交易结论。','A match describes retrieval similarity, not a sanctions probability or transaction decision.')+'</p></div>'+button(t('导出本次查询记录','Export this screening'),'export','secondary')+'</div>'+
 '<p class="small muted">'+esc(searchConditions(result.query))+'</p>'+(result.warnings||[]).map(w=>'<p class="query-interpretation">'+esc(warningText(w))+'</p>').join('')+
 (result.total?'<div class="entity-cards">'+result.results.map(card).join('')+'</div><div class="pagination">'+button(t('上一页','Previous'),'previous','secondary',state.offset===0?'disabled':'')+'<span>'+t('第 '+(Math.floor(state.offset/20)+1)+' 页', 'Page '+(Math.floor(state.offset/20)+1))+'</span>'+button(t('下一页','Next'),'next','secondary',state.offset+20>=result.total?'disabled':'')+'</div>':'<div class="empty-state"><h3>'+t('当前条件下没有找到候选','No candidates found for these criteria')+'</h3><p>'+t('这不能证明不存在限制。请核对名称拼写、别名、识别号以及资料覆盖，并另行核实所有权、控制关系和交易适用规则。','This does not establish that restrictions are absent. Review spelling, aliases, IDs, and coverage, and separately assess ownership, control relationships, and transaction-specific rules.')+'</p></div>')+'</section>';}
function coverage(index){const data=state.regime==='US'?bundles.us:bundles.cnUpload;return '<details class="content-card entity-coverage"><summary>'+t('本次检索覆盖什么？','What does this screening cover?')+'</summary><p>'+t('这是随文件提供的名单资料与注明来源的核验补充，不是实时查询。系统没有启用自动更新或持续审校。','This is a supplied-data snapshot with sourced verification supplements, not a live lookup. Automatic updates and ongoing review are not enabled.')+'</p>'+
 (state.regime==='CN'?'<p>'+t('中国默认检索区分反制措施、不可靠实体清单、出口管制名单及其他已收录措施，默认不包含联合国辅助记录；阻断措施对象不等于被中国制裁。第三方原始整理与官方补充分别留痕，未确认当前状态的记录保持“待核实”。本库不宣称已穷尽中国法项下全部限制。','Default China screening excludes UN auxiliary records and distinguishes countermeasures, the Unreliable Entity List, export-control lists, and other included measures. Parties covered by blocking measures are not thereby sanctioned by China. Original third-party records and official supplements remain traceable; unverified current status stays unresolved. Coverage is not represented as exhaustive under Chinese law.')+'</p>':'<p>'+t('美国检索使用本次取得的官方综合筛查名单快照；原始上传文件另行完整留存。实际来源类别及数量以本次文件统计为准，下载日期不代表每条记录同步更新。来源结束日期及当前效力须回到原始名单与公告核实。','U.S. screening uses the official Consolidated Screening List snapshot obtained for this release; the original upload is separately preserved in full. Source categories and counts reflect the packaged file. Its download date does not establish that every record was updated simultaneously. Verify source end dates and current effect against the underlying lists and notices.')+'</p>')+
 '<p>'+t('查询不包含完整的所有权穿透、未列名关联方、国家／地区禁运、行业限制或具体交易许可分析。姓名、地址和原始识别信息保留来源写法；译文仅帮助理解。','Screening does not perform complete ownership tracing, identify every unlisted affiliate, or determine country embargoes, sectoral restrictions, or transaction licensing. Names, addresses, and identifiers retain their source spelling; translations assist reading only.')+'</p>'+
 '<div class="entity-source-grid">'+(index?E().search(index,{regime:state.regime,limit:1}).facets.sources:[]).map(s=>'<span>'+esc(L(s.label))+' <strong>'+s.count+'</strong></span>').join('')+'</div><p class="small muted">'+t('记录统计依据：本次随包数据。官方核验说明与原始数据包含在完整工程中。','Counts reflect the packaged data. Official-review notes and original source files are included in the complete project.')+'</p></details>';}
function fact(label,value){if(!value)return '';return '<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';}
function sourceLink(url,label){return url&&safe(url)!=='#'?'<a href="'+esc(safe(url))+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':'';}
function identifierLabel(key){const known=E().fieldLabel(key,state.lang);if(known!==key)return known;if(state.lang==='en')return key;if(/passport/i.test(key))return '护照号码';if(/swift|bic/i.test(key))return '银行识别代码';if(/credit.code/i.test(key))return '统一社会信用代码';if(/registration/i.test(key))return '登记编号';if(/tax/i.test(key))return '税务识别号';if(/national|identity|identification/i.test(key))return '身份证明号码';if(/imo/i.test(key))return '国际海事组织编号';if(/license|licence/i.test(key))return '证照编号';return '来源识别号';}
function statusReview(r){if(!r.statusReview)return '';const review=r.statusReview;return '<section class="content-card entity-status-review"><h2>'+t('后续状态核验','Subsequent status review')+'</h2><p><strong>'+esc(L(review.statusLabel)||E().statusLabel(r.status,state.lang))+'</strong></p><p>'+esc(L(review.restrictions))+'</p><dl class="entity-facts">'+fact(t('后续公告','Subsequent notice'),L(review.noticeTitle))+fact(t('状态说明日期','Status statement date'),review.statusDate)+fact(t('本次核验日期','Review date'),review.verifiedAt)+'</dl><p class="small muted">'+t('该补充关联原始列示，不另计一条制裁记录；原始字段保留在下方。变更仅按公告已说明的范围理解。','This supplement is linked to the original listing and is not counted as a new sanctions entry. Original fields are retained below. Interpret the change only within the scope stated by the notice.')+'</p>'+sourceLink(review.statusUrl||review.sourceUrl,t('核对后续官方来源','Review the subsequent official source'))+'</section>';}
function measureEvidence(r){if(r.regime!=='US')return '';const cols=r.raw?.columns||[],cells=r.raw?.cells||[];const get=key=>cells[cols.indexOf(key)]||'';const keys=['programs','license_requirement','license_policy','standard_order','federal_register_notice'];const facts=keys.map(key=>fact(E().fieldLabel(key,state.lang),get(key))).join('');return (facts?'<h3>'+t('本条来源记载的要求','Requirements recorded for this entry')+'</h3><p class="small muted">'+t('以下保留来源原文，具体适用以官方命令和现行规定为准。','The following retains the source wording. Consult the official order and current rules for applicability.')+'</p><dl class="entity-facts">'+facts+'</dl>':'')+(get('remarks')?'<details class="entity-measure-remarks"><summary>'+t('本条来源备注','Source remarks for this entry')+'</summary><p>'+esc(get('remarks'))+'</p></details>':'');}
function detailPage(){const r=E().getRecord(indexes[state.regime],state.detail);if(!r){state.detail=null;return render(state);}
 const currentHit=[...(state.result?.results||[]),...(state.batch||[]).flatMap(item=>item.result.results)].find(hit=>hit.record.id===r.id);const detailWarnings=[...(r.dateWarnings||[]),...(currentHit?.warnings||[]).filter(w=>w.key==='low_quality_alias')];
 const next=E().nextSteps(r,state.lang)||[];
 const steps=Array.isArray(next)?next:[next];
 const fields=r.raw?.columns||[],cells=r.raw?.cells||[];
 return '<div class="entity-detail">'+button(t('返回查询结果','Back to screening'),'back','back-link')+'<div class="page-heading"><div><div class="result-top"><span class="pill">'+esc(sourceName(r.sourceKey))+'</span><span class="pill entity-status">'+esc(E().statusLabel(r.status,state.lang))+'</span></div><h1>'+esc(partyName(r))+'</h1>'+(state.lang==='zh'&&r.nameZh&&r.name!==r.nameZh?'<p>'+esc(r.name)+'</p>':'')+'</div></div>'+
 '<div class="entity-detail-grid"><section class="content-card"><h2>'+t('先确认是否同一主体','First, verify the identity')+'</h2><dl class="entity-facts">'+fact(t('来源名称','Source name'),r.name)+fact(t('中文名称','Chinese name'),r.nameZh)+fact(t('别名','Aliases'),(r.aliases||[]).join(' / '))+fact(t('地址','Addresses'),(r.addresses||[]).join('\n'))+fact(t('识别信息','Identifiers'),(r.identifiers||[]).map(x=>identifierLabel(x.type)+': '+x.value).join('\n'))+'</dl><p class="small muted">'+t('同名不能单独确认身份；地址、识别号和其他身份事实应相互印证。来源未提供的字段不能据此认定为不一致。','A shared name alone does not confirm identity. Corroborate addresses, IDs, and other identifying facts. A missing source field does not establish a mismatch.')+'</p></section>'+
 '<section class="content-card"><h2>'+t('再核对措施及状态','Then review the measures and status')+'</h2>'+(L(r.source?.description)?'<p>'+esc(L(r.source.description))+'</p>':'')+'<dl class="entity-facts">'+fact(t('记录状态','Record status'),E().statusLabel(r.status,state.lang))+fact(t('来源状态原文','Source status wording'),r.provenance?.kind==='uploaded-cn-compilation'&&!r.statusReview?r.statusRaw:'')+fact(t('开始／列示日期','Start / listing date'),r.startDate)+fact(t('来源结束日期','Source end date'),r.endDate)+fact(t('状态说明日期','Status statement date'),r.statusDate)+fact(t('公告','Notice'),L(r.noticeTitle))+'</dl>'+
 detailWarnings.map(w=>'<div class="query-interpretation">'+esc(warningText(w))+'</div>').join('')+
 (L(r.restrictions)?'<p>'+esc(L(r.restrictions))+'</p>':'')+measureEvidence(r)+'<div class="entity-source-links">'+sourceLink(r.sourceUrl,t('打开列示来源','Open listing source'))+sourceLink(r.statusUrl,t('打开状态变更来源','Open status source'))+'</div></section></div>'+
 statusReview(r)+'<section class="content-card entity-next"><h2>'+t('接下来怎么做','What to do next')+'</h2><ol>'+steps.map(s=>'<li>'+esc(L(s))+'</li>').join('')+'</ol><p class="small muted">'+t('以下动作帮助完成核实，不构成已确认的交易禁令、许可判断或解除证明。','These steps support verification; they are not a confirmed transaction prohibition, licensing decision, or proof of removal.')+'</p></section>'+
 '<details class="content-card"><summary>'+t('查看完整来源字段','View all source fields')+'</summary><p class="small muted">'+t('以下字段内容保留来源原文。空白表示未提供；内部记录键不是官方身份号码。','Values below retain the original source wording. Blank means not supplied; an internal record key is not an official identity number.')+'</p><div class="entity-raw-wrap" tabindex="0" role="region" aria-label="'+t('完整来源字段，可横向滚动','Complete source fields, horizontally scrollable')+'"><table class="entity-raw"><tbody>'+fields.map((field,i)=>cells[i]?'<tr><th scope="row">'+esc(E().fieldLabel(field,state.lang))+'</th><td>'+esc(cells[i])+'</td></tr>':'').join('')+'</tbody></table></div></details></div>';}
function perform(keepOperation=false){if(!keepOperation)operation++;pendingBatchInputs=null;state.batchProgress=null;state.pending=false;if(!scopeReady())return;if(![state.query,state.name,state.address,state.identifier].some(x=>x.trim())){state.error={kind:'input',zh:'请至少填写名称、地址或识别号中的一项。',en:'Provide at least a name, address, or identifier.'};state.result=null;return;}state.error=null;state.batch=null;state.batchScope=null;state.result=E().search(indexes[state.regime],{regime:state.regime,query:state.query,name:state.name,address:state.address,identifier:state.identifier,source:state.source,type:state.type,status:state.status,fuzzy:state.fuzzy,offset:state.offset,limit:20});}
function loadFailure(error){state.error=loadMessage(error);state.pending=false;rerender();}
async function searchWhenReady(){
 if(scopeReady()){perform();rerender();return;}
 if(state.pending)return;
 const regime=state.regime,source=state.source,token=++operation;
 pendingBatchInputs=null;state.batchProgress=null;state.pending=true;state.error=null;rerender();
 try{await ensure(regime,source);if(state.regime!==regime||state.source!==source||token!==operation)return;perform(true);rerender();}
 catch(error){if(state.regime===regime&&state.source===source&&token===operation)loadFailure(error);}
}
async function setQuery(query){query=query&&typeof query==='object'?query:{};const regime=state.regime,token=++operation;pendingBatchInputs=null;state.batchProgress=null;state.pending=true;state.error=null;state.detail=null;state.offset=0;state.query=textValue(query.query);state.name=textValue(query.name);state.address=textValue(query.address);state.identifier=textValue(query.identifier);state.advanced=!!(state.name||state.address||state.identifier);state.source=state.type=state.status='all';rerender();try{await ensure(regime);if(state.regime!==regime||token!==operation)return;perform(true);rerender();}catch(error){if(state.regime===regime&&token===operation)loadFailure(error);}}
async function batch(items){
 const regime=state.regime,token=++operation,source=state.source,type=state.type,status=state.status,fuzzy=state.fuzzy;
 state.batchProgress=null;state.pending=false;pendingBatchInputs=null;
 if(!Array.isArray(items)||items.length===0||items.length>100){state.error={kind:'input',zh:items?.length>100?'每批最多查询100个主体。本批未执行，请拆分后重新提交；已有查询结果仍保留。':'请提供1至100个主体，本批未执行；已有查询结果仍保留。',en:items?.length>100?'Each batch supports up to 100 parties. This batch was not run. Split it and submit again; previous results are retained.':'Provide 1 to 100 parties. This batch was not run; previous results are retained.'};rerender();return {ok:false,error:'batch_size'};}
 if(items.some(item=>!item||typeof item!=='object'||Array.isArray(item))){state.error={kind:'input',zh:'批量数据包含无效行，本批未执行；请检查后重新提交。',en:'The batch contains an invalid row and was not run. Check the data and submit again.'};rerender();return {ok:false,error:'batch_row'};}
 const inputs=items.map(supplied=>({query:textValue(supplied.query),name:textValue(supplied.name),address:textValue(supplied.address),identifier:textValue(supplied.identifier)}));
 pendingBatchInputs=inputs;state.detail=null;state.error=null;state.batchProgress={done:0,total:inputs.length};rerender();
 try{
  // Let the pending state paint and accept cancellation before the first party.
  await yieldWork();if(state.regime!==regime||token!==operation)return;
  await ensure(regime,source);if(state.regime!==regime||token!==operation)return;
  const completed=[];let lastYield=clock();
  for(let i=0;i<inputs.length;i++){
   const input=inputs[i],result=E().search(indexes[regime],{...input,regime,source,type,status,limit:5,fuzzy});completed.push({input,result});
   if(i+1<inputs.length&&((i+1)%5===0||clock()-lastYield>=40)){
    state.batchProgress={done:i+1,total:inputs.length};rerender();await yieldWork();
    if(state.regime!==regime||token!==operation)return;lastYield=clock();
   }
  }
  state.result=null;state.batch=completed;state.batchScope={regime,source,type,status,fuzzy};pendingBatchInputs=null;state.batchProgress=null;rerender();
 }catch(error){if(state.regime===regime&&token===operation){pendingBatchInputs=null;state.batchProgress=null;loadFailure(error);}}
}


function batchPage(){return '<section class="content-card"><div class="results-header"><div><h2>'+t('批量主体核对','Batch party screening')+'</h2><p>'+t('逐行保留候选；无候选不等于不存在限制。每行最多显示前 5 条，展开后可继续完整查询。','Candidates are retained per row. No candidates does not establish the absence of restrictions. Up to five appear per row; open the row for a complete search.')+'</p></div>'+button(t('导出批量记录','Export batch record'),'export','secondary')+'</div><p class="small muted">'+esc(searchConditions(state.batchScope))+'</p>'+state.batch.map((item,i)=>'<details class="entity-batch-row"><summary><span>'+esc(item.input.name||item.input.query||item.input.identifier||item.input.address)+'</span><strong>'+t(item.result.total+' 条候选',item.result.total+' candidates')+'</strong></summary><div class="entity-cards">'+item.result.results.map(card).join('')+'</div>'+button(t('查询该行全部候选','Search all candidates for this row'),'batch-row','secondary','data-index="'+i+'"')+'</details>').join('')+'</section>';}
function exportResults(){
 const note=t('本记录为本地名单初筛。相似名称或识别字段匹配不等于已经确认身份；未命中不是不受限制或可交易的证明。','This is a local preliminary list screen. Similar names or identifier matches do not establish identity; no match is not proof that restrictions are absent or a transaction is permitted.');
 const used=state.batch?state.batchScope:state.result?.query;const entries=state.batch||[{input:{query:used?.query||'',name:used?.name||'',address:used?.address||'',identifier:used?.identifier||''},result:state.result}];
 const source=!used?.source||used.source==='all'?t('所选制度默认来源','Default sources for the selected regime'):sourceName(used.source);
 const html='<!doctype html><html lang="'+state.lang+'"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>CNECCS · '+t('主体核对记录','Party screening record')+'</title><style>body{font:15px/1.8 system-ui;max-width:1000px;margin:40px auto;padding:0 22px;color:#143449}article{border:1px solid #dce7ed;padding:18px;margin:15px 0}h1,h2{color:#073c61}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#1178ba}</style><h1>'+t('主体核对记录','Party screening record')+'</h1><p>'+esc(state.regime+' · '+new Date().toISOString())+'</p><p>'+esc(note)+'</p><p>'+esc(t('来源：','Source: ')+source)+'</p>'+entries.map(item=>'<h2>'+esc(Object.values(item.input).filter(Boolean).join(' · '))+'</h2><p>'+t('候选记录总数：','Total candidate records: ')+item.result.total+'</p>'+item.result.results.map(h=>'<article><h3>'+esc(partyName(h.record))+'</h3><p>'+esc(sourceName(h.record.sourceKey))+' · '+esc(E().statusLabel(h.record.status,state.lang))+'</p><p>'+esc(matchText(h))+'</p>'+(h.warnings||[]).map(w=>'<p>'+esc(warningText(w))+'</p>').join('')+(L(h.record.restrictions)?'<p>'+esc(L(h.record.restrictions))+'</p>':'')+statusReview(h.record)+'<pre>'+esc((h.record.raw?.columns||[]).map((c,i)=>h.record.raw.cells[i]?E().fieldLabel(c,state.lang)+': '+h.record.raw.cells[i]:'').filter(Boolean).join('\n'))+'</pre>'+sourceLink(h.record.sourceUrl,t('列示来源','Listing source'))+sourceLink(h.record.statusUrl,t('状态变更来源','Status source'))+'</article>').join('')).join('')+'<p>'+t('导出仅包含当前结果页或各批量行的前 5 条候选；完整候选总数见各行。','The export includes the current result page or the top five candidates per batch row. Total candidate counts appear above.')+'</p></html>';
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='CNECCS-'+state.regime+'-party-screening.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

if(typeof document!=='undefined'){
 document.addEventListener('submit',event=>{if(event.target.id!=='entity-search-form')return;event.preventDefault();state.offset=0;searchWhenReady();document.querySelector('.entity-results')?.scrollIntoView({behavior:'smooth',block:'start'});});
 document.addEventListener('input',event=>{const field=event.target.dataset?.entField;if(field==='fuzzy'){if(state.pending){operation++;state.pending=false;}state.fuzzy=!!event.target.checked;}else if(TEXT_FIELDS.has(field)){if(state.pending){operation++;state.pending=false;}state[field]=textValue(event.target.value);}});
 document.addEventListener('change',event=>{const field=event.target.dataset?.entFilter;if(FILTER_FIELDS.has(field)){const repeat=pendingBatchInputs||(state.batch||[]).map(item=>item.input),hadResult=!!state.result;operation++;pendingBatchInputs=null;state.batchProgress=null;state.pending=false;state.error=null;state[field]=textValue(event.target.value);state.offset=0;if(repeat.length){batch(repeat);return;}if(hadResult){if(!scopeReady())state.result=null;searchWhenReady();return;}rerender();}});
 document.addEventListener('click',async event=>{const el=event.target.closest('[data-ent-action]');if(!el)return;const action=el.dataset.entAction;
 if(action==='advanced'){state.advanced=!state.advanced;rerender();}
 if(action==='documents')callbacks.onDocuments?.();
 if(action==='cancel-batch'){operation++;pendingBatchInputs=null;state.batchProgress=null;rerender();}
 if(action==='clear'){operation++;pendingBatchInputs=null;Object.assign(state,{query:'',name:'',address:'',identifier:'',source:'all',type:'all',status:'all',offset:0,result:null,batch:null,batchScope:null,batchProgress:null,detail:null,error:null,pending:false});rerender();}
 if(action==='retry'){state.error=null;rerender();}
 if(action==='detail'){state.detail=el.dataset.id;rerender();root.scrollTo?.({top:0,behavior:'auto'});}
 if(action==='back'){state.detail=null;rerender();}
 if(action==='previous'||action==='next'){state.offset=Math.max(0,state.offset+(action==='next'?20:-20));perform();rerender();}
 if(action==='batch-row'){const input=state.batch?.[Number(el.dataset.index)]?.input;if(input)await setQuery(input);}
 if(action==='export'&&(state.result||state.batch))exportResults();
 });
}
root.CNECCSEntityUI={configure,render,setQuery,batch,ensure,state,getIndex:regime=>indexes[regime]};
})(typeof window!=='undefined'?window:globalThis);

;
/* Local document workspace. No network requests, storage, code execution, or automatic queries. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CNECCSDocumentUI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const pair=(zh,en)=>({zh,en});
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LIMITS={query:1500,spec:1000,name:500,address:500,identifier:500,products:50,entities:100,text:400000};
function create(options={}){
 const doc=options.document===undefined?root.document:options.document;
 const state={lang:'zh',regime:'CN',target:'products',document:null,text:'',fileName:'',loading:false,sending:false,notice:null,tableIndex:0,header:true,columns:{name:'',address:'',identifier:'',spec:''},selected:new Set(),page:0,section:'all',draft:{query:'',spec:'',name:'',address:'',identifier:''}};
 let callbacks={},generation=0,dispatchGeneration=0,parseController=null,attached=false;
 const t=(zh,en)=>state.lang==='en'?en:zh;
 const local=value=>value&&typeof value==='object'?(value[state.lang]||t('资料内容','Source content')):String(value==null?'':value);
 const refresh=()=>{if(typeof callbacks.rerender==='function')callbacks.rerender();};
 const notify=(zh,en,kind='info')=>{state.notice={message:pair(zh,en),kind};refresh();};
 const table=()=>state.document?.tables?.[state.tableIndex]||null;
 const rows=()=>table()?.rows||[];
 const columnCount=()=>rows().reduce((n,row)=>Math.max(n,Array.isArray(row)?row.length:0),0);
 const cap=()=>LIMITS[state.target];
 const startRow=()=>state.header?1:0;
 const rowNumber=index=>Number.isInteger(table()?.rowNumbers?.[index])?table().rowNumbers[index]:index+1;
 const validIndex=index=>Number.isInteger(index)&&index>=startRow()&&index<rows().length;
 const cell=(row,index)=>index===''?'':String(row[Number(index)]==null?'':row[Number(index)]);
 function resetData(){state.document=null;state.text='';state.fileName='';state.loading=false;state.sending=false;state.notice=null;state.tableIndex=0;state.header=true;state.columns={name:'',address:'',identifier:'',spec:''};state.selected=new Set();state.page=0;state.section='all';state.draft={query:'',spec:'',name:'',address:'',identifier:''};}
 function cancelParse(){parseController?.abort();parseController=null;}
 function clear(){generation++;dispatchGeneration++;cancelParse();resetData();refresh();}
 async function loadFile(file){
  const token=++generation;dispatchGeneration++;cancelParse();parseController=typeof root.AbortController==='function'?new root.AbortController():null;const controller=parseController;resetData();state.loading=true;state.fileName=String(file?.name||'');refresh();
  try{const parse=options.parseFile||root.CNECCSDocuments?.parseFile;if(typeof parse!=='function')throw Error('parser unavailable');const result=await parse(file,controller?{signal:controller.signal}:{});if(token!==generation)return false;
   if(!result||typeof result.text!=='string'||!Array.isArray(result.tables)||!Array.isArray(result.sections))throw Error('invalid parser result');
   state.document=result;state.fileName=String(result.fileName||file?.name||'');state.text=result.text;state.loading=false;refresh();return true;
  }catch(error){if(token!==generation)return false;state.loading=false;state.document=null;state.text='';if(typeof error?.userMessage?.zh==='string'&&typeof error?.userMessage?.en==='string'){notify(error.userMessage.zh,error.userMessage.en,'error');return false;}notify('无法读取此文件。请检查文件格式、大小及是否受密码保护，再重新选择。','The file could not be read. Check its format, size, and password protection, then select it again.','error');return false;}finally{if(token===generation)parseController=null;}
 }
 function setDraft(values){for(const key of Object.keys(state.draft))if(Object.prototype.hasOwnProperty.call(values,key))state.draft[key]=String(values[key]??'');state.notice=null;}
 function setText(value){const text=String(value??'');if(text.length>LIMITS.text)return setError(pair('提取文本超过 '+LIMITS.text+' 字符，请减少内容；未自动截断。','Extracted text exceeds '+LIMITS.text+' characters. Reduce the content; nothing was truncated.'));state.text=text;state.notice=null;return true;}
 function setTarget(value,update=true){if(!['products','entities'].includes(value)||value===state.target)return false;dispatchGeneration++;state.sending=false;state.target=value;state.selected.clear();state.notice=null;if(update)refresh();return true;}
 function setTable(index){const n=Number(index);if(!Number.isInteger(n)||n<0||n>=(state.document?.tables?.length||0))return false;state.tableIndex=n;state.selected.clear();state.page=0;state.columns={name:'',address:'',identifier:'',spec:''};state.notice=null;refresh();return true;}
 function setHeader(value){state.header=Boolean(value);if(state.header)state.selected.delete(0);state.page=0;state.notice=null;refresh();}
 function setColumns(values){const count=columnCount();for(const key of Object.keys(state.columns)){if(!Object.prototype.hasOwnProperty.call(values,key))continue;const value=values[key];if(value==='')state.columns[key]='';else if(Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<count)state.columns[key]=Number(value);}state.notice=null;refresh();}
 function selectRows(indices,mode='replace'){
  const next=mode==='replace'?new Set():new Set(state.selected);for(const raw of indices){const index=Number(raw);if(!validIndex(index))continue;if(mode==='remove')next.delete(index);else next.add(index);}
  if(next.size>cap()){notify('本次最多选择 '+cap()+' 行，请减少选中行数。','Select no more than '+cap()+' rows for this request.','error');return false;}
  state.selected=next;state.notice=null;refresh();return true;
 }
 function selectedData(){return [...state.selected].sort((a,b)=>a-b).map(index=>({index,row:rows()[index]})).filter(x=>Array.isArray(x.row));}
 function payload(row){return state.target==='products'?{query:cell(row,state.columns.name),spec:cell(row,state.columns.spec)}:{name:cell(row,state.columns.name),address:cell(row,state.columns.address),identifier:cell(row,state.columns.identifier)};}
 function validate(value){
  if(state.target==='products'&&!value.query.trim())return pair('请提供物项名称、描述或管制编号。','Provide an item name, description, or control code.');
  if(state.target==='entities'&&!value.name.trim()&&!value.identifier.trim())return pair('请提供主体名称或识别号。','Provide an entity name or identifier.');
  for(const [key,text] of Object.entries(value)){if(String(text).length>LIMITS[key]){const labels={query:pair('查询描述','Query'),spec:pair('补充规格','Specifications'),name:pair('主体名称','Entity name'),address:pair('地址','Address'),identifier:pair('识别号','Identifier')};return pair(labels[key].zh+'超过 '+LIMITS[key]+' 字符，请主动选择或编辑摘录后再查询。系统不会截断内容。',labels[key].en+' exceeds '+LIMITS[key]+' characters. Select or edit an excerpt before searching; the content will not be truncated.');}}
  return null;
 }
 function setError(message){state.notice={message,kind:'error'};refresh();return false;}
 function metadata(source,rowIndices=[]){return {regime:state.regime,target:state.target,fileName:state.fileName,source,rowNumbers:rowIndices.map(rowNumber)};}
 async function dispatch(values,context){
  const batch=values.length>1;let fn=callbacks[state.target==='products'?(batch?'onProductBatch':'onProductQuery'):(batch?'onEntityBatch':'onEntityQuery')];let argument=batch?values:values[0];
  if(!fn&&!batch){fn=callbacks[state.target==='products'?'onProductBatch':'onEntityBatch'];argument=values;}
  if(typeof fn!=='function')return setError(pair(batch?'当前入口尚未连接批量查询，请改为逐条查询。':'当前入口尚未连接查询功能。',batch?'Batch search is not connected here. Select one row at a time.':'Search is not connected to this view.'));
  if(state.sending||state.loading)return false;const token=++dispatchGeneration;state.sending=true;state.notice=null;refresh();
  try{await fn(argument,context);return token===dispatchGeneration;}catch(error){if(token!==dispatchGeneration)return false;if(error?.code==='PRODUCT_CORPUS_NOT_READY')return setError(pair('物项资料尚未就绪，请稍后重试。当前内容仍保留。','The product corpus is not ready. Try again shortly. Your current content remains available.'));return setError(pair('未能转入查询。当前内容仍保留，请重试。','The search could not start. Your current content remains available; try again.'));}finally{if(token===dispatchGeneration){state.sending=false;refresh();}}
 }
 async function sendText(){const value=state.target==='products'?{query:state.draft.query,spec:state.draft.spec}:{name:state.draft.name,address:state.draft.address,identifier:state.draft.identifier};const error=validate(value);if(error)return setError(error);return dispatch([value],metadata('text'));}
 async function sendRows(){
  const selected=selectedData();if(!selected.length)return setError(pair('请先选择要查询的行。','Select the rows to search first.'));if(selected.length>cap())return setError(pair('选中行数超过本次上限。','The selected rows exceed this request’s limit.'));
  if(state.target==='products'&&state.columns.name==='')return setError(pair('请先指定物项名称或描述所在列。','Select the item-name or description column first.'));
  if(state.target==='entities'&&state.columns.name===''&&state.columns.identifier==='')return setError(pair('请至少指定主体名称列或识别号列。','Select at least an entity-name column or an identifier column.'));
  const values=[];for(const entry of selected){const value=payload(entry.row),error=validate(value);if(error)return setError(pair('原表第 '+rowNumber(entry.index)+' 行：'+error.zh,'Source row '+rowNumber(entry.index)+': '+error.en));values.push(value);}
  return dispatch(values,metadata('table',selected.map(x=>x.index)));
 }
 function useSelection(value){const text=String(value??'');if(!text.length)return setError(pair('请先在提取文本中选中一段文字。','Select an excerpt in the extracted text first.'));const key=state.target==='products'?'query':'name';if(text.length>LIMITS[key])return setError(pair('选中文字超过 '+LIMITS[key]+' 字符，请缩小选区；未自动截断。','The selection exceeds '+LIMITS[key]+' characters. Select a shorter excerpt; nothing was truncated.'));state.draft[key]=text;notify('已填入所选文字。请核实并点击确认查询。','The selected text has been filled in. Review it and confirm the search.');return true;}
 function useRow(){const selected=selectedData();if(selected.length!==1)return setError(pair('请仅选择一行，再填入可编辑字段。','Select exactly one row to fill the editable fields.'));setDraft(payload(selected[0].row));notify('已填入原单元格内容。请核实或编辑后再确认查询。','The original cell values have been filled in. Review or edit them before confirming the search.');return true;}
 function useSection(){const sections=state.document?.sections||[];if(state.section==='all')state.text=state.document?.text||'';else{const section=sections[Number(state.section)];if(!section)return false;state.text=String(section.text??'');}state.notice=null;refresh();return true;}
 const btn=(label,action,attrs='',style='secondary')=>'<button id="doc-action-'+action+'" type="button" class="'+style+'" data-doc-action="'+action+'" '+attrs+'>'+label+'</button>';
 function field(key,label,lines=2){const value=state.draft[key];return '<label class="doc-field" for="doc-'+key+'"><span>'+label+'</span><textarea id="doc-'+key+'" data-doc-field="'+key+'" rows="'+lines+'" aria-describedby="doc-'+key+'-count">'+esc(value)+'</textarea><small id="doc-'+key+'-count" class="doc-count '+(value.length>LIMITS[key]?'over-limit':'')+'">'+value.length+' / '+LIMITS[key]+' '+t('字符','characters')+'</small></label>';}
 function tableView(){const tables=state.document.tables;if(!tables.length)return '';const current=table(),data=rows(),count=columnCount(),first=startRow();const total=Math.max(0,data.length-first),pages=Math.max(1,Math.ceil(total/50));state.page=Math.min(state.page,pages-1);const start=first+state.page*50,end=Math.min(data.length,start+50);let shown=[...new Set([...Object.values(state.columns).filter(x=>x!=='').map(Number),...Array.from({length:Math.min(12,count)},(_,i)=>i)])].sort((a,b)=>a-b);const name=index=>{const value=state.header?String(data[0]?.[index]??''):'';return t('第 '+(index+1)+' 列','Column '+(index+1))+(value?' · '+(value.length>100?value.slice(0,100)+'…':value):'');};
  const columnField=(key,label)=>'<label class="doc-field"><span>'+label+'</span>'+(count>200?'<input id="doc-column-'+key+'" type="number" min="1" max="'+count+'" step="1" data-doc-column="'+key+'" data-doc-column-one-based="true" value="'+(state.columns[key]===''?'':state.columns[key]+1)+'"><small>'+t('输入原表列号：1–'+count+'；留空表示不使用。','Enter a source column number: 1–'+count+'; leave blank if unused.')+'</small>':'<select id="doc-column-'+key+'" data-doc-column="'+key+'"><option value="">'+t('请选择／不使用','Select / not used')+'</option>'+Array.from({length:count},(_,i)=>'<option value="'+i+'" '+(state.columns[key]===i?'selected':'')+'>'+esc(name(i))+'</option>').join('')+'</select>')+'</label>';
  return '<section class="doc-card"><h2>'+t('按表格选择查询内容','Select data from a table')+'</h2><div class="doc-controls"><label class="doc-field"><span>'+t('选择表格','Table')+'</span><select id="doc-table-select" data-doc-field="table">'+tables.map((x,i)=>'<option value="'+i+'" '+(i===state.tableIndex?'selected':'')+'>'+esc(local(x.label)||t('表格 '+(i+1),'Table '+(i+1)))+'</option>').join('')+'</select></label><label class="doc-checkbox"><input id="doc-table-header" type="checkbox" data-doc-field="header" '+(state.header?'checked':'')+'>'+t('第一行作为表头','Use the first row as column headers')+'</label></div><div class="doc-column-map">'+columnField('name',state.target==='products'?t('物项名称／描述列','Item name / description column'):t('主体名称列','Entity-name column'))+(state.target==='products'?columnField('spec',t('补充规格列（可选）','Specifications column (optional)')):columnField('address',t('地址列（可选）','Address column (optional)'))+columnField('identifier',t('识别号列（可选）','Identifier column (optional)')))+'</div><p class="doc-muted">'+t('下方显示原表行号。已选择 '+state.selected.size+' 行，本次上限 '+cap()+' 行。','Source row numbers are shown below. '+state.selected.size+' rows selected; limit '+cap()+' per request.')+'</p>'+(count>shown.length?'<p class="doc-muted">'+t('表格共有 '+count+' 列；预览显示前 12 列及已映射列。可映射任意列，查询使用完整单元格内容。','The table has '+count+' columns. The preview shows the first 12 and any mapped columns. Any column can be mapped, and searches use complete cell values.')+'</p>':'')+'<div class="doc-actions">'+btn(t('选择本页','Select this page'),'select-page')+btn(t('清空行选择','Clear selection'),'clear-selection')+'</div><div class="doc-table-wrap" data-scroll-key="doc-table-'+generation+'-'+state.tableIndex+'-'+state.page+'" tabindex="0" role="region" aria-label="'+t('文件表格，可横向滚动','Document table; scroll horizontally')+'"><table class="doc-table"><thead><tr><th>'+t('选择','Select')+'</th><th>'+t('原表行号','Source row')+'</th>'+shown.map(i=>'<th>'+esc(name(i))+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:end-start},(_,n)=>{const i=start+n;return '<tr><td><label class="doc-row-select"><input id="doc-row-'+state.tableIndex+'-'+i+'" type="checkbox" data-doc-row="'+i+'" '+(state.selected.has(i)?'checked':'')+' aria-label="'+t('选择原表第 '+rowNumber(i)+' 行','Select source row '+rowNumber(i))+'"></label></td><th scope="row">'+rowNumber(i)+'</th>'+shown.map(c=>'<td><div>'+esc(cell(data[i],c))+'</div></td>').join('')+'</tr>';}).join('')+'</tbody></table></div>'+(total?'':'<p>'+t('当前表格没有可选择的数据行；请核对表头设置。','There are no selectable rows. Check the header setting.')+'</p>')+'<div class="doc-pagination">'+btn(t('上一页','Previous'),'prev',state.page===0?'disabled':'')+'<span>'+(state.page+1)+' / '+pages+'</span>'+btn(t('下一页','Next'),'next',state.page+1>=pages?'disabled':'')+'</div><div class="doc-actions">'+btn(t('填入单行，继续编辑','Fill one row for editing'),'use-row',state.selected.size!==1?'disabled':'')+btn(t('确认并查询选中行','Confirm and search selected rows'),'send-rows',!state.selected.size||state.sending?'disabled':'','primary')+'</div><p class="doc-muted">'+t('查询用于定位候选线索；不会生成归类、许可或合规放行结论。','Searches identify candidate references. They do not determine classification, licensing, or clearance.')+'</p></section>';
 }
 function render(props={}){
  if(props.lang)state.lang=props.lang==='en'?'en':'zh';if(props.regime){const regime=props.regime==='US'?'US':'CN';if(regime!==state.regime){dispatchGeneration++;state.sending=false;state.regime=regime;}}if(props.target)setTarget(props.target,false);
  const data=state.document;const pageCount=data?.metadata?.pageCount??data?.metadata?.pagesCount??(typeof data?.metadata?.pages==='number'?data.metadata.pages:null);const targetLabel=state.target==='products'?t('物项检索','Product search'):t('主体检索','Entity search');
  return '<div class="doc-workspace" data-doc-root><div class="page-heading"><div><h1>'+t('文件辅助','Document workspace')+'</h1><p>'+t('在本机提取文字与表格，核实内容后再送入查询。选择或读取文件不会自动查询。','Extract text and tables locally, then review the content before searching. Selecting or reading a file does not start a search.')+'</p></div></div><div class="doc-context">'+t('查询用途：','Search destination: ')+targetLabel+' · '+(state.regime==='CN'?t('中国制度','China module'):t('美国制度','U.S. module'))+'</div><label class="doc-field doc-target"><span>'+t('选择查询用途','Choose the search destination')+'</span><select id="doc-target-select" data-doc-field="target"><option value="products" '+(state.target==='products'?'selected':'')+'>'+t('物项检索','Item search')+'</option><option value="entities" '+(state.target==='entities'?'selected':'')+'>'+t('主体筛查','Party screening')+'</option></select></label><section class="doc-dropzone" aria-label="'+t('本地文件选择区','Local file selection')+'"><strong>'+t('拖放一个文件到此处，或选择文件','Drop one file here or select a file')+'</strong><p>TXT · CSV · XLSX · DOCX · PDF</p><input class="doc-file-input" id="doc-file" type="file" accept=".txt,.csv,.xlsx,.docx,.pdf" data-doc-file tabindex="-1" aria-label="'+t('选择本地文件','Select a local file')+'">'+btn(t(data?'替换当前文件':'选择文件',data?'Replace current file':'Choose a file'),'pick',state.loading?'disabled':'')+(state.fileName?btn(t('清除文件及全部内容','Clear file and all content'),'clear'):'')+'<p class="doc-muted">'+t('只保留当前文件会话，不上传文件，也不写入浏览器持久存储。','Only the current file session is retained. Files are not uploaded or written to persistent browser storage.')+'</p></section>'+(state.loading?'<p class="doc-notice" role="status">'+t('正在本机读取文件…','Reading the file locally…')+'</p>':'')+(state.notice?'<p class="doc-notice '+state.notice.kind+'" role="status">'+esc(local(state.notice.message))+'</p>':'')+(data?'<section class="doc-card"><h2>'+t('已读取的内容','Extracted content')+'</h2><dl class="doc-metadata"><div><dt>'+t('文件','File')+'</dt><dd>'+esc(state.fileName)+'</dd></div><div><dt>'+t('格式','Format')+'</dt><dd>'+esc(String(data.format||'').toUpperCase())+'</dd></div><div><dt>'+t('提取字符','Extracted characters')+'</dt><dd>'+data.text.length+'</dd></div><div><dt>'+t('表格','Tables')+'</dt><dd>'+data.tables.length+'</dd></div>'+(pageCount!==null?'<div><dt>'+t('页数','Pages')+'</dt><dd>'+esc(pageCount)+'</dd></div>':'')+'</dl>'+(!data.text.trim()?'<p class="doc-notice">'+t('未提取到可用文字。图像型页面可能需要文字识别；请检查原文件和解析提示，不要把空结果视为没有相关内容。','No usable text was extracted. Image-based pages may require OCR. Review the source file and parser notices; empty output does not establish that relevant content is absent.')+'</p>':'')+(data.warnings||[]).map(w=>'<p class="doc-notice">'+esc(local(w.message))+'</p>').join('')+'<label class="doc-field" for="doc-extracted"><span>'+t('提取文本（可编辑）','Extracted text (editable)')+'</span><textarea id="doc-extracted" data-doc-field="text" rows="9" spellcheck="false">'+esc(state.text)+'</textarea><small>'+t('保留原文及单位。选中需要的摘录后，使用下方按钮填入查询字段。','Preserve wording and units. Select an excerpt, then use the button below to fill the search field.')+'</small></label><div class="doc-actions">'+btn(t('使用选中文字','Use selected text'),'use-selection')+'</div>'+(data.sections.length?'<div class="doc-controls"><label class="doc-field"><span>'+t('按文档分段重新载入','Reload a document section')+'</span><select id="doc-section-select" data-doc-field="section"><option value="all">'+t('全部原始提取文本','All original extracted text')+'</option>'+data.sections.map((s,i)=>'<option value="'+i+'" '+(state.section===String(i)?'selected':'')+'>'+esc(local(s.label)||t('分段 '+(i+1),'Section '+(i+1)))+'</option>').join('')+'</select></label>'+btn(t('载入所选分段','Load selected section'),'use-section')+'</div><p class="doc-muted">'+t('载入分段会替换上方文本框中的编辑内容，不改变原文件。','Loading a section replaces edits in the text area above; it does not change the original file.')+'</p>':'')+'</section>'+tableView()+'<section class="doc-card"><h2>'+t('核实并编辑查询字段','Review and edit search fields')+'</h2><p class="doc-muted">'+t('仅下列字段会送入查询。超长内容必须由你选择摘录或编辑，系统不会静默截断。','Only the fields below are passed to search. Select or edit an excerpt when a value is too long; the system does not silently truncate it.')+'</p>'+(state.target==='products'?field('query',t('物项名称／描述／管制编号','Item name / description / control code'),4)+field('spec',t('补充规格及单位（可选）','Specifications and units (optional)'),3):field('name',t('主体名称','Entity name'))+field('address',t('地址（可选）','Address (optional)'))+field('identifier',t('识别号（可选）','Identifier (optional)')))+'<div class="doc-actions">'+btn(t('确认并查询','Confirm and search'),'send-text',state.sending?'disabled':'','primary')+'</div></section>':'')+'</div>';
 }
 function inside(event){return event.target?.closest?.('[data-doc-root]');}
 function updateCounter(key){const el=doc?.getElementById?.('doc-'+key+'-count');if(el){el.textContent=state.draft[key].length+' / '+LIMITS[key]+' '+t('字符','characters');el.classList?.toggle('over-limit',state.draft[key].length>LIMITS[key]);}}
 function attach(){if(attached||!doc?.addEventListener)return;attached=true;
  doc.addEventListener('click',event=>{if(!inside(event))return;const el=event.target.closest('[data-doc-action]');if(!el)return;const action=el.dataset.docAction;
   if(action==='pick')doc.getElementById('doc-file')?.click();if(action==='clear')clear();if(action==='use-selection'){const area=doc.getElementById('doc-extracted');if(area)useSelection(area.value.slice(area.selectionStart,area.selectionEnd));}if(action==='use-section')useSection();if(action==='use-row')useRow();if(action==='send-text')sendText();if(action==='send-rows')sendRows();if(action==='clear-selection')selectRows([]);if(action==='select-page'){const from=startRow()+state.page*50;selectRows(Array.from({length:Math.min(50,Math.max(0,rows().length-from))},(_,i)=>from+i),'add');}if(action==='prev'||action==='next'){state.page=Math.max(0,state.page+(action==='next'?1:-1));refresh();}
  });
  doc.addEventListener('input',event=>{if(!inside(event))return;const field=event.target.dataset.docField;if(field==='text'){if(!setText(event.target.value))event.target.value=state.text;}else if(Object.prototype.hasOwnProperty.call(state.draft,field)){setDraft({[field]:event.target.value});updateCounter(field);}});
  doc.addEventListener('change',event=>{if(!inside(event))return;const el=event.target;if(el.hasAttribute?.('data-doc-file')){const files=el.files||[];if(files.length===1)loadFile(files[0]);else if(files.length>1)notify('一次只可读取一个文件。','Read one file at a time.','error');return;}if(el.dataset.docColumn)setColumns({[el.dataset.docColumn]:el.value===''?'':el.dataset.docColumnOneBased==='true'?Number(el.value)-1:el.value});if(el.dataset.docRow!==undefined)selectRows([el.dataset.docRow],el.checked?'add':'remove');if(el.dataset.docField==='target')setTarget(el.value);if(el.dataset.docField==='table')setTable(el.value);if(el.dataset.docField==='header')setHeader(el.checked);if(el.dataset.docField==='section')state.section=el.value;});
  doc.addEventListener('dragover',event=>{if(inside(event)){event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';}});
  doc.addEventListener('drop',event=>{if(!inside(event))return;event.preventDefault();const files=event.dataTransfer?.files||[];if(files.length!==1){notify('请一次拖入一个文件。','Drop exactly one file at a time.','error');return;}loadFile(files[0]);});
 }
 function configure(value={}){callbacks={...callbacks,...value};attach();return api;}
 function getState(){return {lang:state.lang,regime:state.regime,target:state.target,fileName:state.fileName,text:state.text,loading:state.loading,sending:state.sending,hasDocument:!!state.document,tableIndex:state.tableIndex,header:state.header,columns:{...state.columns},selectedRows:[...state.selected],draft:{...state.draft},notice:state.notice};}
 const api={configure,render,loadFile,clear,setDraft,setText,setTarget,setTable,setHeader,setColumns,selectRows,useSelection,useRow,sendText,sendRows,getState};return api;
}
const api=create();api.create=create;api.limits=Object.freeze({...LIMITS});api.version='0.4.0';return api;
});

;
/* CNECCS application — no external requests for search; bilingual, jurisdiction-separated. */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const escape = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={search:'M21 21l-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',sliders:'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6',book:'M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H3V3h1m9 3a3 3 0 0 1 3-3h6v16h-5a4 4 0 0 0-4 2',help:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h0M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',shield:'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4m-4 10 3 3 5-6',arrow:'M4 12h16m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',back:'M20 12H4m6-6-6 6 6 6',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',info:'M12 8h0m0 4v5M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',globe:'M22 12H2m10-10c6 6 6 14 0 20-6-6-6-14 0-20M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',layers:'m12 2 10 5-10 5L2 7l10-5M2 12l10 5 10-5M2 17l10 5 10-5',file:'M14 2H4v20h16V8l-6-6v6h6M8 12h8m-8 4h8',external:'M14 3h7v7m0-7L10 14m0-11H3v18h18v-7',download:'M12 3v12m-5-5 5 5 5-5M3 17v4h18v-4',print:'M6 9V2h12v7M6 18H3V9h18v9h-3M6 14h12v8H6z',menu:'M3 6h18M3 12h18M3 18h18',clock:'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',lock:'M5 10h14v12H5V10m3 0V6a4 4 0 0 1 8 0v4',wifi:'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0m-3 4h0',cube:'m12 2 9 5v10l-9 5-9-5V7l9-5M3 7l9 5 9-5m-9 5v10',tool:'M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-4 3-3-3 3-4',plane:'m22 2-7 20-4-9-9-4 20-7M11 13 22 2',sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',flask:'M9 2h6m-5 0v7L3 20v2h18v-2L14 9V2M7 15h10',copy:'M9 9h12v13H9V9M15 9V2H2v13h7'};
function icon(name,size=18){return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.file)+'"/></svg>';}
const state={lang:window.CNECCSStartup?.getLanguage?.()==='en'?'en':'zh',regime:'CN',page:'search',query:'',spec:'',showSpec:false,searched:false,filters:{category:'all',kind:'all',direction:'all'},offset:0,result:null,scenario:null,answers:{},fiberInput:{},fiberCalculation:null,evaluation:null,menu:false,detail:null,detailTab:'overview'};
let corpus={metadata:{},records:[]},engine=null,ready=false,loadError='',returnFocus=null,toastTimer;
let sourcePageOperation=0,sourcePagesPromise=null,detailOperation=0,detailError=false;
const regimeEngines=new Map(),regimeLoads=new Map(),regimeErrors=new Map(),detailRecords=new Map();
let activeRegime=state.regime;
let pendingSearch=null,loadPromise=null,searchError=null,searchErrorKey=null;
// A slow-preparation notice never expires a submitted query or stops background loading.
const QUERY_SLOW_NOTICE_MS=12500;
let pendingTimer=null,pendingNoticeAt=0,pendingSlow=false,pendingGeneration=0,brandEnabled=false;
const monotonicNow=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
function cancelPendingSearch(){pendingSearch=null;pendingNoticeAt=0;pendingSlow=false;pendingGeneration++;if(pendingTimer!==null){clearTimeout(pendingTimer);pendingTimer=null;}}
function slowPreparationMessage(){return t('资料准备时间较长，仍在继续载入；完成后会自动检索，无须重复点击。','Reference preparation is taking longer than usual and is still in progress. Your search will run automatically when it is ready; there is no need to click again.');}
function updatePendingNotice(){if(!pendingSearch||pendingSlow||!pendingNoticeAt||monotonicNow()<pendingNoticeAt)return false;if(!pendingSearchMatches()){cancelPendingSearch();return false;}pendingSlow=true;if(pendingTimer!==null){clearTimeout(pendingTimer);pendingTimer=null;}refreshSearchStatus();return true;}
function armPendingSearch(){const key=pendingSearchKey();if(pendingSearch===key)return;cancelPendingSearch();pendingSearch=key;pendingNoticeAt=monotonicNow()+QUERY_SLOW_NOTICE_MS;const generation=pendingGeneration;const notifySlow=()=>{if(generation!==pendingGeneration)return;if(monotonicNow()<pendingNoticeAt){pendingTimer=setTimeout(notifySlow,pendingNoticeAt-monotonicNow());pendingTimer?.unref?.();return;}updatePendingNotice();};pendingTimer=setTimeout(notifySlow,QUERY_SLOW_NOTICE_MS);pendingTimer?.unref?.();}
function brandContent(){return !splitLoading()||brandEnabled?'<img data-brand-logo src="assets/logo.png" alt="CNECCS" decoding="async" fetchpriority="low">':'<span class="brand-wordmark" style="font-size:26px;letter-spacing:.04em;font-weight:750;color:var(--ink)">CNECCS</span>';}
function updateBrandLogo(){if(brandEnabled||!splitLoading())return;const transitionDone=!window.CNECCSStartup||window.CNECCSStartup.isComplete?.();const settled=['CN','US'].every(regime=>regimeEngines.has(regime)||regimeErrors.has(regime));if(!transitionDone||!settled||!regimeEngines.size)return;brandEnabled=true;const brand=$('.brand');if(brand)brand.innerHTML=brandContent();}
function setLanguage(lang){if(!['zh','en'].includes(lang))return;window.CNECCSStartup?.setLanguage?.(lang);if(state.lang===lang)return;sourcePageOperation++;state.lang=lang;if(state.detailTab==='pages'&&lang==='en')state.detailTab='source';render();if(state.detail){state.detailLang=lang;renderDetail();}}

const mobileNavigation=typeof window.matchMedia==='function'?window.matchMedia('(max-width: 900px)'):null;
const isMobileNavigation=()=>Boolean(mobileNavigation?.matches);
function syncNavigationAccess(){const mobile=isMobileNavigation(),sidebar=document.getElementById('main-sidebar'),workspace=$('.workspace');if(sidebar)sidebar.inert=mobile&&!state.menu;if(workspace)workspace.inert=mobile&&state.menu;document.body.style.overflow=state.detail||$('#overlay-root .overlay')||(mobile&&state.menu)?'hidden':'';}
function toggleMenu(open=!state.menu){state.menu=Boolean(open);render();if(state.menu)$('.sidebar-close')?.focus({preventScroll:true});else document.getElementById('menu-toggle')?.focus({preventScroll:true});}
mobileNavigation?.addEventListener?.('change',()=>{state.menu=false;render();});
function t(zh,en){return state.lang==='zh'?zh:en;}
function L(o,lang=state.lang){if(o==null)return '';if(typeof o==='string'||typeof o==='number')return String(o);return o[lang]||o.zh||o.en||'';}
function safeURL(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}}
function button(label,action,cls='secondary',attrs='',ic=''){return '<button type="button" class="'+cls+'" data-action="'+action+'" '+attrs+'>'+ (ic?icon(ic,16):'')+label+'</button>';}
function languageSwitch(){return '<div class="language-switch" role="group" aria-label="'+t('语言选择','Language')+'">'+button('中文','lang',state.lang==='zh'?'selected':'','data-value="zh" aria-pressed="'+(state.lang==='zh')+'"')+'<span class="language-divider" aria-hidden="true">|</span>'+button('EN','lang',state.lang==='en'?'selected':'','data-value="en" aria-pressed="'+(state.lang==='en')+'"')+'</div>';}
function count(regime,kind){return corpus.records.filter(r=>r.regime===regime&&(!kind||r.kind===kind)).length;}
const navs=[['search','search','物项检索','Item search'],['entities','shield','主体筛查','Party screening'],['documents','file','文件辅助','File assistance'],['check','sliders','条件核对','Criteria checks'],['guide','help','使用指南','How to use']];
const categories={CN:['其他物项','材料、化学品与生物','材料加工','电子','计算机','电信与信息安全','传感器与激光器','导航与航空电子','船舶','航空航天与推进'],US:['核材料与其他物项','材料、化学品与生物','材料加工','电子','计算机','电信与信息安全','传感器与激光器','导航与航空电子','船舶','航空航天与推进']};
const categoriesEN=['Nuclear & miscellaneous','Materials, chemicals & biological','Materials processing','Electronics','Computers','Telecommunications & information security','Sensors & lasers','Navigation & avionics','Marine','Aerospace & propulsion'];
function categoryLabel(c){if(!/^\d$/.test(String(c)))return t('通则与其他','General & other');return c+' · '+(state.lang==='zh'?categories[state.regime][Number(c)]:(state.regime==='CN'&&Number(c)===0?'Other items':categoriesEN[Number(c)]));}
function displayCode(r){const code=r.code||r.id;return state.lang==='en'?code.replace(/进/g,'IMP').replace(/出/g,'EXP'):code;}
function sourceLabel(source){const labels={
'中华人民共和国两用物项出口管制清单':['中华人民共和国两用物项出口管制清单','China Dual-Use Items Export Control List'],
'两用物项和技术进出口许可证管理目录（2026）':['两用物项和技术进出口许可证管理目录（2026）','Dual-Use Import and Export Licensing Catalog (2026)'],
'15 CFR Part 774 — The Commerce Control List':['美国《出口管理条例》第774部分商业管制清单','15 CFR Part 774 — The Commerce Control List'],
'Workbook editorial guidance':['编纂说明','Editorial guidance'],
'Bilingual terminology':['术语说明','Terminology'],
'Workbook source review':['来源核查记录','Source review notes']};const v=labels[source.title];return v?t(v[0],v[1]):L(source.title);}
function sourceLocator(source){const labels={'01制度与来源_Scope':['制度与来源','Scope and sources'],'02术语_Terms':['术语','Terms'],'CN_ZH_01综合检索':['中国目录索引','China catalog index'],'CN_ZH_03清单全文':['中国清单全文','China control list text'],'CN_ZH_06规则术语':['中国规则与术语','China rules and terms'],'CN_ZH_07关系答疑':['中国编纂问答','China editorial guidance'],'US_EN_01 Search':['美国条目索引','U.S. entry index'],'US_ZH_03通则附件':['美国通则与附件','U.S. general rules and supplements'],'US_ZH_06规则答疑':['美国编纂问答','U.S. editorial guidance']};const v=labels[source.sheet];return (v?t(v[0],v[1]):t('来源记录','Source record'))+' · '+t('第 '+source.row+' 行','row '+source.row);}
function localizedTerms(terms){return (terms||[]).filter(x=>state.lang==='en'?!/[\u3400-\u9fff]/.test(x):/[\u3400-\u9fff]/.test(x)||/^(?:[0-9A-Z .-]+|Wi-Fi|WiFi|g\/cm³|µm|μm)$/.test(x));}
function kindLabel(k){return ({control:t('管制清单','Control list'),catalog:t('许可目录','Licensing catalog'),rule:t('通则／说明','Rules & notes'),term:t('定义／术语','Definitions')})[k]||t('参考资料','Reference');}
function regimeTabs(){return '<div class="regime-tabs" role="group" aria-label="'+t('选择管制制度','Choose a legal regime')+'">'+['CN','US'].map(x=>'<button class="regime-tab '+(state.regime===x?'active':'')+'" aria-pressed="'+(state.regime===x)+'" data-action="regime" data-value="'+x+'"><span class="country-mark">'+x+'</span>'+ (x==='CN'?t('中国出口管制','China controls'):t('美国出口管制','U.S. controls'))+'</button>').join('')+'</div>';}
function footer(){return '<footer class="footer"><span>© 2026 CNECCS · '+t('出口管制合规查询','Export control compliance')+'</span><span>'+button(t('免责声明','Disclaimer'),'nav','','data-page="disclaimer"')+'</span></footer>';}
function render(){syncActiveEngine();if(pendingSearch&&!pendingSearchMatches())cancelPendingSearch();if(searchError&&(state.page!=='search'||searchErrorKey!==pendingSearchKey()))searchError=null;const view=$('#main');const scrollPositions=view?.dataset?.view===state.page?[...document.querySelectorAll('#app [data-scroll-key]')].map(el=>({key:el.dataset.scrollKey,left:el.scrollLeft,top:el.scrollTop})):[];const prior=document.activeElement;const focusId=prior&&prior.id;const selStart=prior&&prior.selectionStart;const selEnd=prior&&prior.selectionEnd;document.documentElement.lang=state.lang==='zh'?'zh-CN':'en';const skip=$('.skip-link');if(skip)skip.textContent=t('跳至主要内容','Skip to content');document.title='CNECCS · '+t('出口管制筛查','Export control screening');$('#app').innerHTML='<div class="shell '+(state.menu?'menu-open':'')+'"><button class="mobile-scrim" tabindex="-1" data-action="menu" aria-label="'+t('关闭菜单','Close menu')+'"></button><aside id="main-sidebar" class="sidebar" aria-label="'+t('主导航菜单','Main navigation menu')+'" '+(state.menu&&isMobileNavigation()?'role="dialog" aria-modal="true"':'')+'><button class="brand lang-'+state.lang+'" data-action="home" aria-label="CNECCS '+t('首页','Home')+'">'+brandContent()+'</button><div class="nav-caption"><span>'+t('查询工作台','WORKSPACE')+'</span>'+button(icon('close',20),'menu','icon-button sidebar-close','aria-label="'+t('关闭菜单','Close menu')+'"')+'</div><nav class="nav" aria-label="'+t('主导航','Main navigation')+'">'+navs.map(n=>'<button data-action="nav" data-page="'+n[0]+'" class="'+(state.page===n[0]?'active':'')+'" '+(state.page===n[0]?'aria-current="page"':'')+'>'+icon(n[1])+t(n[2],n[3])+'</button>').join('')+'</nav><div class="sidebar-bottom"><div class="sidebar-foot"><span>cneccs.com</span>'+button(t('免责声明','Disclaimer'),'nav','','data-page="disclaimer"')+'</div></div></aside><div class="workspace"><header class="topbar"><div class="topbar-title">'+button(icon('menu'),'menu','mobile-menu','id="menu-toggle" aria-controls="main-sidebar" aria-expanded="'+Boolean(state.menu&&isMobileNavigation())+'" aria-label="'+t('打开菜单','Open menu')+'"')+'<span class="mobile-brand">CNECCS</span>'+icon('layers',17)+'<span>'+t('出口管制筛查','Export control screening')+'</span><span>/ '+L({zh:navs.find(n=>n[0]===state.page)?.[2]||'免责声明',en:navs.find(n=>n[0]===state.page)?.[3]||'Disclaimer'})+'</span></div><div class="toolbar">'+languageSwitch()+'</div></header><main id="main" class="main" tabindex="-1" data-view="'+state.page+'">'+renderPage()+footer()+'</main></div></div>';syncNavigationAccess();for(const el of document.querySelectorAll('#app [data-scroll-key]')){const saved=scrollPositions.find(x=>x.key===el.dataset.scrollKey);if(saved){el.scrollLeft=saved.left;el.scrollTop=saved.top;}}if(focusId&&document.getElementById(focusId)){const el=document.getElementById(focusId);el.focus({preventScroll:true});if(typeof selStart==='number'&&el.setSelectionRange)try{el.setSelectionRange(selStart,typeof selEnd==='number'?selEnd:selStart);}catch{}}}
function renderPage(){if(state.page==='entities')return window.CNECCSEntityUI.render({lang:state.lang,regime:state.regime});if(state.page==='documents'){const target=state.documentsTarget;state.documentsTarget=undefined;return window.CNECCSDocumentUI.render({lang:state.lang,regime:state.regime,...(target?{target}:{})});}if(state.page==='check')return checkPage();if(state.page==='guide')return guidePage();if(state.page==='disclaimer')return disclaimerPage();return searchPage();}
function searchPage(){return '<section class="hero"><div><div class="eyebrow">'+t('跨境合规 · 有据可查','Cross-border compliance, made clear')+'</div><h1>'+t('从产品描述，<br><em>找到管制线索。</em>','Describe your product.<br><em>Find the relevant controls.</em>')+'</h1><p>'+t('输入名称、功能或基本规格，查找中美管制条目。<br>跟随关键问题补充信息，让每一步都有依据。','Search Chinese and U.S. controls by product, function, or specification.<br>Follow focused questions and see the source behind every step.')+'</p></div><div class="workflow">'+[[t('选择管制制度','Choose a regime'),t('中国与美国，分别判断','China and U.S. rules stay separate')],[t('描述你的物项','Describe your item'),t('名称、编号、功能或规格','Name, code, function, or specification')],[t('核对条件与依据','Check criteria and sources'),t('知道还缺什么，下一步做什么','See what is missing and what comes next')]].map((x,i)=>'<div class="workflow-step"><span class="step-circle">0'+(i+1)+'</span><div><strong>'+x[0]+'</strong><small>'+x[1]+'</small></div></div>').join('')+'</div></section><section class="search-panel" aria-label="'+t('检索','Search')+'"><div class="regime-bar"><span class="regime-label">'+t('适用制度','Regime')+'</span>'+regimeTabs()+button(icon('help',14)+t('不确定选哪个？','Not sure?'),'jurisdiction','regime-help')+'</div><form id="search-form"><div class="search-body"><label class="field-label" for="query">'+t('你想查询什么产品或物项？','What product or item would you like to screen?')+'</label><div class="search-entry">'+icon('search',21)+'<textarea id="query" maxlength="1500" rows="2" placeholder="'+t('输入物项名称、主要功能、关键规格及单位，或输入管制编号、CAS 号','Enter the item name, main function, specifications and units, or a control code or CAS number')+'">'+escape(state.query)+'</textarea></div>'+(state.showSpec?'<div class="spec-area"><label class="field-label" for="spec">'+t('补充已知规格（可选）','Additional specifications (optional)')+'</label><input id="spec" maxlength="1000" value="'+escape(state.spec)+'" placeholder="'+t('精度、功率、频率、材料成分及其他已知规格；请保留单位','Accuracy, power, frequency, or composition; include units')+'"></div>':'')+'<div class="search-actions">'+button(icon(state.showSpec?'close':'plus',15)+t(state.showSpec?'收起规格输入':'补充基本规格',state.showSpec?'Hide specifications':'Add specifications'),'spec','quiet-button')+button(t('从规格书或 BOM 提取','Extract from a specification or BOM'),'open-documents','quiet-button')+'<button class="primary" type="submit" data-action="search" aria-describedby="query-status">'+icon('search',17)+t('开始检索','Search controls')+icon('arrow',16)+'</button></div></div></form><div class="search-foot"><span>'+icon('shield',14)+t('查询在浏览器内处理，不上传产品描述','Search runs in your browser; product descriptions are not uploaded')+'</span><span id="query-status" class="search-status" role="status" aria-live="polite" aria-atomic="true">'+searchStatusContent()+'</span></div></section><div id="search-feedback">'+renderSearchFeedback()+'</div>'+((pendingSearch||searchError)?'':state.productBatch?renderProductBatch():state.searched?renderResults():'<section class="intro-bottom">'+feature('sliders',t('不确定技术条件？','Unsure about technical criteria?'),t('从常见场景开始，逐项核对关键参数。','Start with a common scenario and check the relevant facts.'),'check')+feature('book',t('已经知道管制编号？','Already know the control code?'),t('直接输入编号，查看完整条文及关联资料。','Enter it directly to review the provision and related material.'),'search')+feature('help',t('第一次使用 CNECCS？','New to CNECCS?'),t('了解输入方式、检索结果和条件核对流程。','Learn how to enter information, read results, and check criteria.'),'guide')+'</section><div class="scope-note">'+icon('info',14)+'<span>'+t('本工具提供条目定位和条件初筛。搜索命中、未命中或完成局部条件核对，均不直接构成归类、免许可或可出口结论。','This tool supports item screening and preliminary criteria checks. A match, no match, or a completed limited check does not establish classification, license eligibility, or export clearance.')+'</span></div>');}
function feature(ic,title,desc,page){return '<button class="feature-card" data-action="nav" data-page="'+page+'"><span class="feature-icon">'+icon(ic,20)+'</span><span><strong>'+title+'</strong><p>'+desc+'</p></span></button>';}
function getQuery(){return [state.query,state.showSpec?state.spec:''].filter(Boolean).join(' ');}
function pendingSearchKey(){return JSON.stringify([state.regime,getQuery(),state.filters,state.offset]);}
function pendingSearchMatches(){return state.page==='search'&&pendingSearch===pendingSearchKey();}
function searchStatusContent(){
 if(loadError)return icon('info',14)+'<span>'+escape(L(loadError))+'</span>'+button(t('重试','Retry'),'retry-corpus','text-button');
 if(ready)return t('支持中英混输 · 编号 · CAS · 同义词','Bilingual input · Codes · CAS · Synonyms');
 return '<span class="loading-dot" aria-hidden="true"></span><span>'+(pendingSlow?slowPreparationMessage():t(pendingSearch?'已收到查询，资料准备好后会自动检索。':'正在准备检索资料，你可以先输入查询内容。',pendingSearch?'Your search will run as soon as the reference data is ready.':'Preparing reference data. You can enter your query now.'))+'</span>';
}
function renderSearchFeedback(){
 if(!pendingSearch&&!searchError)return '';
 const error=searchError||loadError;
 return '<section class="results-area search-feedback-card" id="results" aria-busy="'+(!error)+'" role="status" aria-live="polite"><div class="search-feedback-icon">'+(error?icon('info',24):'<span class="search-spinner" aria-hidden="true"></span>')+'</div><div><h2>'+t(error?'暂时无法完成检索':'正在准备检索结果',error?'Unable to complete this search':'Preparing your search')+'</h2><p>'+escape(error?L(error):pendingSlow?slowPreparationMessage():t('已收到你的查询。资料准备完成后，结果会显示在这里，无须重复点击。','Your query has been received. Results will appear here when the reference data is ready; you do not need to click again.'))+'</p>'+(error?button(t('重新尝试','Try again'),searchError?'search':'retry-corpus','secondary'):'')+'</div></section>';
}
function refreshSearchStatus(){const el=$('#query-status'),feedback=$('#search-feedback');if(el)el.innerHTML=searchStatusContent();if(feedback)feedback.innerHTML=renderSearchFeedback();if(!el&&state.page==='search')render();}
function invalidatePendingSearch(){let changed=false;if(pendingSearch&&!pendingSearchMatches()){cancelPendingSearch();changed=true;}if(searchError){searchError=null;changed=true;}if(changed)refreshSearchStatus();}
function submitItemSearch(){state.query=$('#query')?.value??state.query;state.spec=$('#spec')?.value??state.spec;state.offset=0;doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth',block:'start'});}
function doSearch(){
 syncActiveEngine();searchError=null;
 if(!engine||!ready){state.result=null;state.searched=false;armPendingSearch();if(splitLoading()||loadError)boot(Boolean(loadError));return false;}
 cancelPendingSearch();state.productBatch=null;
 try{state.result=engine.search(getQuery(),{regime:state.regime,...state.filters,offset:state.offset,limit:12});state.searched=true;return true;}
 catch(error){state.result=null;state.searched=false;searchErrorKey=pendingSearchKey();searchError={zh:'这次查询未能完成，已保留你的输入。请重新尝试；如果仍失败，可简化描述或改用编号查询。',en:'This search could not be completed. Your input is preserved. Try again, or simplify the description or use a control code if the problem continues.'};return false;}
}
function renderResults(){if(!state.result)return '';const r=state.result;const scenario=window.CNECCSRules?.detectScenario(getQuery(),state.regime);const interp=r.interpretation||{};const expansions=(interp.expanded||[]).map(x=>{const terms=localizedTerms(x.terms).slice(0,3);return terms.length?terms.join(' / '):t('已进行跨语言同义词检索','Cross-language synonyms applied');}).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4);const corrections=(interp.corrections||[]).map(x=>x.input+' → '+x.suggested);return '<section class="results-area" id="results" aria-live="polite"><div class="results-header"><div><div class="eyebrow">'+t('检索结果','Search results')+'</div><h2>'+t('找到 '+r.total+' 个相关条目',r.total+' relevant '+(r.total===1?'entry':'entries'))+'</h2><p>'+t(state.regime==='CN'?'中国制度范围内的检索结果':'美国制度范围内的检索结果',state.regime==='CN'?'Results within the China module':'Results within the U.S. module')+' · '+t('相关性排序，需继续核实条件','Ranked by relevance; criteria still require verification')+'</p></div>'+button(t('重置筛选','Reset filters'),'reset-filters','secondary')+'</div>'+(expansions.length||corrections.length||interp.specs?.length?'<div class="query-interpretation">'+icon('search',15)+' <strong>'+t('检索理解','Search interpretation')+'</strong> · '+escape([...(expansions.length?[t('已扩展相关术语：','Related terms: ')+expansions.join(' / ')]:[]),...(corrections.length?[t('拼写建议：','Spelling suggestion: ')+corrections.join(', ')]:[]),...(interp.specs?.length?[t('已识别规格，数值仍需在条件核对中验证','Specifications recognized; numerical criteria require guided verification')]:[])].join(' · '))+'</div>':'')+([...((interp.warnings)||[]),...(interp.rankingNote?[interp.rankingNote]:[])].map(w=>'<div class="query-interpretation">'+icon('info',15)+' '+escape(L(w))+'</div>').join(''))+'<div class="filters">'+filterSelect('category',[["all",t('所有技术类别','All technical categories')],...categoriesEN.map((_,i)=>[String(i),categoryLabel(i)]),['general',t('通则与其他','General & other')]])+filterSelect('kind',[['all',t('所有资料类型','All reference types')],['control',kindLabel('control')],['catalog',kindLabel('catalog')],['rule',kindLabel('rule')],['term',kindLabel('term')]])+(state.regime==='CN'?filterSelect('direction',[['all',t('进出口方向：全部','Direction: all')],['export',t('仅出口条目','Export entries')],['import',t('仅进口目录','Import catalog')],['general',t('一般规则','General rules')]]):'')+'</div><div class="result-layout"><div>'+ (r.results.length?'<div class="result-list">'+r.results.map(resultCard).join('')+'</div>'+pagination(r.total):'<div class="empty-state">'+icon('search',32)+'<h3>'+t('暂未找到相关条目','No relevant entries found')+'</h3><p>'+t('这不代表物项不受管制。尝试产品功能、材料或部件名称，减少限定条件，或使用管制编号／CAS 号。清单外规则也可能需要另外核查。','This does not mean the item is uncontrolled. Try its function, material, or component name; remove filters; or use a control code or CAS number. Other controls may require separate review.')+'</p>'+button(t('查看查询方法','View search tips'),'nav','secondary','data-page="guide"')+'</div>')+'</div><aside class="result-aside">'+icon('sliders',24)+'<h3>'+t('找到线索，继续核实','Found a lead? Check the facts.')+'</h3><p>'+t('产品名称相似不等于满足管制条件。请结合性能、用途和排除条款继续确认。','A similar product name does not establish that a control applies. Review specifications, uses, and exclusions.')+'</p>'+button(scenario?t('进入相关场景核对','Check this scenario'):t('选择核对场景','Choose a scenario'),scenario?'scenario':'nav','secondary',scenario?'data-value="'+escape(scenario.id)+'"':'data-page="check"','arrow')+'<hr><h3>'+t('结果怎么看？','How to read results')+'</h3><p>'+t('先看匹配原因，再核对完整条目。原文、参考译文和资料位置可在详情中展开。','Start with the match reason, then review the complete entry. Original text, translations, and source locations are available in the details.')+'</p>'+button(t('查看使用方法','How to use'),'nav','text-button','data-page="guide"','help')+'</aside></div></section>';}
function filterSelect(field,options){return '<select id="filter-'+field+'" aria-label="'+escape(t({category:'技术类别',kind:'资料类型',direction:'进出口方向'}[field],{category:'Technical category',kind:'Reference type',direction:'Direction'}[field]))+'" data-filter="'+field+'">'+options.map(x=>'<option value="'+x[0]+'" '+(state.filters[field]===x[0]?'selected':'')+'>'+escape(x[1])+'</option>').join('')+'</select>';}
function resultCard(result){const r=result.record;const exact=['code-exact','cas-exact'].includes(result.matchType);const reasonLabels={'code-exact':t('编号精确匹配','Exact code match'),'cas-exact':t('CAS 精确匹配','Exact CAS match'),'hs-clue':t('HS 线索，需核实归类','HS clue; classification requires review'),'code-reference':t('正文引用该编号','Code referenced in the text'),'code-parent':t('对应上级条目','Parent provision'),'synonym':t('同义词／功能关联','Synonym or function match'),'typo':t('近似拼写匹配','Approximate spelling'),'title':t('名称／标题相关','Title match'),'text':t('正文相关','Text match'),'browse':t('资料浏览','Reference browsing')};const snippet=L(result.snippet)||L(r.summary);return '<article class="result-card"><div class="result-top"><span class="code">'+escape(displayCode(r))+'</span><span class="pill">'+escape(kindLabel(r.kind))+'</span>'+(r.entryStatus&&/ITAR/i.test(L(r.entryStatus,'en'))?'<span class="pill">'+escape(L(r.entryStatus))+'</span>':'')+(r.direction==='import'?'<span class="pill">'+t('进口目录','Import catalog')+'</span>':'')+(exact?'<span class="pill exact">'+escape(reasonLabels[result.matchType])+'</span>':'')+'</div><h3>'+escape(L(r.title))+'</h3><p class="result-snippet">'+escape(snippet.length>300?snippet.slice(0,300)+'…':snippet)+'</p><div class="result-bottom"><span class="match-reason">'+escape(reasonLabels[result.matchType]||t('相关候选','Related candidate'))+(localizedTerms(result.matchedTerms).length?' · '+escape(localizedTerms(result.matchedTerms).slice(0,3).join(' / ')):'')+'</span>'+button(t('查看条目','View entry'),'detail','text-button','data-id="'+escape(r.id)+'"','arrow')+'</div></article>';}
function pagination(total){if(total<=12)return '';return '<div class="pagination">'+(state.offset>0?button(t('上一页','Previous'),'page','','data-value="'+Math.max(0,state.offset-12)+'"'):'')+'<span>'+ (Math.floor(state.offset/12)+1)+' / '+Math.ceil(total/12)+'</span>'+(state.offset+12<total?button(t('下一页','Next'),'page','','data-value="'+(state.offset+12)+'"'):'')+'</div>';}
function checkPage(){if(!window.CNECCSRules)return '<p>'+t('条件核对模块载入中。','Loading criteria checks.')+'</p>';if(state.scenario)return scenarioPage();const icons=['wifi','cube','tool','plane','sun','flask'];return '<div class="page-heading"><div><div class="eyebrow">'+t('引导式条件核对','Guided criteria checks')+'</div><h1>'+t('把关键条件，一项项弄清楚。','Work through the facts that matter.')+'</h1><p>'+t('选择最接近的场景，补充已知参数。不确定的信息可以留待核实；系统会说明下一步需要什么。','Choose the closest scenario and provide the facts you know. Unknowns can remain open; the system will explain what is needed next.')+'</p></div>'+regimeTabs()+'</div><div class="scenario-grid">'+window.CNECCSRules.scenarios.filter(s=>!s.regimes||s.regimes.includes(state.regime)).map((s,i)=>'<button class="scenario-card" data-action="scenario" data-value="'+escape(s.id)+'"><span class="feature-icon">'+icon(icons[i]||'sliders',22)+'</span><h3>'+escape(L(s.title))+'</h3><p>'+escape(L(s.description))+'</p><span class="text-button">'+t('开始核对','Start a check')+' '+icon('arrow',15)+'</span></button>').join('')+'</div><div class="notice">'+icon('info',18)+'<span>'+t('引导核对仅覆盖所列场景与特定条件。完整条目、例外及交易层面的许可要求仍需结合具体事实核查。','Guided checks cover the listed scenarios and selected criteria. Full provisions, exclusions, and transaction-specific licensing requirements still require review.')+'</span></div>';}
function activeQuestions(s){return (s.questions||[]).filter(q=>!q.showWhen||q.showWhen.values.includes(state.answers[q.showWhen.id]));}
function scenarioPage(){const s=window.CNECCSRules.getScenario(state.scenario,state.regime);if(!s){state.scenario=null;return checkPage();}const qs=activeQuestions(s);const completed=qs.filter(q=>state.answers[q.id]!==undefined&&state.answers[q.id]!==''&&state.answers[q.id]!=='unknown').length;return button(t('返回场景列表','All scenarios'),'all-scenarios','back-link','','back')+'<div class="page-heading"><div><div class="eyebrow">'+(state.regime==='CN'?t('中国','China'):t('美国','United States'))+' / '+t('条件核对','Criteria check')+'</div><h1>'+escape(L(s.title))+'</h1><p>'+escape(L(s.description))+'</p></div>'+regimeTabs()+'</div><div class="guide-layout"><div><form id="criteria-form" class="form-card"><div class="form-card-head"><h2>'+t('补充与你的物项有关的信息','Tell us about your item')+'</h2><p>'+t('请依据规格书或可核实的资料填写，保留原单位。','Use specifications or other verifiable information, keeping the stated units.')+'</p></div>'+(state.scenario==='carbon-fiber'?renderFiberHelper():'')+'<div class="question-fields">'+qs.map((q,i)=>renderQuestion(q,i)).join('')+'</div><div class="form-submit">'+button(t('清空本次输入','Clear answers'),'clear-answers','quiet-button')+'<button class="primary" type="submit">'+t('查看核对结果','Review criteria')+icon('arrow',16)+'</button></div></form>'+(state.evaluation?renderEvaluation(state.evaluation):'')+'</div><aside class="guide-sidebar">'+icon('sliders',25)+'<h3 style="margin-top:12px">'+t('本次核对','Your check')+'</h3><div class="progress"><i style="width:'+Math.round(completed/Math.max(qs.length,1)*100)+'%"></i></div><p>'+t('已填写 '+completed+' / '+qs.length+' 项可见信息',completed+' of '+qs.length+' visible fields provided')+'</p><ul><li>'+t('不了解的参数可选“不知道”或留空。','Choose “Unknown” or leave unfamiliar values blank.')+'</li><li>'+t('单位和阈值关系会影响结果。','Units and threshold operators can affect the result.')+'</li><li>'+t('语言切换保留输入；切换制度会重新开始核对。','Language changes preserve answers; changing regimes starts a new check.')+'</li></ul><hr style="border:0;border-top:1px solid #cddfe9;margin:18px 0"><p>'+t('仅在本次页面会话中处理输入，不建立产品档案。','Answers are processed within this page session; no product profile is created.')+'</p>'+button(t('查找完整管制条目','Search full provisions'),'scenario-search','secondary','','search')+'</aside></div>';}
function renderFiberHelper(){const input=state.fiberInput||{};const c=state.fiberCalculation;return '<details class="fiber-helper" '+(Object.values(input).some(Boolean)||c?'open':'')+'><summary>'+icon('sliders',16)+' '+t('只有常规强度／模量与密度？辅助换算','Have ordinary strength/modulus and density? Convert units')+'</summary><p class="small muted">'+t('可先核实从查询中提取的数值。换算结果须经你确认后才填入问答，不自动认定测量条件符合定义。','Check any values extracted from your query. Converted values enter the questionnaire only after your confirmation; measurement conditions remain unverified.')+'</p>'+(input._formatWarning?'<p class="notice" role="status">'+t('发现格式不明确的数值，相关字段未自动填入。请核对原始数值、逗号和小数点后手动填写。','An ambiguous number format was found. Those fields were not filled automatically. Check the source value, commas, and decimal point before entering it manually.')+'</p>':'')+'<div class="fiber-fields">'+[['modulusGPa',t('弹性模量','Elastic modulus'),'GPa'],['strengthMPa',t('抗拉强度','Tensile strength'),'MPa'],['densityGcm3',t('密度','Density'),'g/cm³']].map(x=>'<label>'+x[1]+' <small>'+x[2]+'</small><input id="fiber-'+x[0]+'" data-fiber="'+x[0]+'" type="number" step="any" min="0" value="'+escape(input[x[0]]||'')+'" placeholder="'+t('未知可留空','Leave unknown values blank')+'"></label>').join('')+'</div>'+button(t('计算参考值','Calculate reference values'),'fiber-calculate','secondary','','sliders')+(c?'<div class="fiber-output"><p><strong>'+t('比模量','Specific modulus')+': '+(c.specificModulus===null?'—':Number(c.specificModulus).toLocaleString(state.lang==='zh'?'zh-CN':'en-US',{maximumFractionDigits:2}))+' m</strong><br><strong>'+t('比抗拉强度','Specific tensile strength')+': '+(c.specificStrength===null?'—':Number(c.specificStrength).toLocaleString(state.lang==='zh'?'zh-CN':'en-US',{maximumFractionDigits:2}))+' m</strong></p><p class="small muted">'+escape(L(c.explanation))+'</p>'+(c.warnings||[]).map(w=>'<p class="small muted">'+escape(L(w))+'</p>').join('')+((c.specificModulus!==null||c.specificStrength!==null)?button(t('确认数值，填入下方','Confirm and fill in below'),'fiber-apply','secondary','','check'):'')+'</div>':'')+'</details>';}
function captureFiberInput(query){const result={};const defs=[['modulusGPa',/(?:弹性模量|模量|elastic modulus|modulus)\s*[:：=]?\s*([\d,.]+)\s*GPa/i],['strengthMPa',/(?:抗拉强度|tensile strength)\s*[:：=]?\s*([\d,.]+)\s*MPa/i],['densityGcm3',/(?:密度|density)\s*[:：=]?\s*([\d,.]+)\s*g\s*\/\s*cm[³3]/i]];for(const [key,re] of defs){const m=query.match(re);if(m){const value=m[1];if(/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)||/^[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?$/.test(value))result[key]=value.replace(/,/g,'');else result._formatWarning=true;}}return result;}
function renderQuestion(q,i){const v=state.answers[q.id]??'';return '<div class="question"><label for="q-'+escape(q.id)+'"><span class="question-number">'+String(i+1).padStart(2,'0')+'</span>'+escape(L(q.label))+(q.unit?' <span class="muted">('+escape(q.unit)+')</span>':'')+'</label>'+(q.hint?'<p id="hint-'+escape(q.id)+'" class="hint">'+escape(L(q.hint))+'</p>':'')+(q.type==='select'?'<select id="q-'+escape(q.id)+'" data-question="'+escape(q.id)+'" aria-describedby="hint-'+escape(q.id)+'"><option value="">'+t('请选择／待核实','Select / not yet verified')+'</option>'+(q.options||[]).map(o=>'<option value="'+escape(o.value)+'" '+(String(v)===String(o.value)?'selected':'')+'>'+escape(L(o.label))+'</option>').join('')+'</select>':'<input id="q-'+escape(q.id)+'" data-question="'+escape(q.id)+'" type="'+(q.type==='number'?'number':'text')+'" '+(q.type==='number'?'step="'+(q.integer?'1':'any')+'" '+(q.min!==undefined?'min="'+q.min+'" ':'')+(q.max!==undefined?'max="'+q.max+'" ':''):'maxlength="300"')+' value="'+escape(v)+'" placeholder="'+t('不确定可留空','Leave blank if unknown')+'" aria-describedby="hint-'+escape(q.id)+'">')+'</div>';}
function renderEvaluation(e){const sc=window.CNECCSRules.getScenario(state.scenario,state.regime);const missing=(e.missing||[]).map(id=>(sc.questions||[]).find(q=>q.id===id)).filter(Boolean);return '<section class="check-report" id="check-report" aria-live="polite"><div class="report-status">'+icon('info',23)+'<div><div class="eyebrow">'+t('条件核对结果','Criteria review')+'</div><h2>'+escape(L(e.title))+'</h2></div></div>'+(missing.length?'<div class="notice" style="margin:0 0 16px"><div><strong>'+t('请补充或更正以下信息','Provide or correct the following information')+'</strong><div class="suggested-codes">'+missing.map(q=>button(escape(L(q.label)),'focus-question','chip','data-value="'+escape(q.id)+'"')).join('')+'</div></div></div>':'')+(e.checks||[]).map(c=>'<div class="check-row '+escape(c.state)+'">'+icon(c.state==='met'?'check':'info',17)+'<div><strong>'+escape(L(c.label))+'</strong><p>'+escape(L(c.detail))+'</p></div></div>').join('')+((e.notes||[]).length?'<div class="check-notes">'+e.notes.map(n=>'<p style="margin:4px 0">'+escape(L(n))+'</p>').join('')+'</div>':'')+((e.suggestedCodes||[]).length?'<div class="suggested-codes"><span class="small muted">'+t('相关条目','Related entries')+'</span>'+e.suggestedCodes.map(code=>button(escape(code),'lookup-code','chip','data-value="'+escape(code)+'"')).join('')+'</div>':'')+(e.source?.url?'<p class="small muted" style="margin-top:18px">'+t('所依据资料：','Source reference: ')+'<a href="'+escape(safeURL(e.source.url))+'" target="_blank" rel="noopener noreferrer">'+t('官方来源入口','Official source')+'</a> · '+escape(e.source.snapshot||corpus.metadata.contentVersion)+'</p>':'')+'<div class="detail-actions" style="margin:20px 0 0">'+button(t('下载本次核对记录','Download this review'),'export-check','secondary','','download')+button(t('打印','Print'),'print','secondary','','print')+'</div></section>';}
function guidePage(){const faq=[[t('不知道编号，应该输入什么？','What should I enter if I do not know the code?'),t('优先输入“物项名称＋主要功能＋关键规格”，数值应注明单位。如果搜不到，尝试部件、材料或功能名称；宽泛整机名称通常需要继续拆分。','Start with the item name, main function, and key specifications, including units for numerical values. If nothing appears, try a component, material, or function. Broad finished-product names often require further detail.')],[t('中国和美国模块，应该选哪个？','Should I choose China or the U.S. module?'),t('选择需要核查的法律制度。货物从中国出口，通常先核查中国规则；涉及美国来源物项、再出口或其他美国管辖连接点时，可能还需单独核查美国规则。仅以企业国籍或目的地不能确定全部适用范围。','Choose the legal regime you need to check. Exports from China generally begin with Chinese controls; U.S.-origin items, reexports, or other U.S. jurisdictional connections may require separate U.S. review. Company nationality or destination alone does not determine the full scope.')],[t('为什么同一产品会出现多个结果？','Why does one product return several entries?'),t('同一个名称可能对应不同性能、形态、用途或技术层级。系统按相关性显示候选，不能仅凭首个结果确定归类。查看每个条目的条件，并优先补充能区分候选的技术事实。','The same name can describe different performance levels, forms, uses, or technical scopes. Results are candidates ranked by relevance. Review the criteria and supply the technical facts that distinguish them.')],[t('输入 HS 编码能否直接确认？','Can an HS code establish classification?'),t('不能。HS 编码是海关商品归类线索，与出口管制编号的用途不同。目录中相同或近似 HS 编码应结合物项名称、描述和技术条件核查。','No. HS codes are customs classification clues and serve a different purpose from export-control codes. Review the item description and technical criteria associated with any catalog match.')],[t('“未命中”或“条件不满足”代表什么？','What do “no match” and “criterion not met” mean?'),t('未命中表示当前描述或筛选条件没有找到相关记录；条件不满足仅针对所检查的特定条件。二者都不能证明不受其他条目、清单外规则或交易限制管制。','No match means the current query or filters did not locate a relevant record. A criterion not met applies only to the specific criterion checked. Neither establishes freedom from other entries, unlisted-item controls, or transaction restrictions.')],[t('语言切换会改变判断吗？','Does switching languages change the analysis?'),t('不会改变所选制度或条目。查询输入和核对进度会保留；中国／美国制度切换则采用各自独立的资料与核对逻辑。','Language changes preserve the selected regime, entry, input, and progress. Switching between China and the United States uses separate reference material and criteria.')],[t('这些内容是否实时更新？','Is the material updated in real time?'),t('当前为所提供文件的版本快照，页面不会自动抓取法规更新。请查看具体条目的来源信息，实际交易前复核最新官方文本。','This release is a snapshot of the supplied files and does not automatically retrieve regulatory changes. Review the source information within each entry and check the official text before an actual transaction.')]];return '<div class="page-heading"><div><div class="eyebrow">'+t('快速上手','A quick start')+'</div><h1>'+t('几分钟，掌握查询方法。','Get comfortable in a few minutes.')+'</h1><p>'+t('先定位，再核实，最后考虑具体交易的许可要求。每一步都能返回修改。','Find candidates, verify the criteria, then consider transaction-specific licensing. You can revise your inputs at every step.')+'</p></div></div><div class="intro-bottom" style="margin-top:0">'+feature('search',t('01 · 描述物项','01 · Describe the item'),t('名称＋功能＋已知参数；编号和 CAS 可直接输入。','Name + function + known specifications. Enter a code or CAS directly if available.'),'search')+feature('sliders',t('02 · 核对条件','02 · Check the criteria'),t('根据候选条目补充关键事实，保留未知项。','Supply relevant facts based on candidate provisions; preserve unknowns.'),'check')+feature('book',t('03 · 阅读依据','03 · Read the sources'),t('查看完整条目、注释、译文和资料位置。','Read the complete provision, notes, translation, and source location.'),'search')+'</div><section class="content-card"><h2>'+t('常见问题','Frequently asked questions')+'</h2>'+faq.map((x,i)=>'<details '+(i===0?'open':'')+'><summary>'+x[0]+'</summary><p>'+x[1]+'</p></details>').join('')+'</section>';}
function disclaimerPage(){const zh=[
'本网站由个人独立开发运营，与任何企业、组织或政府机构无隶属或关联关系。',
'本网站不主动收集任何个人信息；如您通过邮件联系，所提供信息仅用于处理您的询问。',
'本网站为非营利性一般商业信息平台，不代表官方立场，所载信息仅供参考，不构成法律意见。',
'中国出口管制相关官方信息以中国商务部出口管制信息网（<a href="https://exportcontrol.mofcom.gov.cn/" target="_blank" rel="noopener noreferrer">https://exportcontrol.mofcom.gov.cn/</a>）为准。',
'如对本网站功能或使用有任何意见、建议或疑问，请联系：<a href="mailto:huangty0755@protonmail.com">huangty0755@protonmail.com</a>。'];const en=[
'This website is independently developed and operated by an individual and is not affiliated with any company, organization, or government agency.',
'This website does not actively collect any personal information. If you contact us by email, the information you provide will be used only to respond to your inquiry.',
'This website is a non-profit general business information platform. It does not represent any official position, and the information provided is for general reference only and does not constitute legal advice.',
'For official information on China’s export controls, please refer to the Export Control Information Network of the Ministry of Commerce of China (<a href="https://exportcontrol.mofcom.gov.cn/" target="_blank" rel="noopener noreferrer">https://exportcontrol.mofcom.gov.cn/</a>).',
'For any comments, suggestions, or questions regarding the website’s functions or use, please contact: <a href="mailto:huangty0755@protonmail.com">huangty0755@protonmail.com</a>.'];return '<div class="page-heading"><div><h1>'+t('免责声明','Disclaimer')+'</h1></div></div><section class="content-card disclaimer-card">'+(state.lang==='zh'?zh:en).map(p=>'<p>'+p+'</p>').join('')+'</section>';}
function renderProductBatch(){return '<section class="content-card"><h2>'+t('BOM 逐行物项检索','BOM item-by-item search')+'</h2><p>'+t('每一行单独定位候选条款，需继续核实实际参数。无候选不代表不受管制。','Each row identifies candidate provisions for further specification checks. No candidates does not establish that an item is uncontrolled.')+'</p><div class="entity-raw-wrap" tabindex="0" role="region" aria-label="'+t('物项批量结果，可横向滚动','Item batch results; scroll horizontally')+'"><table class="product-batch-table"><thead><tr><th>'+t('物项描述','Item description')+'</th><th>'+t('候选数量','Candidates')+'</th><th>'+t('下一步','Next step')+'</th></tr></thead><tbody>'+state.productBatch.map((row,i)=>'<tr><td>'+escape(row.input.query)+(row.input.spec?'<br><small>'+escape(row.input.spec)+'</small>':'')+'</td><td>'+row.total+'</td><td>'+button(t('查看候选并核对','Review candidates'),'batch-product-query','text-button','data-value="'+i+'"')+'</td></tr>').join('')+'</tbody></table></div></section>';}
function productNotReady(){const error=new Error('The product corpus is not ready. Try again shortly.');error.code='PRODUCT_CORPUS_NOT_READY';return error;}
function requireProductEngine(context){const regime=['CN','US'].includes(context.regime)?context.regime:state.regime;const selected=splitLoading()?regimeEngines.get(regime):ready&&engine;if(!selected){if(splitLoading())boot(Boolean(regimeErrors.get(regime)),regime);throw productNotReady();}return {regime,engine:selected};}
function applyProductQuery(payload,context={}){const selected=requireProductEngine(context);state.regime=selected.regime;syncActiveEngine();state.query=payload.query||'';state.spec=payload.spec||'';state.showSpec=!!state.spec;state.filters={category:'all',kind:'all',direction:'all'};state.offset=0;state.page='search';closeOverlay();doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth'});}
function applyProductBatch(items,context={}){const selected=requireProductEngine(context);if(!Array.isArray(items)||items.length<1||items.length>50)throw Error('Submit between 1 and 50 item rows.');state.regime=selected.regime;syncActiveEngine();cancelPendingSearch();searchError=null;state.result=null;state.query='';state.spec='';state.showSpec=false;state.searched=false;state.page='search';state.productBatch=items.map(input=>({input,total:engine.search([input.query,input.spec].filter(Boolean).join(' '),{regime:state.regime,limit:1}).total}));closeOverlay();render();}
function recordById(id){return detailRecords.get(id)||(splitLoading()?window.CNECCSCorpusLoader.getRecord?.(id):null)||corpus.records.find(r=>r.id===id);}
function detailIssues(r){return (r.sourceIssues||[]).map(issue=>'<div class="notice" style="margin:0 0 15px">'+icon('info',18)+'<div><strong>'+escape(L(issue.title))+'</strong><br>'+escape(L(issue.text))+(issue.source?.url?'<br><a href="'+escape(safeURL(issue.source.url))+'" target="_blank" rel="noopener noreferrer">'+t('核查所指来源','Review referenced source')+' '+icon('external',12)+'</a>':'')+'</div></div>').join('');}
function openDetail(id,{retry=false}={}){
 sourcePageOperation++;const r=recordById(id);if(!r)return toast(t('对应条目未包含在当前资料中。','This entry is outside the current corpus.'));
 const operation=++detailOperation,regime=state.regime;if(!state.detail)returnFocus=document.activeElement;
 state.detail=id;state.detailTab='overview';state.detailLang=state.lang;detailError=false;
 renderDetail();document.body.style.overflow='hidden';$('.drawer .icon-button')?.focus();
 if(Array.isArray(r.blocks))return;
 const current=()=>operation===detailOperation&&state.detail===id&&state.regime===regime;
 return Promise.resolve().then(()=>window.CNECCSCorpusLoader.loadRecord(id,{retry})).then(record=>{
  if(!record||record.id!==id||!Array.isArray(record.blocks))throw Error('Incomplete entry');
  detailRecords.set(id,record);if(current())renderDetail();
 }).catch(()=>{if(current()){detailError=true;renderDetail();}});
}
function renderPendingDetail(r){
 $('#overlay-root').innerHTML='<div class="overlay" data-action="overlay-close"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title"><header class="drawer-head"><div><span class="code">'+escape(displayCode(r))+'</span><h2 id="detail-title">'+escape(L(r.title))+'</h2></div>'+button(icon('close',21),'close','icon-button','aria-label="'+t('关闭详情','Close details')+'"')+'</header><div class="drawer-body"><section class="search-feedback-card" role="status" aria-live="polite" aria-busy="'+(!detailError)+'"><div class="search-feedback-icon">'+(detailError?icon('info',24):'<span class="search-spinner" aria-hidden="true"></span>')+'</div><div><h3>'+t(detailError?'暂时无法打开条目':'正在打开完整条目',detailError?'Unable to open this entry':'Opening the complete entry')+'</h3><p>'+t(detailError?'完整条文暂时未能载入。请检查网络后重试；检索结果和输入会保留。':'正在准备条文、注释与来源信息。',detailError?'The complete provision could not load. Check your connection and retry; your results and input are preserved.':'Preparing the provision, notes, and source information.')+'</p>'+(detailError?button(t('重试','Retry'),'detail-retry','secondary','data-id="'+escape(r.id)+'"'):'')+'</div></section></div></section></div>';
}
function renderDetail(){const r=recordById(state.detail);if(!r)return;if(!Array.isArray(r.blocks)){renderPendingDetail(r);return;}const dl=state.lang;const original=r.source?.originalLanguage||(r.regime==='CN'?'zh':'en');const scenario=window.CNECCSRules?.detectScenario([r.code,L(r.title),getQuery()].join(' '),r.regime);const context=(r.generalRuleIds||[]).map(recordById).filter(Boolean);const related=(r.relatedIds||[]).map(recordById).filter(Boolean);$('#overlay-root').innerHTML='<div class="overlay" data-action="overlay-close"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title"><header class="drawer-head"><div><div class="result-top" style="margin-bottom:0"><span class="code">'+escape(displayCode(r))+'</span><span class="pill">'+r.regime+' · '+escape(kindLabel(r.kind))+'</span>'+(r.entryStatus&&/ITAR/i.test(L(r.entryStatus,'en'))?'<span class="pill">'+escape(L(r.entryStatus))+'</span>':'')+(r.direction==='import'?'<span class="pill">'+t('进口目录','Import catalog')+'</span>':'')+'</div><h2 id="detail-title" tabindex="0">'+escape(L(r.title))+'</h2></div>'+button(icon('close',21),'close','icon-button','aria-label="'+t('关闭详情','Close details')+'"')+'</header><div class="drawer-body"><div class="drawer-tabs" role="group" aria-label="'+t('详情视图','Detail view')+'">'+[['overview',t('条目概览','Overview')],['full',t('完整条文与注释','Full text & notes')],['source',t('来源与关联','Sources & context')]].map(x=>button(x[1],'detail-tab',state.detailTab===x[0]?'active':'','data-value="'+x[0]+'" aria-pressed="'+(state.detailTab===x[0])+'"')).join('')+'</div><div class="translation-note">'+(dl===original?t('当前语言：原文。','Current language: original text.'):t('当前语言：非官方参考译文，请结合原文核查。','Current language: unofficial reference translation; review the original text.'))+'</div>'+detailIssues(r)+(state.detailTab==='overview'?'<div class="source-strip"><strong>'+(r.entryStatus&&/ITAR/i.test(L(r.entryStatus,'en'))?t('ITAR 交叉指引 · 需核查美国军品管辖','ITAR cross-reference · Review U.S. defense-trade jurisdiction'):t('相关候选 · 待核实技术条件','Candidate entry · Technical criteria require verification'))+'</strong><br>'+t('请同时阅读本项的上级条件、子项、说明与排除内容。','Read parent conditions, subentries, notes, and exclusions together.')+'</div><p class="detail-intro">'+escape(L(r.summary))+'</p><div class="detail-actions">'+button(t('阅读完整条文','Read full provision'),'detail-tab','primary','data-value="full"','book')+(scenario?button(t('核对关键条件','Check key criteria'),'scenario','secondary','data-value="'+escape(scenario.id)+'"','sliders'):'')+'</div>'+ ((r.cas||[]).length?'<p class="small"><strong>CAS</strong> · '+escape(r.cas.join(' / '))+'</p>':'')+((r.hs||[]).length?'<p class="small"><strong>HS</strong> · '+escape(r.hs.join(' / '))+'<br><span class="muted">'+t('海关编码仅作线索，不替代管制归类。','Customs codes are clues, not export-control classifications.')+'</span></p>':'')+(r.controlReasons?'<p class="small"><strong>'+t('管制原因','Control reasons')+'</strong> · '+escape(L(r.controlReasons))+'</p>':'')+'<div class="fulltext-content"><h3>'+t('条文起始内容','Beginning of the provision')+'</h3>'+renderBlocks((r.blocks||[]).slice(0,4),dl)+(r.blocks.length>4?button(t('展开全部 '+r.blocks.length+' 段内容','Read all '+r.blocks.length+' content blocks'),'detail-tab','text-button','data-value="full"','arrow'):'')+'</div>':state.detailTab==='full'?'<div class="detail-actions">'+languageSwitch()+button(t('打印条文','Print provision'),'print','secondary','','print')+'</div>'+(dl!==original?'<div class="translation-note">'+t('当前显示非官方参考译文；如有歧义，以原文为准。','An unofficial reference translation is shown. Consult the original text for interpretation.')+'</div>':'')+'<div class="search-actions" style="margin:0 0 10px"><input id="within-entry" class="fulltext-filter" style="margin:0" placeholder="'+t('在本条目内定位文字（保留完整上下文）','Find text within this entry; full context remains visible')+'" aria-label="'+t('条目内查找','Find within entry')+'">'+button(t('定位','Find'),'find-entry','secondary')+'</div><div class="source-strip">'+t('完整内容按原文顺序呈现；表格、注释与技术说明均属于阅读范围。','Complete content follows the source order. Tables, notes, and technical explanations are part of the review.')+'</div><div id="fulltext-blocks">'+renderBlocks(r.blocks,dl)+'</div>':state.detailTab==='pages'?button(t('返回来源与关联','Back to sources'),'detail-tab','back-link','data-value="source"','back')+'<p class="small muted">'+t('以下为中文原页文字；版式和图形请结合随包 PDF 阅读。','Chinese source-page text follows; consult the packaged PDF for layout and graphics.')+'</p>'+(state.pageTexts||[]).map(p=>'<h3>'+t('PDF 第 '+p.pdfPage+' 页','PDF page '+p.pdfPage)+'</h3><div class="block">'+escape(p.text)+'</div>').join(''):renderSourceDetail(r,related,context))+'</div><footer class="drawer-foot"><span>'+t('条目核对不替代具体交易审查','Entry review does not replace transaction review')+'</span>'+button(t('复制编号','Copy code'),'copy-code','text-button','data-value="'+escape(displayCode(r))+'"','copy')+'</footer></section></div>';const activeTab=$('.drawer-tabs button.active');(activeTab||$('.drawer .icon-button'))?.focus({preventScroll:true});}
function renderBlocks(blocks,lang){return (blocks||[]).map(b=>{if(b.kind==='figure'&&b.image){if((b.image.includes('/cn-')&&lang==='en')||(b.image.includes('/us-')&&lang==='zh'))return '<div class="block"><a href="'+escape(window.CNECCS_ASSETS?.[b.image]||b.image)+'" target="_blank" rel="noopener noreferrer">'+t('打开原始图式','Open original source figure')+'</a></div>';return '<figure class="block"><img src="'+escape(window.CNECCS_ASSETS?.[b.image]||b.image)+'" alt="'+escape(L(b.text,lang)||b.id)+'" style="max-width:100%;height:auto"><figcaption class="small muted">'+escape(L(b.text,lang))+'</figcaption></figure>';}const grid=b.cells?.[lang];const section=L(b.section,lang);return '<div class="block" data-block="'+escape(b.id)+'">'+(section&&/heading/.test(b.kind)?'<h3>'+escape(section)+'</h3>':'')+(grid?.length?'<div class="block-table-wrap" tabindex="0" role="region" aria-label="'+t('条文表格，可横向滚动','Provision table; scroll horizontally')+'"><table class="block-table"><tbody>'+grid.map(row=>'<tr>'+row.map(cell=>'<td '+(row.length===1?'colspan="'+Math.max(...grid.map(x=>x.length))+'"':'')+'>'+escape(L(cell,lang))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':escape(L(b.text,lang)))+'</div>';}).join('');}
function renderSourceDetail(r,related,context){const s=r.source||{};const links=(rows)=>rows.map(x=>'<button data-action="detail" data-id="'+escape(x.id)+'" class="modal-choice"><span class="code">'+escape(displayCode(x))+'</span><span>'+escape(L(x.title))+'</span>'+icon('chevron',15)+'</button>').join('');return '<div class="source-strip"><strong>'+escape(sourceLabel(s))+'</strong><br>'+escape(t('来源位置：','Source location: ')+sourceLocator(s))+'<br>'+t('编纂版本：','Compilation version: ')+escape(s.workbookVersion||corpus.metadata.contentVersion)+(s.snapshotDate?'<br>'+t('来源快照：','Source snapshot: ')+escape(s.snapshotDate):'')+((s.pages||[]).length?'<br>'+t('PDF 页：','PDF pages: ')+escape(s.pages.join(', ')):'')+'</div><div class="detail-actions">'+(s.url?'<a class="secondary" href="'+escape(safeURL(s.url))+'" target="_blank" rel="noopener noreferrer">'+icon('external',15)+t('打开所引官方来源','Open cited official source')+'</a>':'')+(!window.CNECCS_STANDALONE&&s.localPath?'<a class="secondary" href="'+escape(s.localPath)+'" target="_blank" rel="noopener noreferrer">'+icon('file',15)+t('打开随包源文件','Open packaged source')+'</a>':'')+(r.regime==='CN'&&state.lang==='zh'&&(s.pages||[]).length?button(t('查看原页文字','View original page text'),'sourcepage','secondary','data-id="'+escape(r.id)+'"','file'):'')+'</div>'+(context.length?'<h3>'+t('关联通则与阅读顺序','Context notes and order of review')+'</h3><p class="small muted">'+t('这些链接帮助恢复阅读上下文，不表示每一规则都自动适用。','These links restore reading context; they do not establish that every rule applies.')+'</p>'+links(context):'')+(related.length?'<h3 style="margin-top:24px">'+t('关联条目与目录','Related entries and catalog records')+'</h3>'+links(related):'<p class="small muted">'+t('当前记录没有已编纂的内部关联。','No internal relationships have been compiled for this record.')+'</p>')+'<p class="small muted" style="margin-top:20px">'+t('来源网页可能显示与上传整合文件不同的版本。使用时请同时核对日期、后续公告及对应原文。','A source webpage may show a different version from the supplied consolidated file. Check dates, subsequent announcements, and the relevant source text together.')+'</p>';}
function closeOverlay(){sourcePageOperation++;detailOperation++;detailError=false;state.detail=null;$('#overlay-root').innerHTML='';document.body.style.overflow='';const original=returnFocus;let target=original?.isConnected===false?null:original;if(!target&&original?.id)target=document.getElementById(original.id);if(!target&&original?.dataset?.action)target=[...document.querySelectorAll('[data-action]')].find(el=>['action','id','page','value'].every(key=>el.dataset?.[key]===original.dataset[key]));(target||$('#main'))?.focus?.({preventScroll:true});returnFocus=null;}
function modal(title,body){sourcePageOperation++;detailOperation++;detailError=false;returnFocus=document.activeElement;state.detail=null;$('#overlay-root').innerHTML='<div class="overlay modal-overlay" data-action="overlay-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">'+button(icon('close',21),'close','icon-button modal-close','aria-label="'+t('关闭','Close')+'"')+'<h2 id="modal-title">'+title+'</h2>'+body+'</section></div>';document.body.style.overflow='hidden';$('.modal .icon-button')?.focus();}
function jurisdictionModal(){modal(t('先确定你要核查哪个法律制度','Start with the legal regime'),'<p>'+t('企业所在地、股东国籍或目的地都不能单独决定全部适用规则。两套制度可能同时需要核查，查询结果分别呈现。','A company’s location, ownership, or destination alone does not determine every applicable rule. Both regimes may require review; their results remain separate.')+'</p>'+['CN','US'].map(x=>'<button class="modal-choice" data-action="choose-regime" data-value="'+x+'"><span class="country-mark">'+x+'</span><span><strong>'+ (x==='CN'?t('从中国出口／向境外提供物项','Exporting or providing items from China'):t('需要核查美国 EAR 的物项','Items requiring U.S. EAR review'))+'</strong><small>'+(x==='CN'?t('先核查中国清单及相关规则','Begin with the China list and relevant rules'):t('如美国来源物项、再出口或其他管辖连接点','For example, U.S.-origin items, reexports, or other jurisdictional connections'))+'</small></span>'+icon('chevron',16)+'</button>').join('')+'<p style="margin-top:18px">'+t('适用范围本身如不明确，应先进一步核实交易链条、物项来源和相关技术。这里的引导不能替代完整管辖分析。','If jurisdiction is uncertain, establish the transaction chain, item origin, and relevant technology first. This guide does not replace a full jurisdictional analysis.')+'</p>');}
async function sourcePages(id){
 const r=recordById(id);if(!r||state.detail!==id||state.lang!=='zh')return;
 const operation=++sourcePageOperation,tab=state.detailTab,regime=state.regime;
 const current=()=>operation===sourcePageOperation&&state.detail===id&&state.detailTab===tab&&state.lang==='zh'&&state.regime===regime;
 try{
  let archive=window.CNECCS_PAGES;
  if(!archive){
   if(!sourcePagesPromise)sourcePagesPromise=(async()=>{const response=await fetch('data/source-pages.json',{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('read');const value=await response.json();if(!Array.isArray(value.pages))throw Error('format');window.CNECCS_PAGES=value;return value;})().catch(error=>{sourcePagesPromise=null;throw error;});
   archive=await sourcePagesPromise;
  }
  if(!current())return;
  const doc=r.source.localFile?.includes('licensing')?'catalog':'control-list';
  const pages=archive.pages.filter(p=>p.document===doc&&(r.source.pages||[]).includes(p.pdfPage));
  state.pageTexts=pages;state.detailTab='pages';renderDetail();
  if(!pages.length)toast(t('当前条目没有对应原页。','No source page is linked to this entry.'));
 }catch{if(current())toast(t('原页档案无法载入，请查看完整工程包。','The page archive could not load. Check the complete project package.'));}
}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function navigate(page){closeOverlay();state.page=['search','entities','documents','check','guide','disclaimer'].includes(page)?page:'search';state.menu=false;if(splitLoading()&&['search','documents'].includes(state.page))boot();render();$('#main')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
function setRegime(regime){if(!['CN','US'].includes(regime)||state.regime===regime)return;const repeatSearch=state.searched;closeOverlay();cancelPendingSearch();state.regime=regime;state.productBatch=null;state.result=null;state.searched=false;state.answers={};state.evaluation=null;state.fiberInput={};state.fiberCalculation=null;state.filters={category:'all',kind:'all',direction:'all'};state.offset=0;syncActiveEngine();if(splitLoading())boot();if(repeatSearch&&state.page==='search')doSearch();render();}
function download(name,content,type='application/json'){const blob=new Blob([content],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReview(){if(!state.evaluation)return;const s=window.CNECCSRules.getScenario(state.scenario,state.regime);const e=state.evaluation;const html='<!doctype html><html lang="'+(state.lang==='zh'?'zh-CN':'en')+'"><meta charset="utf-8"><title>CNECCS · '+t('核对记录','Review record')+'</title><style>body{font:15px/1.8 system-ui,sans-serif;max-width:900px;margin:40px auto;color:#143449;padding:0 25px}h1,h2{color:#073c61}table{width:100%;border-collapse:collapse}td,th{border:1px solid #d8e5eb;padding:10px;text-align:left}small{color:#667d8b}</style><h1>CNECCS · '+t('条件核对记录','Criteria review record')+'</h1><p>'+escape(L(s.title))+' · '+state.regime+'</p><small>'+new Date().toISOString()+' · '+escape(corpus.metadata.contentVersion)+'</small><h2>'+t('输入信息','Provided information')+'</h2><table>'+activeQuestions(s).map(q=>'<tr><td>'+escape(L(q.label))+'</td><td>'+escape(q.type==='select'?L(q.options.find(o=>String(o.value)===String(state.answers[q.id]))?.label)||t('待核实','Unknown'):String(state.answers[q.id]===undefined||state.answers[q.id]===''?t('待核实','Unknown'):state.answers[q.id])+(q.unit?' '+q.unit:''))+'</td></tr>').join('')+'</table><h2>'+escape(L(e.title))+'</h2>'+e.checks.map(c=>'<p><strong>'+escape(L(c.label))+'</strong><br>'+escape(L(c.detail))+'</p>').join('')+e.notes.map(n=>'<p>'+escape(L(n))+'</p>').join('')+'<p>'+t('相关条目：','Related entries: ')+escape((e.suggestedCodes||[]).join(', '))+'</p>'+(e.source?.url?'<p><a href="'+escape(safeURL(e.source.url))+'">'+t('官方来源入口','Official source')+'</a> · '+escape(e.source.snapshot||corpus.metadata.contentVersion)+'</p>':'')+'<p>'+t('本记录仅保存所列条件的初步核对，不能作为归类、免许可或出口放行证明。','This record documents a preliminary check of the listed criteria. It is not evidence of classification, license exemption, or export clearance.')+'</p></html>';download('CNECCS-'+state.regime+'-'+state.scenario+'-review.html',html,'text/html');}
function resetScenario(id){const s=window.CNECCSRules?.getScenario(id,state.regime);if(!s)return;closeOverlay();state.scenario=id;state.page='check';state.fiberInput=id==='carbon-fiber'?captureFiberInput(getQuery()):{};state.fiberCalculation=null;state.answers={};state.evaluation=null;state.menu=false;render();$('#main')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
document.addEventListener('submit',event=>{if(event.target.id==='search-form'){event.preventDefault();submitItemSearch();}if(event.target.id==='criteria-form'){event.preventDefault();state.evaluation=window.CNECCSRules.evaluate(state.scenario,state.answers,state.regime);render();$('#check-report')?.scrollIntoView({behavior:'smooth',block:'start'});}});
document.addEventListener('input',event=>{const el=event.target;if(el.dataset.fiber){state.fiberInput[el.dataset.fiber]=el.value;state.fiberCalculation=null;$('.fiber-output')?.remove();}if(el.id==='query')state.query=el.value;if(el.id==='spec')state.spec=el.value;if(el.id==='query'||el.id==='spec')invalidatePendingSearch();if(el.dataset.question){state.answers[el.dataset.question]=el.value;state.evaluation=null;const old=$('#check-report');if(old)old.remove();}});
document.addEventListener('change',event=>{const el=event.target;if(el.dataset.filter){state.filters[el.dataset.filter]=el.value;state.offset=0;doSearch();render();}if(el.tagName==='SELECT'&&el.dataset.question){state.answers[el.dataset.question]=el.value;state.evaluation=null;render();}});
document.addEventListener('click',async event=>{const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;const value=el.dataset.value;if(action==='search'){event.preventDefault();submitItemSearch();return;}if(action==='retry-corpus'){if(pendingSearch&&loadError)armPendingSearch();boot(true);return;}if(action==='overlay-close'){if(event.target===el)closeOverlay();return;}if(action==='lang'){setLanguage(value);return;}if(action==='regime'){setRegime(value);return;}if(action==='choose-regime'){closeOverlay();setRegime(value);return;}if(action==='nav'){navigate(el.dataset.page);return;}if(action==='open-documents'){state.documentsTarget='products';navigate('documents');return;}if(action==='batch-product-query'){const row=state.productBatch?.[Number(value)];if(row)applyProductQuery(row.input,{regime:state.regime});return;}if(action==='home'){state.page='search';state.menu=false;closeOverlay();if(splitLoading())boot();render();window.scrollTo({top:0});return;}if(action==='menu'){toggleMenu();return;}if(action==='spec'){state.showSpec=!state.showSpec;render();return;}if(action==='jurisdiction'){jurisdictionModal();return;}if(action==='browse'){if(state.regime!==value){state.answers={};state.evaluation=null;state.fiberInput={};state.fiberCalculation=null;}state.regime=value;state.query='';state.spec='';state.showSpec=false;state.filters={category:'all',kind:'all',direction:'all'};state.offset=0;state.page='search';doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth'});return;}if(action==='reset-filters'){state.filters={category:'all',kind:'all',direction:'all'};state.offset=0;doSearch();render();return;}if(action==='page'){state.offset=Number(value)||0;doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth'});return;}if(action==='detail'){openDetail(el.dataset.id);return;}if(action==='detail-retry'){if(state.detail===el.dataset.id)openDetail(el.dataset.id,{retry:true});return;}if(action==='close'){closeOverlay();return;}if(action==='detail-tab'){sourcePageOperation++;state.detailTab=value;renderDetail();return;}if(action==='find-entry'){const q=$('#within-entry')?.value.toLowerCase().trim();if(!q)return;const blocks=[...document.querySelectorAll('#fulltext-blocks .block')];blocks.forEach(x=>x.style.background='');const hits=blocks.filter(x=>x.textContent.toLowerCase().includes(q));hits.forEach(x=>x.style.background='#fff8dd');hits[0]?.scrollIntoView({behavior:'smooth',block:'center'});toast(t('在 '+hits.length+' 个内容块中找到；完整上下文保留。','Found in '+hits.length+' content blocks; full context remains visible.'));return;}if(action==='copy-code'){try{await navigator.clipboard.writeText(value);toast(t('编号已复制','Code copied'));}catch{modal(t('复制编号','Copy code'),'<input readonly value="'+escape(value)+'" style="width:100%;padding:12px" aria-label="'+t('编号','Code')+'">');}return;}if(action==='scenario'){resetScenario(value);return;}if(action==='all-scenarios'){state.scenario=null;state.answers={};state.evaluation=null;render();return;}if(action==='clear-answers'){state.answers={};state.fiberInput={};state.fiberCalculation=null;state.evaluation=null;render();return;}if(action==='lookup-code'){closeOverlay();state.query=value;state.spec='';state.filters={category:'all',kind:'all',direction:'all'};state.offset=0;state.page='search';doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth'});return;}if(action==='scenario-search'){const s=window.CNECCSRules.getScenario(state.scenario,state.regime);state.query=L(s.title);state.spec='';state.offset=0;state.filters={category:'all',kind:'all',direction:'all'};state.page='search';doSearch();render();return;}if(action==='fiber-calculate'){state.fiberCalculation=window.CNECCSRules.calculateSpecificFiber(state.fiberInput);render();return;}if(action==='fiber-apply'){const c=state.fiberCalculation;if(c){if(c.specificModulus!==null)state.answers.specificModulus=String(c.specificModulus);if(c.specificStrength!==null)state.answers.specificStrength=String(c.specificStrength);state.evaluation=null;render();toast(t('已填入未舍入的计算值；请继续核实测量依据。','Unrounded calculated values filled in; verify the measurement basis.'));}return;}if(action==='focus-question'){const input=document.getElementById('q-'+value);input?.focus();input?.scrollIntoView({behavior:'smooth',block:'center'});return;}if(action==='export-check'){exportReview();return;}if(action==='print'){window.print();return;}if(action==='sourcepage'){if(state.lang==='zh')await sourcePages(el.dataset.id);return;}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(state.menu&&isMobileNavigation()){toggleMenu(false);event.preventDefault();return;}closeOverlay();}if(event.key==='Tab'&&state.menu&&isMobileNavigation()){const sidebar=document.getElementById('main-sidebar');const controls=[...(sidebar?.querySelectorAll('button,a[href],[tabindex="0"]')||[])].filter(x=>!x.disabled);const first=controls[0],last=controls.at(-1);if(!sidebar?.contains(document.activeElement)){first?.focus();event.preventDefault();}else if(event.shiftKey&&document.activeElement===first){last?.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}return;}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&state.page==='search'){$('#search-form')?.requestSubmit();event.preventDefault();}if(event.key==='Tab'&&$('#overlay-root .overlay')){const focusable=[...$('#overlay-root').querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(x=>!x.disabled);const first=focusable[0],last=focusable.at(-1);if(!$('#overlay-root').contains(document.activeElement)){first?.focus();event.preventDefault();return;}if(event.shiftKey&&document.activeElement===first){last?.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}}});
function splitLoading(){return !window.CNECCS_DATA&&typeof window.CNECCSCorpusLoader?.loadRegime==='function';}
function syncActiveEngine(){if(activeRegime!==state.regime){activeRegime=state.regime;state.result=null;state.searched=false;state.productBatch=null;}if(!splitLoading())return;engine=regimeEngines.get(state.regime)||null;ready=Boolean(engine);loadError=regimeErrors.get(state.regime)||'';}
function moduleLoadError(regime,error){const name=regime==='US'?'美国':'中国',en=regime==='US'?'U.S.':'China',code=error?.code||(error?.name==='TimeoutError'?'REFERENCE_TIMEOUT':'REFERENCE_NETWORK');
 if(code==='REFERENCE_TIMEOUT')return {code,zh:name+'模块的资料准备已超时。请重试，已下载的资料和输入会保留。',en:'Reference preparation for the '+en+' module timed out. Retry; downloaded data and your input are preserved.'};
 if(['REFERENCE_INTEGRITY','REFERENCE_SCHEMA','REFERENCE_DECOMPRESSION','REFERENCE_URL','RUNTIME_UNAVAILABLE'].includes(code))return {code,zh:name+'模块的资料或程序未能正确准备。请先重试；如果仍失败，请复制输入内容后刷新页面。',en:'Reference data or software for the '+en+' module could not be prepared correctly. Try again; if the problem continues, copy your input before refreshing.'};
 if(code==='REFERENCE_HTTP')return {code,zh:name+'模块的资料服务暂时无法响应，请稍后重试。已输入的内容会保留。',en:'The reference service for the '+en+' module is temporarily unavailable. Retry shortly. Your input is preserved.'};
 return {code,zh:name+'模块的检索资料暂时未能载入，请检查连接后重试。已输入的内容会保留。',en:'Reference data for the '+en+' module could not load. Check your connection and retry. Your input is preserved.'};
}
function ensureRegime(regime,retry=false){
 if(regimeEngines.has(regime)){syncActiveEngine();return Promise.resolve(regimeEngines.get(regime));}
 if(regimeLoads.has(regime))return regimeLoads.get(regime);
 if(regimeErrors.has(regime)&&!retry){syncActiveEngine();return Promise.resolve(null);}
 regimeErrors.delete(regime);syncActiveEngine();
 const task=(async()=>{try{
  const payload=await window.CNECCSCorpusLoader.loadRegime(regime,{retry});
  if(payload?.index?.regime!==regime||!Array.isArray(payload.records)||!payload.records.length){const error=new Error('Invalid module');error.code='REFERENCE_SCHEMA';throw error;}
  const api=window.CNECCSSearch;if(!api||typeof api.createSearchEngineFromIndex!=='function'){const error=new Error('Search runtime unavailable');error.code='RUNTIME_UNAVAILABLE';throw error;}
  let selected;try{selected=typeof api.createSearchEngineFromIndexAsync==='function'?await api.createSearchEngineFromIndexAsync(payload.index,{chunkSize:32,timeBudgetMs:6}):api.createSearchEngineFromIndex(payload.index);}catch(error){if(!error.code)error.code='REFERENCE_SCHEMA';throw error;}
  regimeEngines.set(regime,selected);regimeErrors.delete(regime);
  corpus={metadata:window.CNECCSCorpusLoader.getMetadata?.()||payload.metadata||{},records:window.CNECCSCorpusLoader.getRecords?.()||[...corpus.records.filter(r=>r.regime!==regime),...payload.records]};
  updateBrandLogo();if(state.regime===regime){syncActiveEngine();updatePendingNotice();const runQueued=pendingSearch&&pendingSearchMatches();if(pendingSearch&&!pendingSearchMatches())cancelPendingSearch();if(runQueued){doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth',block:'start'});}else refreshSearchStatus();}
  return selected;
 }catch(error){regimeErrors.set(regime,moduleLoadError(regime,error));updateBrandLogo();if(state.regime===regime){syncActiveEngine();updatePendingNotice();refreshSearchStatus();}return null;}})();
 regimeLoads.set(regime,task);task.finally(()=>{if(regimeLoads.get(regime)===task)regimeLoads.delete(regime);});return task;
}
function boot(retry=false,regime=state.regime){
 if(splitLoading()){const task=ensureRegime(regime,retry);if(regime===state.regime)refreshSearchStatus();return task;}
 if(loadPromise)return loadPromise;
 loadError='';render();
 const run=async()=>{try{
  const inline=Boolean(window.CNECCS_DATA);
  if(inline)corpus=window.CNECCS_DATA;
  else if(window.CNECCSCorpusLoader)corpus=await window.CNECCSCorpusLoader.load({retry});
  else{const response=await fetch('data/corpus.json',{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('HTTP '+response.status);corpus=await response.json();}
  if(!Array.isArray(corpus.records)||!corpus.records.length)throw Error('Empty corpus');
  engine=!inline&&window.CNECCSSearch.createSearchEngineAsync?await window.CNECCSSearch.createSearchEngineAsync(corpus.records):window.CNECCSSearch.createSearchEngine(corpus.records);
  ready=true;
  updatePendingNotice();const runQueued=pendingSearch&&pendingSearchMatches();cancelPendingSearch();
  if(runQueued){doSearch();render();$('#results')?.scrollIntoView({behavior:'smooth',block:'start'});}else refreshSearchStatus();
 }catch(error){
  ready=false;engine=null;
  loadError=location.protocol==='file:'?{zh:'资料未能载入。请打开独立 HTML 文件，或按 README 启动本地工程；不要直接双击多文件版 index.html。',en:'The corpus could not load. Open the standalone HTML file or start the project as described in README; do not directly open the multi-file index.html.'}:{zh:'检索资料暂时未能载入，请检查网络后重试。已输入的内容会保留。',en:'Reference data could not load. Check your connection and retry. Your input is preserved.'};
  refreshSearchStatus();
 }};
 const task=run();loadPromise=task;task.finally(()=>{if(loadPromise===task)loadPromise=null;});return task;
}
window.CNECCSApp={state,setLanguage,getCorpus:()=>corpus,search:(query,options={})=>{syncActiveEngine();const regime=options.regime||state.regime;return (splitLoading()?regimeEngines.get(regime):engine)?.search(query,{regime,...options});},openDetail,render,ready:()=>{syncActiveEngine();return ready;}};
window.CNECCSEntityUI?.configure({rerender:render,onDocuments:()=>{state.documentsTarget='entities';navigate('documents');}});
window.CNECCSDocumentUI?.configure({rerender:render,onProductQuery:applyProductQuery,onProductBatch:applyProductBatch,onEntityQuery:async(payload,context={})=>{if(['CN','US'].includes(context.regime))state.regime=context.regime;navigate('entities');await window.CNECCSEntityUI.setQuery(payload);},onEntityBatch:async(items,context={})=>{if(['CN','US'].includes(context.regime))state.regime=context.regime;navigate('entities');await window.CNECCSEntityUI.batch(items);}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updatePendingNotice();});
window.addEventListener?.('pageshow',()=>updatePendingNotice());
window.CNECCSStartup?.onComplete?.(()=>{updateBrandLogo();});
if(splitLoading()){render();boot(false,'CN');boot(false,'US');}else boot();
window.CNECCSStartup?.runtimeReady?.();
})();

window.CNECCS_RUNTIME_READY=true;
window.CNECCSStartup?.runtimeReady?.();
}catch(error){window.CNECCS_RUNTIME_ERROR="runtime-execution";throw error;}
})();
