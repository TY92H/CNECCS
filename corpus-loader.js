/* Public reference assets only: no searches, uploads or personal data enter this cache. */
(function (root) {
  'use strict';
  var CACHE_PREFIX = 'cneccs-reference-v1:';
  var MAX_ASSET_BYTES = 64 * 1024 * 1024;
  var MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
  var TIMEOUT = 45000;

  function createLoader(env) {
    var tasks = new Map(), assets = new Map(), records = new Map(), fullRecords = new Map();
    var manifest = null, byId = new Map(), cacheTask = null;
    var URLClass = env.URL || root.URL, Decoder = env.TextDecoder || root.TextDecoder;
    var ResponseClass = env.Response || root.Response;

    function fail(message) { throw new Error(message); }
    function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
    function regimeName(regime) { if (regime !== 'CN' && regime !== 'US') fail('Invalid reference regime'); return regime; }
    function validId(id) { return typeof id === 'string' && id.length > 0 && id.length <= 256 && !/[\u0000-\u001f]/.test(id); }
    function inline() { return env.CNECCS_DATA; }
    function offline() { return env.CNECCS_STANDALONE || !env.location || !/^https?:$/.test(env.location.protocol); }
    function validateCorpus(data) {
      if (!object(data) || !Array.isArray(data.records) || !data.records.length) fail('Empty corpus');
      return data;
    }
    function slot(store, key, retry, work) {
      var existing = store.get(key);
      if (existing && !(retry && existing.phase === 'error')) return existing.promise;
      var current = { phase: 'pending', promise: null };
      current.promise = Promise.resolve().then(work).then(function (value) {
        current.phase = 'ready'; return value;
      }, function (error) { current.phase = 'error'; throw error; });
      // Eager requests may finish before app.js is ready to present an error.
      current.promise.catch(function () {});
      store.set(key, current);
      return current.promise;
    }
    function urlFor(file) {
      if (offline()) fail('Offline corpus is unavailable');
      var page = new URLClass(env.location.href);
      var url = new URLClass(file, page);
      if (url.origin !== page.origin || !/^https?:$/.test(url.protocol) || url.search || url.hash || url.username || url.password) fail('Invalid reference URL');
      return url.href;
    }
    async function download(file, limit, fresh) {
      var url = urlFor(file), timer, controller = typeof env.AbortController === 'function' ? new env.AbortController() : null;
      try {
        var timeout = new Promise(function (_, reject) {
          timer = env.setTimeout(function () {
            var error = new Error('Reference download timed out'); error.name = 'TimeoutError';
            reject(error); if (controller) controller.abort();
          }, TIMEOUT);
        });
        var request = (async function () {
          var options = { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: fresh ? 'no-store' : 'no-cache' };
          if (controller) options.signal = controller.signal;
          var response = await env.fetch(url, options);
          if (!response.ok) fail('Reference HTTP ' + response.status);
          if (response.url && new URLClass(response.url).href !== url) fail('Unexpected reference redirect');
          var length = response.headers && response.headers.get('content-length');
          if (length && Number(length) > limit) fail('Reference asset is too large');
          var bytes = await response.arrayBuffer();
          if (!bytes.byteLength || bytes.byteLength > limit) fail('Invalid reference asset size');
          return bytes;
        })();
        return await Promise.race([request, timeout]);
      } finally { if (timer !== undefined) env.clearTimeout(timer); }
    }
    function parse(bytes) { return JSON.parse(new Decoder('utf-8', { fatal: true }).decode(bytes)); }
    function descriptor(value, regime, isIndex) {
      if (!object(value) || typeof value.file !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256 || '')) fail('Invalid reference descriptor');
      var expression = isIndex ? /^reference-index-(cn|us)\.([a-f0-9]{8,64})\.json$/ : /^reference-details-(cn|us)-[0-9]{2,4}\.([a-f0-9]{8,64})\.json$/;
      var match = expression.exec(value.file);
      if (!match || match[1] !== regime.toLowerCase() || !value.sha256.startsWith(match[2])) fail('Invalid reference filename');
      if (!Number.isSafeInteger(value.bytes) || value.bytes < 1 || value.bytes > MAX_ASSET_BYTES) fail('Invalid reference byte count');
      if (isIndex && (!Number.isSafeInteger(value.recordCount) || value.recordCount < 1 || value.recordCount > 100000)) fail('Invalid reference record count');
      return value;
    }
    function validateManifest(data) {
      if (!object(data) || data.schemaVersion !== 1 || !object(data.metadata) || typeof data.contentVersion !== 'string' || !data.contentVersion || data.contentVersion.length > 200 || /[\u0000-\u001f]/.test(data.contentVersion) || data.metadata.contentVersion !== data.contentVersion) fail('Invalid reference manifest');
      if (!object(data.indexes) || !Array.isArray(data.details) || !data.details.length || data.details.length > 10000) fail('Missing reference assets');
      var ids = new Map(), files = new Set(), counts = { CN: 0, US: 0 };
      ['CN', 'US'].forEach(function (regime) { var entry = descriptor(data.indexes[regime], regime, true); files.add(entry.file); });
      data.details.forEach(function (entry) {
        if (!object(entry)) fail('Invalid reference detail descriptor');
        var regime = regimeName(entry.regime); descriptor(entry, regime, false);
        if (files.has(entry.file) || !Array.isArray(entry.ids) || !entry.ids.length || entry.ids.length > 100000) fail('Invalid reference detail IDs');
        files.add(entry.file);
        entry.ids.forEach(function (id) {
          if (!validId(id) || ids.has(id)) fail('Duplicate or invalid reference ID');
          ids.set(id, entry); counts[regime]++;
        });
      });
      ['CN', 'US'].forEach(function (regime) { if (counts[regime] !== data.indexes[regime].recordCount) fail('Reference manifest count mismatch'); });
      return { data: data, ids: ids };
    }
    function getManifestTask(retry) {
      return slot(tasks, 'manifest', retry, async function () {
        var verified = validateManifest(parse(await download('reference-manifest.json', MAX_MANIFEST_BYTES, true)));
        // Publish only after all validation and the bounded download have completed.
        manifest = verified.data; byId = verified.ids;
        return manifest;
      });
    }
    async function integrity(bytes, entry) {
      if (bytes.byteLength !== entry.bytes) fail('Reference integrity size mismatch');
      var crypto;
      try { crypto = env.crypto; } catch (_) { crypto = null; }
      if (crypto && crypto.subtle && typeof crypto.subtle.digest === 'function') {
        var digest = await crypto.subtle.digest('SHA-256', bytes);
        var hash = Array.from(new Uint8Array(digest), function (n) { return n.toString(16).padStart(2, '0'); }).join('');
        if (hash !== entry.sha256) fail('Reference integrity hash mismatch');
      }
      // Older browsers still enforce byte counts, filenames and JSON schemas.
    }
    function publicCache() {
      if (cacheTask) return cacheTask;
      cacheTask = (async function () {
        try {
          var storage = env.caches;
          if (!storage || typeof storage.open !== 'function' || !ResponseClass) return null;
          // GitHub Pages repositories share an origin. Keep each deployment's cache
          // and cleanup scope separate, including copies on another repository path.
          var scope = CACHE_PREFIX + encodeURIComponent(new URLClass('.', urlFor('reference-manifest.json')).href) + ':';
          var name = scope + encodeURIComponent(manifest.contentVersion);
          var cache = await storage.open(name);
          // Cleanup is best effort and never touches another application's caches.
          if (typeof storage.keys === 'function') Promise.resolve(storage.keys()).then(function (names) {
            return Promise.all(names.filter(function (key) { return key.startsWith(scope) && key !== name; }).map(function (key) { return storage.delete(key); }));
          }).catch(function () {});
          return cache;
        } catch (_) { return null; }
      })();
      return cacheTask;
    }
    function loadAsset(entry, retry, validate) {
      return slot(assets, entry.file, retry, async function () {
        var cache = await publicCache(), url = urlFor(entry.file), bytes, value;
        if (cache) {
          try {
            var cached = await cache.match(url);
            if (cached) {
              bytes = await cached.arrayBuffer(); await integrity(bytes, entry);
              value = parse(bytes); validate(value); return value;
            }
          } catch (_) { try { await cache.delete(url); } catch (_) {} }
        }
        bytes = await download(entry.file, entry.bytes, false); await integrity(bytes, entry);
        value = parse(bytes); validate(value);
        if (cache) {
          try {
            // Cache the exact verified public bytes. Writes never delay search availability.
            Promise.resolve(cache.put(url, new ResponseClass(bytes, { headers: { 'Content-Type': 'application/json; charset=utf-8' } }))).catch(function () {});
          } catch (_) {}
        }
        return value;
      });
    }
    function validateIndex(index, regime, entry) {
      if (!object(index) || index.schemaVersion !== 1 || index.regime !== regime || !Array.isArray(index.records) || index.records.length !== entry.recordCount) fail('Invalid reference index');
      var seen = new Set();
      index.records.forEach(function (record) {
        if (!object(record) || !validId(record.id) || record.regime !== regime || seen.has(record.id) || !byId.has(record.id) || byId.get(record.id).regime !== regime) fail('Invalid reference index record');
        seen.add(record.id);
      });
    }
    function validateDetails(data, entry) {
      if (!object(data) || data.schemaVersion !== 1 || data.contentVersion !== manifest.contentVersion || data.regime !== entry.regime || !Array.isArray(data.records) || data.records.length !== entry.ids.length) fail('Invalid reference detail shard');
      var expected = new Set(entry.ids), seen = new Set();
      data.records.forEach(function (record) {
        if (!object(record) || !expected.has(record.id) || seen.has(record.id) || record.regime !== entry.regime) fail('Invalid reference detail record');
        seen.add(record.id);
      });
    }
    function loadRegime(regime, options) {
      try { regimeName(regime); } catch (error) { return Promise.reject(error); }
      var retry = !!(options && options.retry);
      return slot(tasks, 'regime:' + regime, retry, async function () {
        if (inline()) {
          var data = validateCorpus(inline()), selected = data.records.filter(function (record) { return record.regime === regime; });
          if (!selected.length) fail('Empty inline reference regime');
          selected.forEach(function (record) { records.set(record.id, record); fullRecords.set(record.id, record); });
          return { metadata: data.metadata, index: null, records: selected };
        }
        var data = await getManifestTask(retry), entry = data.indexes[regime];
        var index = await loadAsset(entry, retry, function (value) { validateIndex(value, regime, entry); });
        index.records.forEach(function (record) { if (!fullRecords.has(record.id)) records.set(record.id, record); });
        return { metadata: data.metadata, index: index, records: index.records };
      });
    }
    function loadRecord(id, options) {
      if (!validId(id)) return Promise.reject(new Error('Invalid reference ID'));
      var retry = !!(options && options.retry);
      return slot(tasks, 'record:' + id, retry, async function () {
        if (fullRecords.has(id)) return fullRecords.get(id);
        if (inline()) {
          var found = validateCorpus(inline()).records.find(function (record) { return record.id === id; });
          if (!found) fail('Unknown reference ID');
          records.set(id, found); fullRecords.set(id, found); return found;
        }
        await getManifestTask(retry);
        var entry = byId.get(id); if (!entry) fail('Unknown reference ID');
        var data = await loadAsset(entry, retry, function (value) { validateDetails(value, entry); });
        data.records.forEach(function (record) { fullRecords.set(record.id, record); records.set(record.id, record); });
        return fullRecords.get(id);
      });
    }
    function load(options) {
      // Compatibility only. The website uses loadRegime; startup never requests this full corpus.
      return slot(tasks, 'legacy', !!(options && options.retry), async function () {
        if (inline()) return validateCorpus(inline());
        return validateCorpus(parse(await download('data/corpus.json', MAX_ASSET_BYTES, false)));
      });
    }
    return {
      loadRegime: loadRegime, loadRecord: loadRecord, load: load,
      getRecord: function (id) { return fullRecords.get(id) || records.get(id) || (inline() && inline().records && inline().records.find(function (record) { return record.id === id; })); },
      getMetadata: function () { return manifest ? manifest.metadata : inline() ? inline().metadata : null; },
      getRecords: function () { return inline() ? validateCorpus(inline()).records.slice() : Array.from(records.values()); },
      getManifest: function () { return manifest; }
    };
  }
  if (typeof module === 'object' && module.exports) module.exports = { createLoader: createLoader };
  else {
    root.CNECCSCorpusLoader = createLoader(root);
    if (!root.CNECCS_DATA && !root.CNECCS_STANDALONE && root.location && /^https?:$/.test(root.location.protocol)) root.CNECCSCorpusLoader.loadRegime('CN');
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
