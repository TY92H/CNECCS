/* Local party screening. Public reference data only; inputs never leave this page. */
(function (root) {
'use strict';
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {lang:'zh',regime:'CN',query:'',name:'',address:'',identifier:'',source:'all',type:'all',status:'all',fuzzy:true,advanced:false,offset:0,result:null,detail:null,batch:null,batchScope:null,batchProgress:null,error:null};
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
async function getJSON(path, embedded) {
 if (embedded) return embedded;
 const response = await fetch(path, {credentials:'omit',referrerPolicy:'no-referrer'});
 if (!response.ok) throw Error('Reference data unavailable');
 return response.json();
}
function requireTable(data, required){if(!data||!Array.isArray(data.columns)||!Array.isArray(data.rows)||required.some(key=>!data.columns.includes(key))||data.rows.some(row=>!Array.isArray(row)||row.length!==data.columns.length))throw Error('Invalid reference table');return data;}
function requireRecords(data){if(!data||!Array.isArray(data.records)||data.records.some(record=>!record||typeof record!=='object'||Array.isArray(record)))throw Error('Invalid reference records');return data;}
async function ensure(regime) {
 if (indexes[regime]) return indexes[regime];
 if (loading[regime]) return loading[regime];
 loading[regime] = (async()=>{
  const embedded = root.CNECCS_ENTITY_DATA || {};
  if (regime === 'US') bundles.us = requireTable(await getJSON('data/us-entities-official.json',embedded.us),['_id','source','name']);
  else {
   const values = await Promise.all([getJSON('data/cn-entities-upload.json',embedded.cnUpload),getJSON('data/cn-entities-official-additions.json',embedded.cnOfficial),embedded.cnOfficial?Promise.resolve(null):getJSON('data/cn-entities-extra.json',embedded.cnExtra),getJSON('data/un-entities-auxiliary.json',embedded.unAux)]);
   requireTable(values[0],['Type','Name']);requireRecords(values[1]);if(values[2])requireRecords(values[2]);requireRecords(values[3]);
   bundles.cnUpload=values[0];bundles.cnOfficial=values[2]?{metadata:{...values[1].metadata,extra:values[2].metadata},records:[...(values[1].records||[]),...(values[2].records||[])]}:values[1];bundles.unAux=values[3];
  }
  indexes[regime]=E().createIndex(regime==='US'?{us:bundles.us}:{cnUpload:bundles.cnUpload,cnOfficial:bundles.cnOfficial,unAux:bundles.unAux});
  return indexes[regime];
 })();
 try {return await loading[regime];} finally {delete loading[regime];}
}
function reset(regime) {
 operation++;pendingBatchInputs=null;
 Object.assign(state,{regime,source:'all',type:'all',status:'all',offset:0,result:null,detail:null,batch:null,batchScope:null,batchProgress:null,error:null});
}
function input(name,label,placeholder='') {
 return '<label class="entity-field"><span>'+esc(label)+'</span><input id="entity-'+name+'" data-ent-field="'+name+'" value="'+esc(state[name])+'" maxlength="500" autocomplete="off" spellcheck="false" placeholder="'+esc(placeholder)+'"></label>';
}
function options(key,values,all) {
 return '<label class="entity-filter"><span>'+esc({source:t('名单来源','List source'),type:t('主体类型','Party type'),status:t('记录状态','Record status')}[key])+'</span><select id="entity-filter-'+key+'" data-ent-filter="'+key+'"><option value="all">'+esc(all)+'</option>'+values.map(x=>'<option value="'+esc(x.key)+'" '+(state[key]===x.key?'selected':'')+'>'+esc(L(x.label))+' · '+x.count+'</option>').join('')+'</select></label>';
}
function sourceName(key) {
 const sources=E().sources(state.regime);const source=Array.isArray(sources)?sources.find(s=>s.key===key):sources[key];
 return L(source?.label)||key;
}
function regimeTabs(){return '<div class="regime-tabs" role="group" aria-label="'+t('选择管制制度','Choose a legal regime')+'">'+['CN','US'].map(r=>'<button type="button" class="regime-tab '+(state.regime===r?'active':'')+'" data-action="regime" data-value="'+r+'" aria-pressed="'+(state.regime===r)+'">'+esc(r==='CN'?t('中国制度','China'):t('美国制度','United States'))+'</button>').join('')+'</div>';}
function render(props) {
 state.lang=props.lang; if(state.regime!==props.regime)reset(props.regime);
 if(!indexes[state.regime]&&!loading[state.regime]&&(!state.error||state.error.kind==='input')){const requestedRegime=state.regime;ensure(requestedRegime).then(()=>{if(state.regime===requestedRegime)rerender();}).catch(()=>{if(state.regime!==requestedRegime)return;state.error={zh:'名单文件未能载入。请重试，或打开完整的独立 HTML 文件。',en:'The list files could not load. Retry or open the complete standalone HTML file.'};rerender();});}
 if(state.detail&&indexes[state.regime])return detailPage();
 const index=indexes[state.regime];
 const facets=index?E().search(index,{regime:state.regime,limit:1}).facets:{sources:[],types:[],statuses:[]};
 return '<section class="page-heading"><div><div class="eyebrow">'+t('核对身份 · 查明措施','Verify identity · Review measures')+'</div><h1>'+t('主体与限制措施查询','Party and restrictions screening')+'</h1><p>'+t('按名称、地址或识别号查找列示记录，核对身份后再判断具体措施。','Find listing records by name, address, or identifier. Verify the identity before evaluating the measures.')+'</p></div>'+regimeTabs()+'</section>'+
 '<section class="search-panel entity-search"><form id="entity-search-form"><div class="search-body">'+input('query',t('你需要核查哪个主体？','Who do you need to screen?'),t('输入企业名称、人员姓名、地址或识别号','Enter a business name, person’s name, address, or identifier'))+
 '<div class="entity-controls">'+button(state.advanced?t('收起精确条件','Hide specific fields'):t('补充名称、地址或识别号','Add specific name, address, or ID'),'advanced','quiet-button','id="entity-advanced"')+'<label class="entity-fuzzy"><input id="entity-fuzzy" type="checkbox" data-ent-field="fuzzy" '+(state.fuzzy?'checked':'')+'>'+t('包含近似名称','Include similar names')+'</label></div>'+
 (state.advanced?'<div class="entity-fields">'+input('name',t('名称／别名','Name / alias'))+input('address',t('地址关键词','Address keywords'))+input('identifier',t('识别号／名单编号','Identifier / list ID'))+'</div><p class="small muted">'+t('多个字段同时满足才返回；识别号采用精确匹配，不自动修正。','All supplied fields must match. Identifiers use exact matching without automatic correction.')+'</p>':'')+
 '<div class="entity-controls">'+button(t('从文件提取主体','Extract parties from a file'),'documents','secondary')+'<div>'+button(t('清空','Clear'),'clear','quiet-button')+' <button type="submit" class="primary" '+(!index?'disabled':'')+'>'+t(index?'查询名单':'载入名单中…',index?'Screen parties':'Loading lists…')+'</button></div></div></div></form></section>'+
 (state.batchProgress?'<div class="query-interpretation" role="status" aria-live="polite">'+esc(t('正在核对 '+state.batchProgress.done+' / '+state.batchProgress.total+' 个主体；完成后统一更新结果。下方仍为上次完成的结果，请以其查询条件为准。','Screening '+state.batchProgress.done+' / '+state.batchProgress.total+' parties; results update when the batch finishes. Any results below are from the last completed screening and retain its conditions.'))+' '+button(t('取消本批','Cancel this batch'),'cancel-batch','text-button','id="entity-cancel-batch"')+'</div>':'')+(state.error?'<div class="error-banner" role="alert">'+esc(L(state.error))+' '+(state.error.kind==='input'?'':button(t('重试载入','Retry loading'),'retry','text-button'))+'</div>':'')+
 (index?'<div class="entity-filters">'+options('source',facets.sources,state.regime==='CN'?t('中国默认来源（不含联合国辅助）','Default China sources (excluding UN auxiliary)'):t('全部来源','All sources'))+options('type',facets.types,t('全部类型','All types'))+options('status',facets.statuses,t('全部状态','All statuses'))+'</div>':'')+
 '<div class="entity-context"><span class="entity-context-number">'+(index?(state.source==='CN-UN'?index.metadata.counts.UNAuxiliary:index.metadata.counts[state.regime]).toLocaleString(state.lang==='zh'?'zh-CN':'en-US'):'—')+'</span><span>'+(state.source==='CN-UN'?t('条联合国辅助记录 · 中国适用性另核','UN auxiliary records · Chinese applicability requires review'):t('条列示记录 · 按所选制度独立检索','listing records · searched within the selected regime'))+'</span><span>'+t('记录数不等于主体数；同一主体可涉及不同措施。','Record counts are not unique-party counts; one party may have several measures.')+'</span></div>'+
 (state.source==='CN-UN'?'<div class="query-interpretation entity-un-scope"><strong>'+t('当前仅查询联合国辅助来源','Searching the UN auxiliary source only')+'</strong><p>'+t('这些记录不属于中国自主制裁清单。须分别核查联合国具体机制及中国实施要求；伊朗机制尤其需要核查中国官方立场，不能直接形成中国法交易禁止结论。','These records are not an autonomous Chinese sanctions list. Review each UN regime and Chinese implementation requirements separately. Iran-regime results particularly require review of China’s official position; they do not establish a Chinese-law transaction prohibition.')+'</p></div>':'')+'<div class="entity-result-output" aria-busy="'+Boolean(state.batchProgress)+'">'+(state.batch?batchPage():state.result?resultsPage():'<div class="entity-start"><div class="entity-step"><strong>01</strong><span>'+t('输入已知身份信息','Enter known identity details')+'</span></div><div class="entity-step"><strong>02</strong><span>'+t('比较名称、地址和识别号','Compare names, addresses, and IDs')+'</span></div><div class="entity-step"><strong>03</strong><span>'+t('核对措施及下一步动作','Review measures and next actions')+'</span></div></div>')+'</div>'+coverage(index);
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
function perform(keepOperation=false){if(!keepOperation)operation++;pendingBatchInputs=null;state.batchProgress=null;if(!indexes[state.regime])return;if(![state.query,state.name,state.address,state.identifier].some(x=>x.trim())){state.error={zh:'请至少填写名称、地址或识别号中的一项。',en:'Provide at least a name, address, or identifier.'};state.result=null;return;}state.error=null;state.batch=null;state.batchScope=null;state.result=E().search(indexes[state.regime],{regime:state.regime,query:state.query,name:state.name,address:state.address,identifier:state.identifier,source:state.source,type:state.type,status:state.status,fuzzy:state.fuzzy,offset:state.offset,limit:20});}
function loadFailure(){state.error={zh:'名单文件未能载入。请重试载入后重新查询。',en:'The list files could not load. Retry loading and screen again.'};rerender();}
async function setQuery(query){query=query&&typeof query==='object'?query:{};const regime=state.regime,token=++operation;pendingBatchInputs=null;state.batchProgress=null;state.detail=null;state.offset=0;state.query=textValue(query.query);state.name=textValue(query.name);state.address=textValue(query.address);state.identifier=textValue(query.identifier);state.advanced=!!(state.name||state.address||state.identifier);state.source=state.type=state.status='all';try{await ensure(regime);if(state.regime!==regime||token!==operation)return;perform(true);rerender();}catch{if(state.regime===regime&&token===operation)loadFailure();}}
async function batch(items){
 const regime=state.regime,token=++operation,source=state.source,type=state.type,status=state.status,fuzzy=state.fuzzy;
 state.batchProgress=null;pendingBatchInputs=null;
 if(!Array.isArray(items)||items.length===0||items.length>100){state.error={kind:'input',zh:items?.length>100?'每批最多查询100个主体。本批未执行，请拆分后重新提交；已有查询结果仍保留。':'请提供1至100个主体，本批未执行；已有查询结果仍保留。',en:items?.length>100?'Each batch supports up to 100 parties. This batch was not run. Split it and submit again; previous results are retained.':'Provide 1 to 100 parties. This batch was not run; previous results are retained.'};rerender();return {ok:false,error:'batch_size'};}
 if(items.some(item=>!item||typeof item!=='object'||Array.isArray(item))){state.error={kind:'input',zh:'批量数据包含无效行，本批未执行；请检查后重新提交。',en:'The batch contains an invalid row and was not run. Check the data and submit again.'};rerender();return {ok:false,error:'batch_row'};}
 const inputs=items.map(supplied=>({query:textValue(supplied.query),name:textValue(supplied.name),address:textValue(supplied.address),identifier:textValue(supplied.identifier)}));
 pendingBatchInputs=inputs;state.detail=null;state.error=null;state.batchProgress={done:0,total:inputs.length};rerender();
 try{
  // Let the pending state paint and accept cancellation before the first party.
  await yieldWork();if(state.regime!==regime||token!==operation)return;
  await ensure(regime);if(state.regime!==regime||token!==operation)return;
  const completed=[];let lastYield=clock();
  for(let i=0;i<inputs.length;i++){
   const input=inputs[i],result=E().search(indexes[regime],{...input,regime,source,type,status,limit:5,fuzzy});completed.push({input,result});
   if(i+1<inputs.length&&((i+1)%5===0||clock()-lastYield>=40)){
    state.batchProgress={done:i+1,total:inputs.length};rerender();await yieldWork();
    if(state.regime!==regime||token!==operation)return;lastYield=clock();
   }
  }
  state.result=null;state.batch=completed;state.batchScope={regime,source,type,status,fuzzy};pendingBatchInputs=null;state.batchProgress=null;rerender();
 }catch{if(state.regime===regime&&token===operation){pendingBatchInputs=null;state.batchProgress=null;loadFailure();}}
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
 document.addEventListener('submit',event=>{if(event.target.id!=='entity-search-form')return;event.preventDefault();state.offset=0;perform();rerender();document.querySelector('.entity-results')?.scrollIntoView({behavior:'smooth',block:'start'});});
 document.addEventListener('input',event=>{const field=event.target.dataset?.entField;if(field==='fuzzy')state.fuzzy=!!event.target.checked;else if(TEXT_FIELDS.has(field))state[field]=textValue(event.target.value);});
 document.addEventListener('change',event=>{const field=event.target.dataset?.entFilter;if(FILTER_FIELDS.has(field)){const repeat=pendingBatchInputs||(state.batch||[]).map(item=>item.input);operation++;pendingBatchInputs=null;state.batchProgress=null;state[field]=textValue(event.target.value);state.offset=0;if(repeat.length){batch(repeat);return;}if(state.result)perform();rerender();}});
 document.addEventListener('click',async event=>{const el=event.target.closest('[data-ent-action]');if(!el)return;const action=el.dataset.entAction;
 if(action==='advanced'){state.advanced=!state.advanced;rerender();}
 if(action==='documents')callbacks.onDocuments?.();
 if(action==='cancel-batch'){operation++;pendingBatchInputs=null;state.batchProgress=null;rerender();}
 if(action==='clear'){operation++;pendingBatchInputs=null;Object.assign(state,{query:'',name:'',address:'',identifier:'',source:'all',type:'all',status:'all',offset:0,result:null,batch:null,batchScope:null,batchProgress:null,detail:null,error:null});rerender();}
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
