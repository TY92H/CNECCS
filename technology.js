/* Isolated technology-directory integration. All user input stays in this page. */
(function () {
'use strict';
let ctx;
let currentQuery = '', intent = 'unknown', checkedCode = '', checkResult = null, detailsExpanded = null, resultOffset = 0;
const PAGE_SIZE = 12;
let indexedData = null, index = [], lastMatchKey = '', lastMatches = [];
const data = () => window.CNECCS_TECH_DATA || {records: [], notices: []};
const records = () => Array.isArray(data().records) ? data().records : [];
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value => String(value || '').toLowerCase().normalize('NFKC').replace(/[\s，,。;；:：()（）/\-]+/g, ' ').trim();
const tr = (zh,en) => ctx.state.lang === 'zh' ? zh : en;
const local = value => typeof value === 'object' && value ? (value[ctx.state.lang] || '') : String(value || '');
const bi = (zh,en) => ({zh,en});
const btn = (text,action,cls='secondary',attrs='') => ctx.button(text,action,cls,attrs);
const removed = record => /removed|deleted|删除/.test(String(record.status));
const prohibited = record => /prohibit|禁止/.test(String(record.classification));
const byCode = code => records().find(record => record.code === code);
const label = record => removed(record) ? tr('已从本目录删除','Removed from this directory') : prohibited(record) ? tr('目录禁止类','Prohibited category') : tr('目录限制类','Restricted category');
const genericTerms = new Set(['技术','工艺','制造','生产','制备','配方','材料','出口','管制','技术资料','技术服务','生产工艺','制造技术','制备技术','制造工艺','材料技术','技术出口','出口管制','设计','设备','系统','装置','产品','研发','开发','基础','加工','性能','technology','technologies','technical','process','processes','production','manufacturing','manufacture','preparation','formula','formulation','material','materials','export','control','information','service','services','formulations','design','system','systems','equipment','device','devices','product','products','development','research','performance','processing','method','methods','the','for','and','with','of','in','to','a','an']);
const textValues = value => typeof value === 'object' && value ? Object.values(value).filter(x=>typeof x==='string') : [String(value||'')];
function searchable(term) {return term && !genericTerms.has(term) && !/^\d+(?:\.\d+)?$/.test(term) && (term.length>1 || /[镓锂铍硼铀钍钨铟锗铪锆钽钼铯铷钴镍铂钛]/.test(term));}
function contains(text,term) {return /[\u3400-\u9fff]/.test(term) ? text.includes(term) : (' '+text.replace(/[^a-z0-9]+/g,' ')+' ').includes(' '+term.replace(/[^a-z0-9]+/g,' ').trim()+' ');}
function nearbySpelling(a,b) {
  if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1)return false;
  if(a===b)return true;
  if(a.length===b.length){const diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);return diff.length===1||(diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]]);}
  const short=a.length<b.length?a:b,long=a.length<b.length?b:a;let i=0,j=0,skipped=false;
  while(i<short.length&&j<long.length){if(short[i]===long[j]){i++;j++;}else if(skipped)return false;else{skipped=true;j++;}}
  return true;
}
function prepareIndex() {
  if(indexedData===data())return;
  indexedData=data();lastMatchKey='';
  index=records().map(record=>{const title=norm(textValues(record.title).join(' ')),keywords=[...new Set((record.keywords||[]).flatMap(textValues).map(norm).filter(searchable))];return {record,title,keywords,body:norm((record.blocks||[]).flatMap(textValues).join(' ')),englishTokens:[...new Set([title,...keywords].join(' ').match(/[a-z]{4,}/g)||[])].filter(searchable)};});
}
function matches(query) {
  const q = norm(query); if (!q || ctx.state.regime !== 'CN') return [];
  prepareIndex();if(lastMatchKey===q)return lastMatches;
  const codes = (q.match(/(?:^|[^a-z0-9])(\d{6}[jx])(?=$|[^a-z0-9])/g) || []).map(code=>code.replace(/^[^\d]+/,'').toUpperCase());
  const words=[...new Set(q.split(/[\s,;:!?。；，、]+/).filter(searchable))];
  if(!codes.length&&!words.length)return [];
  lastMatches=index.map(({record,title,body,keywords}) => {
    const exact=codes.includes(record.code);if(codes.length)return exact?{record,score:10000,exact}:null;
    if(removed(record))return null;
    let score=0;
    for(const keyword of keywords)if(contains(q,keyword))score+=Math.min(45,keyword.length*4);
    if(searchable(q)&&contains(title,q))score+=70;
    if(searchable(q)&&q.length<=80&&contains(body,q))score+=18;
    let found=0;
    for(const word of words){if(contains(title,word)){score+=12;found++;}else if(keywords.some(keyword=>contains(keyword,word))){score+=8;found++;}else if(contains(body,word)){score+=3;found++;}}
    // Multiword free text may contain specifications, but generic wording alone
    // must never surface an entire catalog as apparent technical matches.
    if(!score || (!/[\u3400-\u9fff]/.test(q)&&words.length>1&&found<Math.min(2,words.length)&&score<40))return null;
    return {record,score,exact:false};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.record.code.localeCompare(b.record.code));
  // A one-character misspelling is a secondary lead only. Never fuzzy-match
  // catalogue codes, removed entries, short abbreviations or numeric criteria.
  if(!lastMatches.length&&!codes.length&&words.length&&words.length<=5&&words.every(word=>/^[a-z]{4,}$/.test(word))){
    lastMatches=index.filter(item=>!removed(item.record)&&words.every(word=>item.englishTokens.some(token=>word===token||nearbySpelling(word,token)))).map(item=>({record:item.record,score:1,exact:false,approximate:true}));
  }
  lastMatchKey=q;return lastMatches;
}
function notices(query) {
  if (ctx.state.regime !== 'CN' || !/(人工智能|大模型|智能体|算力|生物医药|细胞|基因治疗|小核酸|病原微生物|光伏|光电|太阳能|多晶硅|硅片|钙钛矿|所有权|实际控制人|artificial intelligence|large language model|foundation model|intelligent agent|computing power|biomedicine|biomedical|cell therap|gene therap|small nucleic acid|pathogenic microorganism|photovoltaic|solar|polysilicon|silicon wafer|perovskite|ownership|actual controller|\bAI\b)/i.test(query)) return '';
  const list = data().notices || [];
  const note = list.find(item => /48/.test(JSON.stringify(item))) || list[0];const sourceURL=note?.sources?.[0]?.url||note?.url;
  return '<div class="tech-policy-note">'+ctx.icon('info',17)+'<div><strong>'+tr('另需核查技术出口登记要求','Also review technology-export registration')+'</strong><p>'+tr('相关技术可能另涉及现行技术出口登记要求。登记要求与拟议的目录调整应分别核查；征求意见稿不能当作已生效的禁止或限制条目。此提示不判断你的技术是否属于具体范围。','Relevant technologies may also involve current technology-export registration requirements. Review registration and proposed catalog changes separately: a consultation draft is not an effective prohibited or restricted entry. This notice does not determine whether your technology is covered.')+'</p>'+(note?.coverage?'<p>'+esc(local(note.coverage))+'</p>':'')+'<details class="tech-registration-details"><summary>'+tr('登记要求与核查事项','Registration requirements and checks')+'</summary><p>'+tr('自2026年10月16日起，相关临时登记要求已实施。请核对附件技术范围及交易安排：向境外转让所有权、授权境外使用、所有权人或实际控制人变更为境外主体，以及商务部明确要求的其他情形；已开始但尚未完成的出口也需核查。完成登记不等于取得出口许可；拟议的禁止／限制分类尚不能作为现行结论。','Temporary registration has applied since October 16, 2026. Check the annex scope and arrangements, including ownership transfers abroad, licensing for overseas use, a change to an overseas owner or actual controller, and other cases specified by MOFCOM. Exports already underway but not completed also require review. Registration is not an export license; proposed prohibited/restricted classifications are not yet effective conclusions.')+'</p></details>'+(sourceURL?'<a href="'+esc(ctx.safeURL(sourceURL))+'" target="_blank" rel="noopener noreferrer">'+tr('查看官方公告','Read the official notice')+'</a>':'')+'</div></div>';
}
function syncQuery(query) {if (currentQuery !== query) {currentQuery=query; intent='unknown';detailsExpanded=null;resultOffset=0;}}
function count(query) {return matches(query).length;}
function renderResults(query,existingCount=0) {
  if (ctx.state.regime !== 'CN') return '';
  syncQuery(query); const hits=matches(query), notice=notices(query);
  if(!records().length)return '<div class="notice">'+tr('技术目录资料尚未就绪；本次结果不包含技术目录核查，请刷新后重试。','Technology-directory data is unavailable. These results do not include technology-directory screening; refresh and try again.')+'</div>';
  resultOffset=Math.min(resultOffset,Math.max(0,Math.floor((hits.length-1)/PAGE_SIZE)*PAGE_SIZE));
  const visibleHits=hits.slice(resultOffset,resultOffset+PAGE_SIZE);
  if (!hits.length) return notice;
  const body = '<section class="technology-results" id="technology-results" aria-labelledby="technology-results-title"><div class="tech-section-heading"><h3 id="technology-results-title">'+tr('技术出口管理目录','Technology-export directory')+'</h3><span>'+hits.length+' '+tr('个相关候选','related candidates')+'</span></div><p class="tech-section-note">'+tr('与两用物项出口管制并行核查。目录类别描述条目本身，尚未认定你的产品或交易适用。','Review alongside dual-use export controls. A catalog category describes the entry; it does not establish that your product or transaction is covered.')+'</p><div class="result-list">'+visibleHits.map(({record:r,exact,approximate})=>'<article class="result-card tech-result-card"><div class="result-top"><span class="code">'+esc(r.code)+'</span><span class="pill">'+tr('技术出口管理','Technology-export management')+'</span><span class="pill tech-status '+(removed(r)?'historical':prohibited(r)?'prohibited':'restricted')+'">'+label(r)+'</span>'+(exact?'<span class="pill exact">'+tr('编号精确匹配','Exact code match')+'</span>':'')+'</div><h3>'+esc(local(r.title))+'</h3><p class="result-snippet">'+esc(local(r.summary))+'</p>'+(removed(r)?'<p class="tech-history-note">'+tr('删除仅涉及本目录；不能据此排除其他管制。','Removal concerns this directory only; it does not rule out other controls.')+'</p>':'')+'<div class="result-bottom"><span class="match-reason">'+(exact?tr('目录编号定位','Directory code located'):approximate?tr('近似拼写匹配，请先确认名称','Approximate spelling; confirm the name first'):tr('名称或技术内容相关，适用条件待核实','Related name or technical content; applicability unverified'))+'</span>'+btn(tr('查看条目','View entry'),'tech-detail','text-button','data-code="'+esc(r.code)+'"')+'</div></article>').join('')+'</div>'+renderPagination(hits.length)+renderIntent()+notice+'</section>';
  const explicit=/(技术|工艺|配方|生产|制造|许可|资料|源代码|培训|服务|\btechnolog(?:y|ies)\b|\bprocess\b|\btechnical\b|\blicens(?:e|ing|es)\b|\bmanufactur|\d{6}[jx])/i.test(query);
  if(!existingCount||explicit)return body;
  return '<details class="tech-fold" data-tech-expand '+(detailsExpanded?'open':'')+'><summary><span><strong>'+tr('另有 '+hits.length+' 项相关技术要求',hits.length+' related technology requirements')+'</strong><small>'+tr('涉及技术资料、工艺或服务时继续核对；适用性待确认。','Continue if technical information, processes or services are involved; applicability remains unverified.')+'</small></span><span class="tech-fold-arrow">'+ctx.icon('chevron',17)+'</span></summary>'+body+'</details>';
}
function intentOptions() {return [['goods',tr('实物交付','Physical goods')],['technology',tr('技术资料或服务','Technical information or services')],['both',tr('两者都有','Both')],['unknown',tr('暂不确定','Not sure')]];}
function renderIntent() {
  const follow = intent==='goods' ? tr('仅交付实物不能自动认定为技术出口，也不能排除随附技术资料或其他出口管制；仍请核实交付范围。','Physical delivery alone does not establish a technology export or rule out accompanying technical information and other export controls. Confirm the full scope of delivery.') : intent==='technology'||intent==='both' ? tr('可在条目详情中核对技术内容和提供方式，再查看适用的下一步。','Open an entry to check the technical scope and mode of provision, then review the appropriate next step.') : tr('可以暂不选择。名称相关只是线索，继续核对时仍可保留未知项。','You can leave this open. A name match is only a lead; unknown facts can remain open during the check.');
  return '<div class="tech-intent"><strong>'+tr('此次业务包含什么？','What does this transaction include?')+'</strong><span class="small muted">'+tr('可选，不改变目录类别','Optional; does not change the catalog category')+'</span><div class="tech-intent-options" role="group" aria-label="'+tr('业务内容','Transaction content')+'">'+intentOptions().map(([value,text])=>btn(text,'tech-intent','chip '+(intent===value?'selected':''),'data-value="'+value+'" aria-pressed="'+(intent===value)+'"')).join('')+'</div><p>'+follow+'</p></div>';
}
function isDetail() {return String(ctx?.state.detail || '').startsWith('TECH:');}
function openDetail(code) {const record=byCode(code);if(!record)return;const previousFocus=document.activeElement;ctx.closeOverlay();ctx.rememberFocus(previousFocus);ctx.state.detail='TECH:'+code;ctx.state.detailTab='overview';renderDetail();}
function renderDetail() {
  const r=byCode(ctx.state.detail.slice(5));if(!r)return;
  const tab=ctx.state.detailTab, title=esc(local(r.title));
  const overview='<div class="detail-summary"><h3>'+tr('先确认管理依据，再核实具体业务','Confirm the legal route, then the transaction')+'</h3><p>'+esc(local(r.summary))+'</p></div><div class="tech-detail-facts"><div><span>'+tr('管理依据','Legal framework')+'</span><strong>'+tr('禁止出口限制出口技术目录','Prohibited and Restricted Export Technologies Directory')+'</strong></div><div><span>'+tr('目录状态','Directory status')+'</span><strong>'+label(r)+(removed(r)&&r.removedOn?' · '+esc(r.removedOn):'')+'</strong></div><div><span>'+tr('行业','Industry')+'</span><strong>'+esc(local(r.industry))+'</strong></div></div><div class="notice">'+ctx.icon('info',18)+'<span>'+tr('检索命中不等于该技术内容及交易已满足适用条件；两用物项出口管制仍需另行核查。','A search hit does not establish that the technical content and transaction meet the applicable criteria. Dual-use export controls require separate review.')+'</span></div>'+(r.criteriaHints?'<p class="tech-criteria-hint">'+esc(local(r.criteriaHints))+'</p>':'')+'<h3>'+tr('下一步','Next step')+'</h3><p>'+esc(local(r.nextStep))+'</p><div class="detail-actions">'+btn(tr('阅读完整条文','Read full provision'),'detail-tab','primary','data-value="full"')+(!removed(r)?btn(tr('核对业务与技术条件','Check transaction and technical scope'),'tech-check','secondary','data-code="'+esc(r.code)+'"'):'')+'</div>';
  const full='<div class="detail-actions">'+ctx.languageSwitch()+btn(tr('打印条文','Print provision'),'print','secondary')+'</div>'+(ctx.state.lang==='en'?'<div class="translation-note">Unofficial reference translation. The Chinese original governs interpretation; switch the language to read it.</div>':'')+'<div class="source-strip">'+tr('以下保留本条目完整控制点。必须结合控制点之间的逻辑关系、注释及交易事实阅读。','The complete control points for this entry follow. Read their logical relationships and notes together with the transaction facts.')+'</div><div class="fulltext-content">'+(r.blocks||[]).map(block=>'<div class="block tech-source-block">'+esc(local(block))+'</div>').join('')+'</div>';
  const source='<div class="source-strip"><strong>'+tr('原始目录与修改依据','Original directory and amendment trail')+'</strong><p>'+tr('现行内容按照2023年目录与2025年调整编纂；来源日期不等同于本条目首次设立日期。','Current text is consolidated from the 2023 directory and the 2025 amendment. A source date is not necessarily the date an entry was first established.')+'</p></div>'+(r.sources||[]).map(s=>'<article class="tech-source"><h3>'+esc(local(s.title)||tr('官方文件','Official document'))+'</h3><p>'+esc(s.date||'')+((s.pages||[]).length?' · '+tr('PDF 第 ','PDF page ')+esc(s.pages.join(', ')):'')+'</p>'+(s.note||s.role?'<p>'+esc(local(s.note||s.role))+'</p>':'')+(s.url?'<a class="secondary" href="'+esc(ctx.safeURL(s.url))+'" target="_blank" rel="noopener noreferrer">'+tr('打开官方来源','Open official source')+'</a>':'')+'</article>').join('')+scopeNote();
  document.getElementById('overlay-root').innerHTML='<div class="overlay" data-action="overlay-close"><section class="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title"><header class="drawer-head"><div><div class="result-top"><span class="code">'+esc(r.code)+'</span><span class="pill tech-status">'+label(r)+'</span></div><h2 id="detail-title">'+title+'</h2></div>'+btn(ctx.icon('close',22),'close','icon-button','aria-label="'+tr('关闭','Close')+'"')+'</header><div class="drawer-body"><div class="drawer-tabs" role="group" aria-label="'+tr('详情视图','Detail view')+'">'+[['overview',tr('条目概览','Overview')],['full',tr('完整条文与注释','Full text & notes')],['source',tr('来源与关联','Sources & context')]].map(([value,text])=>btn(text,'detail-tab',tab===value?'active':'','data-value="'+value+'" aria-pressed="'+(tab===value)+'"')).join('')+'</div>'+(tab==='full'?full:tab==='source'?source:overview)+'</div><footer class="drawer-foot"><span>'+tr('条目属性与交易适用性分别核实','Review entry status and transaction applicability separately')+'</span>'+btn(tr('复制编号','Copy code'),'copy-code','text-button','data-value="'+esc(r.code)+'"')+'</footer></section></div>';
  document.body.style.overflow='hidden';document.querySelector('.drawer-tabs .active')?.focus({preventScroll:true});
}
function scopeNote() {
  const current=records().filter(record=>!removed(record)), history=records().length-current.length;
  const prohibitedCount=current.filter(prohibited).length,restrictedCount=current.length-prohibitedCount;
  const coverage=data().meta?.scope||data().metadata?.scope;
  const fallback=tr('依据2023年目录与2025年调整整合，包含 '+current.length+' 条现行记录（禁止类 '+prohibitedCount+' 条、限制类 '+restrictedCount+' 条）及 '+history+' 条已删除历史记录。历史记录仅通过旧编号定位。未命中不能作为不受限制的依据。英文内容为非官方参考译文。','Consolidated from the 2023 directory and 2025 amendment: '+current.length+' current entries ('+prohibitedCount+' prohibited and '+restrictedCount+' restricted), plus '+history+' removed historical entries. Historical entries are located only by their former codes. No match does not establish that technology is unrestricted. English text is an unofficial reference translation.');
  return '<div class="tech-scope-note"><strong>'+tr('资料范围','Reference coverage')+'</strong><p>'+esc(coverage?local(coverage):fallback)+'</p></div>';
}
function renderPagination(total) {
  if(total<=PAGE_SIZE)return '';
  const page=Math.floor(resultOffset/PAGE_SIZE)+1,pages=Math.ceil(total/PAGE_SIZE);
  return '<div class="tech-pagination" role="group" aria-label="'+tr('技术目录结果翻页','Technology-directory pagination')+'">'+btn(tr('上一页','Previous'),'tech-page','secondary','data-offset="'+Math.max(0,resultOffset-PAGE_SIZE)+'"'+(resultOffset===0?' disabled':''))+'<span>'+tr('第 '+page+' / '+pages+' 页','Page '+page+' of '+pages)+'</span>'+btn(tr('下一页','Next'),'tech-page','secondary','data-offset="'+(resultOffset+PAGE_SIZE)+'"'+(resultOffset+PAGE_SIZE>=total?' disabled':''))+'</div>';
}
function scenarioCard() {return ctx.state.regime==='CN'?'<button class="scenario-card" data-action="tech-check"><span class="feature-icon">'+ctx.icon('file',22)+'</span><h3>'+tr('技术对外提供','Providing technology abroad')+'</h3><p>'+tr('核对交付内容、技术范围及交易阶段，再确定下一步。','Review delivery content, technical scope and transaction stage to identify next steps.')+'</p><span class="text-button">'+tr('开始核对','Start a check')+' '+ctx.icon('arrow',15)+'</span></button>':'';}
function openCheck(code) {checkedCode=code||'';ctx.closeOverlay();ctx.state.page='check';ctx.state.scenario='technology-transfer';ctx.state.answers={business:intent};checkResult=null;ctx.state.menu=false;ctx.render();document.getElementById('main')?.focus({preventScroll:true});window.scrollTo({top:0});}
function isCheck() {return ctx.state.regime==='CN' && ctx.state.scenario==='technology-transfer';}
const options = rows => rows.map(([value,zh,en])=>({value,label:bi(zh,en)}));
function questions() {
  const a=ctx.state.answers,r=byCode(checkedCode),rows=[
    {id:'business',type:'select',label:bi('此次对外提供什么？','What will be provided?'),options:options([['goods','仅实物交付','Physical goods only'],['technology','技术资料、许可或技术服务','Technical information, licenses or services'],['both','实物与技术内容都有','Both goods and technical content'],['unknown','暂不确定','Unknown']])},
    {id:'location',type:'select',label:bi('技术由何处向何处提供？','Where is the technology provided from and to?'),hint:bi('关注资料访问、许可及服务的实际安排，不仅是收货地址。','Consider actual access, licensing and service arrangements, not only the delivery address.'),options:options([['outbound','从中国境内向境外提供','From within China to outside China'],['domestic','双方及提供过程均在中国境内','Both parties and provision remain within China'],['mixed','跨境与境内安排并存，或涉及转提供','Mixed domestic/cross-border arrangements or onward provision'],['unknown','地点或对象情况尚不明确','Location or recipient is unclear']])}
  ];
  if(r?.code==='252604X') rows.push({id:'branch',type:'select',label:bi('涉及哪一项技术内容？','Which technical subject is involved?'),options:options([['lfp','磷酸铁锂制备技术（第1点）','Lithium iron phosphate preparation (point 1)'],['other','本条目其他控制点','Other control points in this entry'],['unknown','尚未确定具体控制点','Control point not yet identified']])});
  if(r?.code==='252604X'&&a.branch==='lfp') rows.push(
    {id:'formula',type:'select',label:bi('材料是否符合化学通式 LixFeyMzPO4？','Does the material satisfy the formula LixFeyMzPO4?'),hint:bi('x、y、z ≥ 0；M为除Li、Fe之外的其他一个或多个元素。须核实制备技术而非仅产品名称。','x, y, z ≥ 0; M is one or more elements other than Li and Fe. Verify the preparation technology, not merely the product name.'),options:options([['yes','已核实符合','Verified yes'],['no','已核实不符合','Verified no'],['unknown','尚未核实','Unknown']])},
    {id:'density',type:'number',min:0,label:bi('220 MPa 下粉体压实密度','Powder compaction density at 220 MPa'),unit:'g/cc',hint:bi('目录条件：≥ 2.58 g/cc；压力条件不能省略。','Directory criterion: ≥ 2.58 g/cc; the pressure condition is essential.')},
    {id:'capacity',type:'number',min:0,label:bi('0.1 C 放电克容量','Discharge specific capacity at 0.1 C'),unit:'mAh/g',hint:bi('目录条件：≥ 160 mAh/g；请确认放电倍率。','Directory criterion: ≥ 160 mAh/g; verify the discharge rate.')},
    {id:'efficiency',type:'number',min:0,max:100,label:bi('首次库伦效率','First-cycle coulombic efficiency'),unit:'%',hint:bi('目录条件：≥ 97%。','Directory criterion: ≥ 97%.')},
    {id:'measurement',type:'select',label:bi('是否已核实以上测试条件及资料依据？','Have the stated measurement conditions and supporting data been verified?'),options:options([['yes','是，测试条件及资料已核实','Yes, conditions and evidence verified'],['no','否，测试条件不一致','No, conditions differ'],['unknown','尚未核实','Unknown']])}
  );
  else rows.push({id:'scope',type:'select',label:bi('完整条目中的技术范围与条件，核实到哪一步？','How far have you verified the full technical scope and criteria?'),hint:r?bi('请先阅读 '+r.code+' 完整控制点，并按相关控制点分别核对；不能因其中一项不满足而排除全部并列控制点。名称相同并不足以认定符合。','Read '+r.code+' by relevant control point. Failure of one parallel control point does not exclude the entire entry. A matching name is insufficient.'):bi('尚未选择条目时，应先返回检索并定位候选。','If no entry is selected, return to search and identify a candidate first.'),options:options([['met','已依据完整条文核实相关条件均满足','Relevant conditions verified against the complete provision'],['notmet','已核对的具体控制点有必要条件不满足（不代表排除整条）','A required condition of the reviewed control point is not met (does not exclude the entire entry)'],['unknown','尚未核实／仍有未知条件','Not yet verified or facts remain unknown']])});
  rows.push({id:'stage',type:'select',label:bi('目前处于什么阶段？','What stage has the transaction reached?'),options:options([['planning','意向沟通，尚未进行实质性谈判','Exploratory discussions; no substantive negotiations'],['negotiation','准备开展或正在进行实质性谈判','Preparing for or conducting substantive negotiations'],['signed','已签约，尚未交付技术','Contract signed; technology not yet delivered'],['delivered','已提供部分或全部技术','Some or all technology has been provided'],['unknown','阶段不明确','Stage unclear']])});return rows;
}
function checkPage() {
  const r=byCode(checkedCode),qs=questions(),a=ctx.state.answers,completed=qs.filter(q=>a[q.id]!==undefined&&a[q.id]!==''&&a[q.id]!=='unknown').length;
  return '<div class="tech-back-actions">'+btn(ctx.icon('back',16)+tr('返回检索结果','Back to search results'),'tech-back','back-link')+btn(tr('全部核对场景','All check scenarios'),'all-scenarios','back-link')+'</div><div class="page-heading"><div><div class="eyebrow">'+tr('中国 / 条件核对','China / Criteria check')+'</div><h1>'+tr('核实技术内容与提供方式。','Review the technology and how it is provided.')+'</h1><p>'+(r?esc(r.code)+' · '+esc(local(r.title)):tr('先梳理业务事实，再定位适用条目。','Establish the transaction facts, then identify the applicable entry.'))+'</p></div>'+ctx.regimeTabs()+'</div><div class="guide-layout"><div><form id="technology-criteria-form" class="form-card"><div class="form-card-head"><h2>'+tr('只填写已核实的信息','Provide only verified information')+'</h2><p>'+tr('未知项可以保留；不会由搜索相似度自动推导法律结论。','Unknowns can remain open. Search similarity will not be converted into a legal determination.')+'</p></div><div class="question-fields">'+qs.map(ctx.renderQuestion).join('')+'</div><div class="form-submit">'+btn(tr('清空本次输入','Clear answers'),'tech-clear','quiet-button')+'<button class="primary" type="submit">'+tr('查看核对结果','Review criteria')+ctx.icon('arrow',16)+'</button></div></form>'+(checkResult?renderCheckResult():'')+'</div><aside class="guide-sidebar">'+ctx.icon('sliders',25)+'<h3>'+tr('本次核对','Your check')+'</h3><div class="progress"><i style="width:'+Math.round(completed/Math.max(qs.length,1)*100)+'%"></i></div><p>'+tr('已填写 '+completed+' / '+qs.length+' 项信息',completed+' of '+qs.length+' fields provided')+'</p>'+(r?'<p><span class="code">'+esc(r.code)+'</span> · '+label(r)+'</p>'+btn(tr('阅读完整条目','Read the complete entry'),'tech-detail','secondary','data-code="'+esc(r.code)+'"'):'<p>'+tr('当前尚未选择目录条目，不能据此完成技术范围判断。','No directory entry has been selected; its technical scope cannot yet be determined.')+'</p>')+'<hr><p>'+tr('这里核对的是目录关联及下一步，不生成“可出口”证明。并行的两用物项与主体限制仍需分别核查。','This check identifies directory-related issues and next steps; it does not certify export clearance. Parallel dual-use and party restrictions require separate review.')+'</p></aside></div>';
}
function evaluate() {
  const a=ctx.state.answers,r=byCode(checkedCode),missing=questions().filter(q=>a[q.id]===undefined||a[q.id]===''||a[q.id]==='unknown').map(q=>q.id);let technical='unknown';
  if(r?.code==='252604X'&&a.branch==='lfp'){
    const nums=['density','capacity','efficiency'];const valid=nums.every(k=>a[k]!==undefined&&a[k]!==''&&Number.isFinite(Number(a[k]))&&Number(a[k])>=0)&&Number(a.efficiency)<=100;
    if(a.formula==='no'||(valid&&a.measurement==='yes'&&(Number(a.density)<2.58||Number(a.capacity)<160||Number(a.efficiency)<97)))technical='notmet';
    else if(a.formula==='yes'&&valid&&a.measurement==='yes')technical='met';
  }else if(r&&['met','notmet'].includes(a.scope)&&(r.code!=='252604X'||a.branch==='other'))technical=a.scope;
  return {missing,technical,record:r};
}
function renderCheckResult() {
  const a=ctx.state.answers,{missing,technical,record:r}=checkResult;
  const points=[];
  points.push([tr('目录类别','Directory category'),r?label(r)+tr('。这是条目属性，不是本次交易的最终结论。','. This is an entry attribute, not a final conclusion for this transaction.'):tr('未选择目录条目，需要先定位具体控制点。','No directory entry selected. Identify a specific control point first.')]);
  points.push([tr('技术范围','Technical scope'),technical==='met'?tr('根据你确认的资料，所核对的局部技术条件可能吻合。仍需结合完整条目和业务事实复核。','Based on the information you confirmed, the limited technical criteria checked may align. Review the complete entry and transaction facts.'):technical==='notmet'?tr('有已核实的必要条件未满足。这仅适用于本次控制点核对，不能排除其他控制点或制度。','A verified required condition is not met. This applies only to the control point reviewed; other points or regimes may still apply.'):tr('关键技术条件尚未充分核实。请补齐技术资料或测试条件，暂不形成适用结论。','Key technical criteria remain unverified. Obtain technical information or measurement conditions before deciding applicability.')]);
  points.push([tr('业务范围','Transaction scope'),a.business==='goods'?tr('你选择了仅交付实物。请确认是否同时提供工艺、许可、技术资料、培训或远程支持；不能由产品命中直接认定技术出口。','You selected physical goods only. Check for accompanying processes, licenses, technical information, training or remote support. A product match does not establish a technology export.'):a.location==='domestic'?tr('你选择了境内安排。请进一步核实技术接收方、访问权限及后续跨境提供，分别核查适用法律。','You selected domestic arrangements. Verify recipients, access rights and subsequent cross-border provision, and assess each applicable legal regime.'):tr('核实技术实际提供、使用及访问的安排，确认是否构成相关制度下的技术出口；涉及两用技术时还应并行核查。','Verify actual provision, use and access to determine whether the arrangements constitute a technology export under the relevant regime. Review dual-use rules in parallel where relevant.')]);
  let next=tr('先补齐未知信息，再针对候选条目核实技术范围及业务安排。','Complete unknown facts, then verify the technical scope and transaction arrangements against the candidate entry.');
  if(r&&technical==='met'&&['technology','both'].includes(a.business)&&a.location==='outbound')next=local(r.nextStep);
  if(a.stage==='signed'||a.stage==='delivered')next+=' '+tr('你已进入签约或技术提供阶段；请优先核查此前应完成的程序及现有履行安排，必要时向主管部门核实。','You have reached the contract or technology-delivery stage. Prioritize review of procedures that should already have been completed and current performance arrangements; clarify them with the competent authority where necessary.');
  else if(a.stage==='negotiation'&&r&&!prohibited(r))next+=' '+tr('如适用技术进出口管理制度下的限制技术许可程序，应在实质性谈判前核查许可意向书要求；涉及两用技术时，先核实实际适用的办理路径。','Where the restricted-technology licensing procedure under the technology import/export regime applies, check the letter-of-intent requirement before substantive negotiations. For dual-use technology, first confirm the applicable procedural route.');
  return '<section class="check-report tech-check-report" id="check-report" aria-live="polite"><div class="report-status">'+ctx.icon('info',23)+'<div><div class="eyebrow">'+tr('条件核对结果','Criteria review')+'</div><h2>'+tr(missing.length?'仍有信息需要核实':'继续核实适用范围与程序',missing.length?'Further facts need verification':'Review applicability and required procedures')+'</h2></div></div>'+points.map(([name,text])=>'<div class="check-row"><span class="tech-neutral-dot"></span><div><strong>'+name+'</strong><p>'+esc(text)+'</p></div></div>').join('')+(missing.length?'<div class="notice"><div><strong>'+tr('待补充的信息','Information still needed')+'</strong><div class="suggested-codes">'+questions().filter(q=>missing.includes(q.id)).map(q=>btn(esc(local(q.label)),'focus-question','chip','data-value="'+esc(q.id)+'"')).join('')+'</div></div>':'')+'<div class="tech-next-step"><h3>'+tr('建议的下一步','Suggested next step')+'</h3><p>'+esc(next)+'</p></div><p class="small muted">'+tr('本结果仅记录你提供的信息及所核对的局部条件，不构成法律意见、许可决定或出口放行结论。','This result records your information and the limited criteria reviewed. It is not legal advice, a licensing decision or export clearance.')+'</p><div class="detail-actions">'+btn(tr('下载本次核对记录','Download this review'),'tech-export','secondary')+btn(tr('返回检索结果','Back to search results'),'tech-back','secondary')+'</div></section>';
}
function handleAction(action,el) {
  if(!action.startsWith('tech-'))return false;
  if(action==='tech-detail')openDetail(el.dataset.code);
  if(action==='tech-page'){resultOffset=Math.max(0,Number(el.dataset.offset)||0);detailsExpanded=true;ctx.render();document.getElementById('technology-results')?.scrollIntoView({block:'start'});}
  if(action==='tech-intent'){intent=el.dataset.value;ctx.render();}
  if(action==='tech-check')openCheck(el.dataset.code);
  if(action==='tech-back'){ctx.closeOverlay();ctx.state.page='search';ctx.state.menu=false;ctx.render();document.getElementById('results')?.scrollIntoView({block:'start'});}
  if(action==='tech-clear'){ctx.state.answers={};checkResult=null;ctx.render();}
  if(action==='tech-export'&&checkResult){const r=byCode(checkedCode);const html='<!doctype html><meta charset="utf-8"><title>CNECCS</title><style>body{font:15px/1.7 system-ui;max-width:850px;margin:30px auto;padding:20px}button{display:none}p{white-space:pre-wrap}</style><h1>CNECCS · '+tr('技术条件核对记录','Technology criteria review')+'</h1><p>'+esc(r?.code||'')+' · '+esc(local(r?.title))+'</p>'+questions().map(q=>'<p><strong>'+esc(local(q.label))+'</strong><br>'+esc(q.type==='select'?local(q.options.find(o=>o.value===ctx.state.answers[q.id])?.label):ctx.state.answers[q.id]||tr('未提供','Not provided'))+(q.unit?' '+esc(q.unit):'')+'</p>').join('')+renderCheckResult();ctx.download('CNECCS-technology-review.html',html,'text/html');}
  return true;
}
function submit(event){if(event.target.id!=='technology-criteria-form')return false;event.preventDefault();checkResult=evaluate();ctx.render();document.getElementById('check-report')?.scrollIntoView({behavior:'smooth',block:'start'});return true;}
function invalidate(){checkResult=null;}
function configure(context){ctx=context;document.addEventListener('toggle',event=>{if(event.target.matches?.('[data-tech-expand]'))detailsExpanded=event.target.open;},true);}
window.CNECCSTechnology={configure,matches,count,renderResults,isDetail,renderDetail,openDetail,scenarioCard,isCheck,checkPage,handleAction,submit,invalidate,scopeNote};
})();
