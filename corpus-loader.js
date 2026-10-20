/* Begin the fixed, same-origin reference download before the application scripts. */
(function (root) {
  'use strict';
  function createLoader(env) {
    var task = null, phase = 'idle';
    function validate(data) {
      if (!data || !Array.isArray(data.records) || !data.records.length) throw Error('Empty corpus');
      return data;
    }
    function load(options) {
      // Only an explicit retry replaces a failed attempt; concurrent callers share one request.
      if (options && options.retry && phase === 'error') task = null;
      if (task) return task;
      phase = 'pending';
      var timer, controller;
      task = (async function () {
        try {
          if (env.CNECCS_DATA) return validate(env.CNECCS_DATA);
          if (env.CNECCS_STANDALONE || env.location && env.location.protocol === 'file:') throw Error('Offline corpus is unavailable');
          controller = typeof env.AbortController === 'function' ? new env.AbortController() : null;
          var timeout = new Promise(function (_, reject) {
            timer = env.setTimeout(function () {
              var error = Error('Reference download timed out');
              error.name = 'TimeoutError';
              reject(error);
              if (controller) controller.abort();
            }, 45000);
          });
          var request = (async function () {
            var response = await env.fetch('data/corpus.json', {
              credentials: 'omit', referrerPolicy: 'no-referrer',
              ...(controller ? { signal: controller.signal } : {})
            });
            if (!response.ok) throw Error('HTTP ' + response.status);
            return validate(await response.json());
          })();
          return await Promise.race([request, timeout]);
        } finally {
          if (timer !== undefined) env.clearTimeout(timer);
        }
      })().then(function (data) { phase = 'ready'; return data; }, function (error) { phase = 'error'; throw error; });
      // The early request can fail before app.js attaches its own error UI.
      task.catch(function () {});
      return task;
    }
    return { load: load };
  }
  if (typeof module === 'object' && module.exports) module.exports = { createLoader: createLoader };
  else {
    root.CNECCSCorpusLoader = createLoader(root);
    if (!root.CNECCS_DATA && !root.CNECCS_STANDALONE && root.location && /^https?:$/.test(root.location.protocol)) root.CNECCSCorpusLoader.load();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
