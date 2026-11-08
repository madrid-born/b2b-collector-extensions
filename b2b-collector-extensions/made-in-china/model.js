/* Pure data operations; no network or browser permissions. */
function micIdentity(source){const u=new URL(source),p=decodeURIComponent(u.pathname);micSiteURL(source);let word,filters,page;
 const match=p.match(/^\/company-search\/([^/]+)\/([^/]+)\/(\d+)\.html$/);
 if(match){word=match[1].replace(/\+/g,' ').trim().toLowerCase();filters=match[2].split('--').sort().join('--');page=Number(match[3]);}
 else if(/^\/manufacturers\//.test(p)){const m=p.match(/^\/manufacturers\/(.+?)(?:_(\d+))?\.html$/);if(!m)throw Error('Supplier List URL required');word=m[1].toLowerCase();filters='huntq';page=Number(m[2]||1);}
 else if(p==='/companysearch.do'){word=(u.searchParams.get('word')||'').trim().toLowerCase();const keys=[...u.searchParams.keys()].filter(k=>!['pv_id','bv_id','pbv_id','faw_id','page','word'].includes(k));filters=keys.sort().map(k=>k+'='+u.searchParams.get(k)).join('&');page=Number(u.searchParams.get('page')||1)}else{const clean=new URL(u.href);clean.hash='';for(const k of ['pv_id','bv_id','pbv_id','faw_id','page','pageNo','pageNum','pageIndex','p'])clean.searchParams.delete(k);clean.searchParams.sort();word=(u.searchParams.get('word')||u.searchParams.get('keyword')||'').trim().toLowerCase();filters='url:'+clean.href;page=Number(u.searchParams.get('page')||u.searchParams.get('pageNo')||u.searchParams.get('pageNum')||u.searchParams.get('pageIndex')||u.searchParams.get('p')||1);}if(!Number.isSafeInteger(page)||page<1)throw Error('Invalid supplier page number');return {search:word+'::'+filters,page,word,filters};}
function micSiteURL(source){const u=new URL(source);if(u.protocol!=='https:'||!/(^|\.)made-in-china\.com$/i.test(u.hostname)||u.username||u.password)throw Error('Open an HTTPS Made-in-China page.');return u.href;}
function micContentSignature(data){
 const normalize=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase().replace(/iso\s+(\d+)/g,'iso$1');
 const word=normalize(data.query).replace(/[-_+]+/g,' ').replace(/\s+/g,' ').trim();if(!word)throw Error('Search query could not be read');
 const filters=Object.entries(data.selectedFilters||{}).filter(([,v])=>String(v).trim()).map(([k,v])=>[normalize(k),normalize(v)]);
 if(!filters.some(([k])=>k==='business type')&&data.manufacturerFilter)filters.push(['business type','manufacturer/factory']);
 if(!filters.some(([k])=>k==='management certification')&&data.certificateCodes?.length)filters.push(['management certification',data.certificateCodes.map(c=>c==='28'?'iso13485':c).sort().join('|')]);
 return JSON.stringify([word,filters.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}
// Keep a legacy first-page URL with its canonical subsequent pages, retaining the real source.
function micPageIdentity(data){
 micSiteURL(data.source);
 if(data.contentVersion===1){const page=Number(data.pagination?.current);if(!Number.isSafeInteger(page)||page<1)throw Error('Page number could not be read');const signature=micContentSignature(data);return {search:'content:v1::'+signature,word:data.query,filters:signature,page};}
 const id=micIdentity(data.source),source=new URL(data.source);
 if(source.pathname==='/companysearch.do'&&data.next){
  const next=new URL(data.next);if(next.pathname.startsWith('/company-search/')){
   const n=micIdentity(data.next),word=s=>s.replace(/[+\s-]+/g,' ').trim().toLowerCase();
   if(word(id.word)!==word(n.word))throw Error('Next-page query changed');
   const business=source.searchParams.get('businessType');if(business&&!n.filters.split('--').includes('BT_'+business))throw Error('Next-page business filter changed');
   next.pathname=next.pathname.replace(/\/\d+\.html$/,'/'+id.page+'.html');
   return {...micIdentity(next.href),identitySource:next.href};
  }
 }
 return id;
}
function micMerge(db,data,project,label=''){const prepared=data.rows.map(r=>{if(typeof r.name!=='string'||!r.name.trim()||!Array.isArray(r.products)||!r.products.every(p=>typeof p.url==='string'))throw Error('Invalid supplier data; page not saved.');const key=r.profile?micCompanyKey(r.profile):r.key;if(typeof key!=='string'||!key)throw Error('Missing supplier identity');return {...r,key};});db.companies??={};db.pages??=[];let id=micPageIdentity(data);
 if(data.contentVersion===1){const signature=micContentSignature(data),matching=new Set(db.pages.filter(p=>p.project===project&&p.state==='collected').filter(p=>{try{return micContentSignature(p)===signature}catch{return false}}).map(p=>p.search||micPageIdentity(p).search));if(matching.size===1)id={...id,search:[...matching][0]};}
 let fresh=0;const pageKey=project+'::'+id.search+'::'+id.page;
 const present=new Set(prepared.map(r=>r.key));
 for(const [key,c] of Object.entries(db.companies)){
  if(c.project!==project)continue;
  const remaining=c.observations.filter(o=>!(o.search===id.search&&((o.page===id.page&&!present.has(c.key))||(data.pagination?.terminal&&o.page>id.page))));
  if(!remaining.length&&!present.has(c.key))delete db.companies[key];else c.observations=remaining;
 }
 for(const r of prepared){const key=project+'::'+r.key;const observation={source:data.source,search:id.search,page:id.page,query:data.query,certificateLabel:label,selectedFilters:data.selectedFilters||{},manufacturerFilter:data.manufacturerFilter,certificateCodes:data.certificateCodes,capturedAt:data.capturedAt};let old=db.companies[key];if(!old){old=db.companies[key]={...r,project,observations:[],firstSearch:id.search};fresh++}else{for(const f of ['mainProducts','businessType','city','auditURL'])old[f] ||=r[f];old.products=[...new Map([...old.products,...r.products].map(x=>[x.url.split('?')[0],x])).values()]}
 const prior=old.observations.find(o=>o.search===id.search&&o.page===id.page);observation.firstCapturedAt=prior?.firstCapturedAt||prior?.capturedAt||data.capturedAt;
 old.observations=old.observations.filter(o=>!(o.search===id.search&&o.page===id.page));old.observations.push(observation);
 }
 const oldPage=db.pages.find(p=>p.pageKey===pageKey);const record={...data,...(id.identitySource?{identitySource:id.identitySource}:{}),rows:undefined,project,search:id.search,page:id.page,pageKey,count:data.rows.length,newCompanies:oldPage?.newCompanies??fresh,state:'collected'};db.pages=db.pages.filter(p=>p.pageKey!==pageKey&&!(p.project===project&&p.search===id.search&&((p.state==='error'&&p.page===id.page)||(data.pagination?.terminal&&p.page>id.page))));db.pages.push(record);return fresh;
}
function micSummary(db,project){const groups=new Map();for(const p of db.pages.filter(p=>p.project===project&&p.state==='collected')){const id=p.search&&Number.isSafeInteger(p.page)?{search:p.search,page:p.page}:micPageIdentity(p),key=id.search;if(!groups.has(key))groups.set(key,{search:key,query:p.query,pages:new Map(),companies:new Set(),exclusive:0,newCompanies:0,certificate:p.selectedFilters?.['Management Certification']||p.certificateCodes?.join(',')||''});const g=groups.get(key);g.pages.set(id.page,p);}
 for(const c of Object.values(db.companies).filter(c=>c.project===project)){const ordered=[...c.observations].sort((a,b)=>(a.firstCapturedAt||a.capturedAt||'').localeCompare(b.firstCapturedAt||b.capturedAt||''));const first=ordered[0];const firstKey=first&&(first.search||micIdentity(first.source).search);if(groups.has(firstKey))groups.get(firstKey).newCompanies++;const found=new Set(c.observations.map(o=>o.search||micIdentity(o.source).search));for(const key of found){const g=groups.get(key);if(g){g.companies.add(c.key);if(found.size===1)g.exclusive++}}}
 return [...groups.values()].map(g=>{const last=[...g.pages.values()].filter(p=>p.pagination?.terminal).map(p=>p.page).sort((a,b)=>b-a)[0];const totals=[...new Set([...g.pages.values()].map(p=>p.reportedTotal).filter(n=>typeof n==='number'&&Number.isFinite(n)))];const totalMatches=!totals.length||(totals.length===1&&[...g.pages.values()].reduce((n,p)=>n+(p.count||0),0)===totals[0]);const hasError=db.pages.some(p=>p.project===project&&p.state==='error'&&p.search===g.search);const complete=totalMatches&&!hasError&&!(db.legacyProjects||[]).includes(project)&&!!last&&last<=g.pages.size&&Array.from({length:last},(_,i)=>i+1).every(i=>g.pages.has(i));return{query:g.query,search:g.search,certificate:g.certificate,pages:g.pages.size,companies:g.companies.size,newCompanies:g.newCompanies,exclusive:g.exclusive,complete,status:(db.legacyProjects||[]).includes(project)?'Legacy data. Collect it again in a new project':complete?'All pages from page 1 to the end were captured':'Incomplete / End unconfirmed'}});
}

function micCompanyKey(profile){const u=new URL(profile);if(u.protocol!=='https:'||!/(^|\.)made-in-china\.com$/.test(u.hostname))throw Error('Invalid company profile');const h=u.hostname.toLowerCase();if(h==='www.made-in-china.com'||h==='made-in-china.com'){const m=u.pathname.match(/^\/showroom\/([^/]+)\/?$/);if(!m)throw Error('Unknown shared-domain company profile');return h+'/showroom/'+m[1];}return h;}
function micConfig(db,project){return db.projectSettings?.[project]||{definition:'',include:'',exclude:'',enabled:false};}
function micClassify(c,cfg){if(!cfg?.enabled)return 'Product assessment is disabled';const split=s=>(s||'').toLowerCase().split('|').map(x=>x.trim()).filter(Boolean);const inc=split(cfg.include);if(!inc.length)return 'Product assessment is disabled';const text=[c.mainProducts,...c.products.map(p=>p.title)].join(' ').toLowerCase();if(split(cfg.exclude).some(x=>text.includes(x)))return 'Review needed — flagged term';return inc.some(x=>text.includes(x))?'Relevant product offered — manufacturing unverified':'Relevance unclear';}
function micUpgrade(db){if(db.schemaVersion===3)return db;db.legacyProjects=[...new Set(Object.values(db.companies||{}).map(c=>c.project))];db.projectSettings??={};for(const p of db.legacyProjects){const c=db.projectSettings[p]||{};db.projectSettings[p]={definition:c.definition||'',include:'',exclude:'',enabled:false};}db.schemaVersion=3;return db;}

// Delete only one project's exact query/filter group; shared companies survive.
function micDeleteSearch(db,project,search){
 let removedCompanies=0,removedObservations=0;
 for(const [key,c] of Object.entries(db.companies||{})){
  if(c.project!==project)continue;
  const remaining=c.observations.filter(o=>(o.search||micIdentity(o.source).search)!==search);
  if(remaining.length===c.observations.length)continue;
  removedObservations+=c.observations.length-remaining.length;
  if(!remaining.length){delete db.companies[key];removedCompanies++;}
  else{c.observations=remaining;const first=[...remaining].sort((a,b)=>(a.firstCapturedAt||a.capturedAt||'').localeCompare(b.firstCapturedAt||b.capturedAt||''))[0];c.firstSearch=first.search||micIdentity(first.source).search;}
 }
 db.pages=(db.pages||[]).filter(p=>{if(p.project!==project)return true;try{return (p.search||micIdentity(p.source).search)!==search}catch{return true}});
 return {removedCompanies,removedObservations};
}

// Validate a restore candidate before replacing the working database.
function micValidateBackup(b){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(b)||!object(b.companies)||!Array.isArray(b.pages)||(b.schemaVersion!==undefined&&(!Number.isInteger(b.schemaVersion)||b.schemaVersion>3)))throw Error('Invalid or unsupported JSON backup');
 for(const c of Object.values(b.companies)){
  if(!object(c)||typeof c.name!=='string'||typeof c.project!=='string'||!Array.isArray(c.products)||!Array.isArray(c.observations))throw Error('Invalid supplier in JSON backup');
  if(c.profile)micCompanyKey(c.profile);
  for(const p of c.products)if(!object(p)||typeof p.url!=='string'||typeof p.title!=='string')throw Error('Invalid product in JSON backup');
  for(const o of c.observations){if(!object(o))throw Error('Invalid source in JSON backup');micSiteURL(o.source);}
 }
 for(const p of b.pages){if(!object(p)||typeof p.project!=='string'||!['collected','error'].includes(p.state))throw Error('Invalid page in JSON backup');if(p.state==='collected'){micSiteURL(p.source);if(p.identitySource)micSiteURL(p.identitySource);if(p.contentVersion===1)micPageIdentity(p);}}
 if(b.projectSettings!==undefined){if(!object(b.projectSettings))throw Error('Invalid settings in JSON backup');for(const cfg of Object.values(b.projectSettings)){if(!object(cfg)||['definition','include','exclude'].some(k=>cfg[k]!==undefined&&typeof cfg[k]!=='string')||(cfg.enabled!==undefined&&typeof cfg.enabled!=='boolean'))throw Error('Invalid settings in JSON backup');}}
 if(b.legacyProjects!==undefined&&(!Array.isArray(b.legacyProjects)||!b.legacyProjects.every(p=>typeof p==='string')))throw Error('Invalid project list in JSON backup');
 return b;
}
