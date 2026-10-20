# PDF.js vendored dependency

- Package: `pdfjs-dist`
- Version: `6.2.108`
- Build: upstream `legacy/build/pdf.min.mjs` and `legacy/build/pdf.worker.min.mjs` (compatibility build).
- License: Apache-2.0; original license retained as `LICENSE`. Upstream copyright/license comments remain in the unchanged modules.
- Source: official npm package, https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.2.108.tgz . Both modules and `LICENSE` were independently compared byte-for-byte with this package on 2026-10-20; upstream source is unchanged.
- Package integrity (npm SHA-512, independently verified): `sha512-YxFb+SQcodN2rnX9Tn3dHYlqfb7NjlzzfONPpJd+AKoKtUjEdevTfbC07d5TcczzOK6261auRkP/M8OBHs9vFQ==`.
- Upstream: https://github.com/mozilla/pdf.js
- API documentation: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- No CDN dependency or remote document-processing service.
- CNECCS disables extra font/CMap/WASM loading; this is a text-extraction integration, not a complete PDF viewer.
- Security update: Mozilla lists `6.2.108` as the patched version for [GHSA-hq66-cqwq-w95j](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j), verified on 2026-10-20. CNECCS only extracts text and does not instantiate the viewer or its scripting manager.

SHA-256:

```text
9fab0c910bf1484835c5c2aeb68f7eb3dfce7f9eb435a004526c5af86d70890c  pdf.min.mjs
bc0d1b88ea0b66196b1d36a58ac243c6d92adfe725624e2a9fdd381bdf8ef434  pdf.worker.min.mjs
0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594  LICENSE
```

版本和文件摘要固定于本次交付，更新依赖后必须重新核对许可证、资源加载限制和解析测试。

The version and hashes are fixed for this delivery. Recheck licensing, blocked-resource behavior, and extraction tests when updating the dependency.
