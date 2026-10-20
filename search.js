/* CNECCS local bilingual retrieval. No network, telemetry, or automated classification. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CNECCSSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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

  function createSearchEngineBuilder() {
    var indexes = { CN: [], US: [] }, vocab = new Map(), snippetCache = new WeakMap();
    var compareCodes = new Intl.Collator(undefined, { numeric: true }).compare;
    var prepared = [];
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
      if (!indexes[record.regime]) indexes[record.regime] = [];
      indexes[record.regime].push(item);
      // Vocabulary is drawn from record titles and keywords, keeping typo expansion conservative.
      unique((item.title + ' ' + item.keywords).match(/[a-z]{4,30}/g) || []).forEach(function (word) {
        if (!STOP.has(word)) vocab.set(word, (vocab.get(word) || 0) + 1);
      });
      prepared[index] = item;
    }
    function finish() {
      CONCEPTS.forEach(function (c) { c.terms.forEach(function (term) { if (/^[a-z]{4,30}$/.test(term)) vocab.set(term, (vocab.get(term) || 0) + 2); }); });
      return { search: search };
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
      var page = scored.slice(offset, offset + limit).map(function (hit) { hit.snippet = makeSnippet(hit.record, hit.matchedTerms, snippetCache); return hit; });
      return { results: page, total: scored.length, interpretation: interpretation, offset: offset, limit: limit };
    }
    return { addRecord: addRecord, finish: finish };
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

  function makeSnippet(record, terms, cache) {
    var result = {}, candidatesByLanguage = cache.get(record);
    // Full text is normalized only when a record first appears on a result page.
    // The source corpus remains untouched and returned snippets are fresh objects.
    if (!candidatesByLanguage) {
      candidatesByLanguage = {};
      ['zh', 'en'].forEach(function (lang) {
        var summary = pair(record.summary)[lang], title = pair(record.title)[lang], candidates = [];
        if (summary) candidates.push(summary);
        (record.blocks || []).forEach(function (b) { var t = pair(b.text)[lang]; if (t) candidates.push(t); });
        if (title) candidates.push(title);
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

  return { createSearchEngine: createSearchEngine, createSearchEngineAsync: createSearchEngineAsync, normalize: normalize, version: '1.0.0' };
});
