const $=id=>document.getElementById(id);let data={projects:[]},view='product',busy=false;
const active=()=>data.projects.find(p=>p.id===data.activeId);
async function send(type,extra={}){const r=await chrome.runtime.sendMessage({type,...extra});if(!r?.ok)throw Error(r?.error||'No response received.');data=r.data;render();return data;}
function render(){
 const p=active();$('projects').replaceChildren(...data.projects.map(p=>Object.assign(document.createElement('option'),{value:p.id,textContent:p.name})));$('projects').value=data.activeId||'';$('main').hidden=!p;$('delete').disabled=!p;if(!p)return;
 if(document.activeElement!==$('active-keyword'))$('active-keyword').value=p.config.keyword;
 $('keyword-history').replaceChildren(...(p.config.keywords||[p.config.keyword]).map(k=>Object.assign(document.createElement('option'),{value:k})));
 $('set-keyword').disabled=$('active-keyword').disabled=Boolean(p.job?.running);
 const companies=Model.companies(p),identified=companies.filter(c=>c.profileId).length;
 $('stats').textContent=`${identified} unique profile IDs · ${companies.length-identified} company rows with missing IDs\n${p.records.filter(r=>r.productUrl).length} captured products · ${p.records.filter(r=>!r.productUrl).length} company-only cards`;
 $('config').textContent=`Active keyword: ${p.config.keyword} | ${(p.config.keywords||[p.config.keyword]).length} keywords | ${p.captures.length} page captures | Raw results`;
 $('status').textContent=(p.job?.running?`Pagination running. ${p.job.done}${p.job.limit?' of '+p.job.limit+' pages':' pages captured (automatic stop)'}\n`:'')+(p.lastMessage||'Ready to capture');
 $('capture').disabled=$('start').disabled=data.projects.some(p=>p.job?.running);$('stop').disabled=!p.job?.running;
 $('records').replaceChildren(...p.records.filter(r=>Model.status(p,r)===view).slice().reverse().map(r=>{
  const div=document.createElement('div');div.className='record';
  const name=document.createElement('b');name.textContent=r.companyName;
  const title=document.createElement('div');title.textContent=r.productName||'Company card without a product title';
  const note=document.createElement('small');note.textContent=`ID: ${Model.profileId(r)||'Unknown'} | ${r.businessType||'Business type unavailable'} | ${Model.keywords(r).join(', ')}`;
  div.append(name,title,note);return div;
 }));
}
async function action(fn){if(busy)return;busy=true;try{await fn();}catch(e){$('status').textContent=e.message;}finally{busy=false;}}
async function tab(){const [t]=await chrome.tabs.query({active:true,currentWindow:true});if(!t?.id)throw Error('No active tab found.');return t;}
$('new').onclick=()=>{$('form').hidden=false;};$('cancel').onclick=()=>{$('form').hidden=true;};
$('form').onsubmit=e=>{e.preventDefault();void action(async()=>{await send('create',{name:$('name').value,config:{keyword:$('keyword').value.trim()}});$('form').hidden=true;});};
$('projects').onchange=()=>action(()=>send('select',{id:$('projects').value}));
$('delete').onclick=()=>{if(confirm('Delete this project and its data? You can create a backup first.'))action(()=>send('delete'));};
$('capture').onclick=()=>action(async()=>send('capture',{tabId:(await tab()).id}));
$('start').onclick=()=>{
 const permission=chrome.permissions.request({origins:['https://www.tradeindia.com/*','https://tradeindia.com/*']});
 void action(async()=>{if(!await permission)throw Error('Pagination access was declined. You can still capture one page at a time.');await send('start',{tabId:(await tab()).id,limit:$('limit').value.trim()===''?null:Number($('limit').value)});});
};
$('set-keyword').onclick=()=>action(()=>send('setKeyword',{keyword:$('active-keyword').value}));
$('stop').onclick=async()=>{try{await send('stop');}catch(e){$('status').textContent=e.message;}};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;render();};
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);}
function filename(p){return p.name.replace(/[^a-zA-Z0-9\u0600-\u06ff_-]+/g,'_').slice(0,70)||'TradeIndia';}
$('backup').onclick=()=>{const p=active();if(p)download(new Blob([JSON.stringify({format:'CAPA-TI-1',project:p},null,2)],{type:'application/json'}),filename(p)+'.json');};
$('restore').onclick=()=>{$('file').click();};$('file').onchange=()=>action(async()=>{const f=$('file').files[0];if(f)await send('import',{data:JSON.parse(await f.text())});$('file').value='';});
function sheets(p){
 const list=(r,field)=>[...new Set([r[field],...(r.evidence||[]).map(e=>e[field])].filter(Boolean))].join('\n');
 const headers=['Profile ID','Company','Location (as listed)','Business Type (as listed)','Product Title (card)','Product URL','Profile URL','Company Link (may be ad)','Pages','Source URLs','Keywords','Sponsored','Captured At','Observed Product Titles','Site Manufacturer Filter Observed'];
 const rows=records=>records.map(r=>[Model.profileId(r),r.companyName,list(r,'location'),list(r,'businessType'),r.productName,r.productUrl,r.companyUrl,r.companyLink,[...new Set((r.evidence||[]).map(e=>e.page))].join(', '),[...new Set((r.evidence||[]).map(e=>e.sourceUrl))].join('\n'),Model.keywords(r).join('\n'),r.sponsored?'yes':'no',r.capturedAt,list(r,'productName'),[...new Set((r.evidence||[]).filter(e=>typeof e.manufacturerFilter==='boolean').map(e=>e.manufacturerFilter?'on':'off'))].join(' / ')||'Not logged (legacy)']);
 const companies=Model.companies(p);
 return [
  {name:'Companies',headers:['Profile ID','Company','Location (as listed)','Business Type (as listed)','Profile URL','Products (card titles)','Product URLs','Pages','Keywords','Source URLs','Card Type','Identity Evidence','Company Link (may be ad)','Site Filters Observed'],rows:companies.map(c=>[c.profileId,c.name,c.location,c.business,c.url,c.products,c.links,c.pages,c.keywords,c.sources,c.cardType,c.identity,c.companyLinks,c.filters])},
  {name:'Collected Products',headers,rows:rows(p.records.filter(r=>r.productUrl))},
  {name:'Company Only',headers,rows:rows(p.records.filter(r=>!r.productUrl))},
  {name:'Page Audit',headers:['Capture Time','Page','URL','Site Reported Total','Cards','Product Cards','Non-sponsored Product Cards','New Sponsored Product Cards','Useful Product Cards (stop rule)','Company Only Cards','New Records','Manufacturer Filter Observed','Keyword','Scroll Steps','Scroll Time (ms)','Loaded Company Headings'],rows:p.captures.map(c=>[c.at,c.page,c.url,c.reportedTotal,c.cards,c.productCards,c.nonSponsoredProductCards,c.newSponsoredProductCards,c.usefulProductCards,c.companyOnlyCards,c.newRecords,c.filter,c.keyword||Model.keywordFromUrl(c.url),c.scroll?.steps,c.scroll?.elapsedMs,c.scroll?.loadedCompanyHeadings])},
  {name:'Run Log',headers:['Time','Event','Keyword','Page URL','Stage','Message'],rows:(p.events||[]).map(e=>[e.at,e.type,e.keyword,e.pageUrl||'',e.stage||'',e.message])},
  {name:'Settings',headers:['Setting','Value'],rows:[['Name',p.name],['Active keyword',p.config.keyword],['Project keywords',(p.config.keywords||[p.config.keyword]).join('\n')],['Mode','Raw card extraction; no relevance or business-role filtering'],['Companies','All captured profile identities, including company-only cards. Blank product fields mean no product evidence on captured cards.'],['Deduplication','Only profile IDs are merged; different profile IDs are retained even with equal names. Missing IDs are explicitly marked and not merged by name.'],['Filters','Site filters are observed and preserved when possible. They do not establish manufacturer status and do not remove captured rows.'],['Products','Titles read from search cards, not the company catalogue. Related and unrelated products are both retained.'],['Saturation','Two consecutive pages with no non-sponsored product cards or newly encountered sponsored product cards. This is a structural stopping heuristic, not proof of exhaustive site coverage.'],['Legacy reviews','Previous acceptance/exclusion decisions are retained in backup only and are ignored in this raw export.'],['Coverage','Observed rendered cards only; site-reported total is not a verified extraction target. Scroll completion is logged.'],['Location','Copied as listed; country is not inferred from city.']]}
 ];
}
$('excel').onclick=()=>{const p=active();if(p)download(Workbook.create(sheets(p)),filename(p)+'_Raw.xlsx');};
void (async()=>{
 if(chrome.storage.local?.get){const cached=(await chrome.storage.local.get('capa_ti_v1')).capa_ti_v1;if(cached){data=cached;render();}}
 await send('get');
})().catch(e=>{$('status').textContent=e.message;});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.capa_ti_v1){data=changes.capa_ti_v1.newValue;render();}});
