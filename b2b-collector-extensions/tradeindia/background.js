importScripts('collector.js','model.js');
const KEY='capa_ti_v1';
let queue=Promise.resolve();
const cancelRequests=new Set();
const serialized=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;};
function normalizeKeyword(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function pageIdentity(raw){const u=new URL(raw);return [u.origin,u.pathname,normalizeKeyword(u.searchParams.get('keyword')),Number(u.searchParams.get('page')||1)].join('|');}
async function observedSearchUrl(tabId){try{const t=await chrome.tabs.get(tabId);return /^https:\/\/(www\.)?tradeindia\.com\/search\.html\?/i.test(t.url||'')?t.url:'';}catch{return '';}}
function logEvent(p,type,message,extra={}){p.events||=[];p.events.push({at:new Date().toISOString(),type,message,keyword:p.job?.keyword||p.config.keyword,...extra});}
async function signalStop(m){
 const s=(await chrome.storage.local.get(KEY))[KEY];const p=s?.projects?.find(p=>p.id===(m.id||s.activeId));if(!p)return;
 cancelRequests.add(p.id);
 if(p.job?.tabId){try{await chrome.scripting.executeScript({target:{tabId:p.job.tabId},func:interruptTradeIndiaPreparation});}catch{}}
}
function migrateProject(p){
 p.config||={};
 if(p.config.mode==='raw-cards')return false;
 p.legacyClassificationConfig||=structuredClone(p.config);
 p.config.mode='raw-cards';p.config.requireManufacturer=false;
 p.job=null;p.lastMessage='This project now uses raw collection. Exports include previously excluded results.';
 return true;
}
function migrateKeywords(p){
 let changed=false;
 if(!Array.isArray(p.config.keywords)){p.config.keywords=[p.config.keyword];changed=true;}
 if(!p.config.reviewKeyword){p.config.reviewKeyword=p.config.keyword;changed=true;}
 for(const r of p.records||[]){
  if(!Array.isArray(r.keywords)){r.keywords=Model.keywords(r);changed=true;}
  for(const e of r.evidence||[])if(!e.keyword){e.keyword=Model.keywordFromUrl(e.sourceUrl)||r.keyword||p.config.keyword;changed=true;}
 }
 for(const c of p.captures||[])if(!c.keyword){c.keyword=Model.keywordFromUrl(c.url)||p.config.keyword;changed=true;}
 return changed;
}
async function state(){
 const s=(await chrome.storage.local.get(KEY))[KEY]||{projects:[],activeId:''};
 let changed=false;for(const p of s.projects){if(migrateProject(p)){changed=true;await chrome.alarms.clear('ti-'+p.id);}if(migrateKeywords(p))changed=true;}
 if(changed)await save(s);
 return s;
}
async function save(s){await chrome.storage.local.set({[KEY]:s});}
async function captureProject(s,p,tabId,automatic=false){
 const tab=await chrome.tabs.get(tabId);
 if(!/^https:\/\/(www\.)?tradeindia\.com\/search\.html\?/i.test(tab.url||''))throw Error('Open a TradeIndia search page.');
 if(cancelRequests.has(p.id))throw Error('STOP_REQUESTED');
 const preparation=await chrome.scripting.executeScript({target:{tabId},func:prepareTradeIndiaPage});
 const loading=preparation[0]?.result;
 if(cancelRequests.has(p.id))throw Error('STOP_REQUESTED');
 if(!loading||loading.error)throw Error(loading?.error||'Page loading could not be confirmed.');
 const result=await chrome.scripting.executeScript({target:{tabId},func:inspectTradeIndia,args:[{...p.config,keyword:automatic?(p.job?.keyword||p.config.keyword):p.config.keyword,preserveManufacturerFilter:!!(automatic&&p.job?.expectedManufacturerFilter)}]});
 const snap=result[0]?.result;if(!snap||snap.error)throw Error(snap?.error||'The page could not be read.');
 if(cancelRequests.has(p.id))throw Error('STOP_REQUESTED');
 const reference=automatic?p.job.nextUrl:tab.url;
 if(pageIdentity(snap.sourceUrl)!==pageIdentity(reference))throw Error('Capture stopped because the page changed while loading.');
 snap.scroll=loading;
 if(automatic&&typeof p.job?.expectedManufacturerFilter==='boolean'&&p.job.expectedManufacturerFilter!==snap.manufacturerFilter)throw Error('Capture stopped because the Manufacturer filter changed during the run.');
 if(automatic && p.job?.lastSignature===snap.signature)throw Error('Pagination stopped because the page content repeated.');
 const seen=new Set(automatic?(p.job?.sponsoredSeen||[]):[]);
 const productRows=snap.rows.filter(r=>r.productUrl);
 snap.nonSponsoredProductCards=new Set(productRows.filter(r=>!r.sponsored).map(r=>r.position)).size;
 snap.newSponsoredProductCards=new Set(productRows.filter(r=>r.sponsored&&!seen.has(Model.key(r))).map(r=>r.position)).size;
 snap.usefulProductCards=new Set(productRows.filter(r=>!r.sponsored||!seen.has(Model.key(r))).map(r=>r.position)).size;
 const added=Model.merge(p,snap);
 p.lastMessage=`Page ${snap.page} yielded ${snap.cardCount} cards (${snap.productCards} with products, ${snap.companyOnlyCards} company-only) and ${added} new records.`;
 p.updatedAt=new Date().toISOString();
 return snap;
}
async function finish(p,message){logEvent(p,'finish',message,{pageUrl:p.job?.nextUrl||p.job?.fromUrl||''});p.job={...(p.job||{}),running:false,phase:'done'};p.lastMessage=message;await chrome.alarms.clear('ti-'+p.id);}
async function tick(id){return serialized(async()=>{
 const s=await state(),p=s.projects.find(p=>p.id===id);if(!p?.job?.running)return;
 try{
  const j=p.job,tab=await chrome.tabs.get(j.tabId);
  if(j.phase==='navigate'){
   if(tab.url!==j.fromUrl)throw Error('Pagination stopped because the source page changed unexpectedly.');
   // Upgrade queued navigation as well as newly discovered links.
   if(j.expectedManufacturerFilter){const target=new URL(j.nextUrl);target.searchParams.set('manufacturer','true');j.nextUrl=target.href;}
   j.phase='loading';j.attempts=0;await save(s);
   await chrome.tabs.update(j.tabId,{url:j.nextUrl});
   await chrome.alarms.create('ti-'+id,{when:Date.now()+8000});return;
  }
  if(tab.status!=='complete'){
   if(++j.attempts>8)throw Error('Loading did not finish. Previously captured data was saved.');
   await save(s);await chrome.alarms.create('ti-'+id,{when:Date.now()+5000});return;
  }
  const current=new URL(tab.url),expected=new URL(j.nextUrl);
  if(current.pathname!==expected.pathname||current.searchParams.get('page')!==expected.searchParams.get('page'))throw Error('The destination page differs from the expected page.');
  const snap=await captureProject(s,p,j.tabId,true);j.done++;j.lastSignature=snap.signature;
  j.emptyStreak=snap.usefulProductCards===0?j.emptyStreak+1:0;
  j.sponsoredSeen=[...new Set([...(j.sponsoredSeen||[]),...snap.rows.filter(r=>r.productUrl&&r.sponsored).map(r=>Model.key(r))])];
  if(j.emptyStreak>=2)await finish(p,p.lastMessage+' Automatically stopped after two pages without organic products or new advertised products. Repeat ads were ignored.');
  else if(j.limit && j.done>=j.limit)await finish(p,p.lastMessage+' The selected page limit was reached.');
  else if(!snap.nextUrl)await finish(p,p.lastMessage+' No next-page link was found.');
  else{j.phase='navigate';j.fromUrl=snap.sourceUrl;j.nextUrl=snap.nextUrl;await chrome.alarms.create('ti-'+id,{when:Date.now()+5000});}
 }catch(e){const stopped=e.message==='STOP_REQUESTED';logEvent(p,stopped?'stop':'error',stopped?'Stopped by user':e.message,{pageUrl:await observedSearchUrl(p.job?.tabId),expectedUrl:p.job?.nextUrl||'',stage:p.job?.phase||''});await finish(p,stopped?'Stopped at your request. Previously captured data was saved.':'Stopped: '+e.message);}
 await save(s);
});}
chrome.alarms.onAlarm.addListener(a=>{if(a.name.startsWith('ti-'))void tick(a.name.slice(3));});
chrome.runtime.onMessage.addListener((m, sender, reply)=>{
 const operation=async()=>{
  const s=await state();let p=s.projects.find(p=>p.id===(m.id||s.activeId));
  if(m.type==='get')return s;
  if(m.type==='select'){s.activeId=m.id;await save(s);return s;}
  if(m.type==='create'){
   if(!m.config.keyword.trim())throw Error('Enter a keyword.');
   p={id:crypto.randomUUID(),name:m.name.trim()||m.config.keyword,config:{keyword:m.config.keyword,keywords:[m.config.keyword],reviewKeyword:m.config.keyword,requireManufacturer:false,mode:'raw-cards'},records:[],captures:[],createdAt:new Date().toISOString()};s.projects.push(p);s.activeId=p.id;
  }else if(m.type==='delete'){
   if(!p)throw Error('Project not found.');await finish(p,'');s.projects=s.projects.filter(x=>x.id!==p.id);s.activeId=s.projects[0]?.id||'';
  }else if(m.type==='capture'||m.type==='start'){
   if(!p)throw Error('Create a project first.');
   if(s.projects.some(x=>x.job?.running))throw Error('Stop the current run first.');
   cancelRequests.delete(p.id);
   let limit=null;
   if(m.type==='start'){
    const rawLimit=m.limit;limit=rawLimit===null||rawLimit===undefined||rawLimit===''?null:Number(rawLimit);
    if(limit!==null&&(!Number.isSafeInteger(limit)||limit<1))throw Error('Enter a positive whole number for the page limit or leave it blank.');
    p.job={running:true,phase:'initial',tabId:m.tabId,keyword:p.config.keyword,done:0,limit};
    logEvent(p,'start','Start pagination',{tabId:m.tabId});await save(s);
   }
   try{
    const snap=await captureProject(s,p,m.tabId);
    if(m.type==='start'){
     if(snap.nextUrl&&(limit===null||limit>1)){
      p.job={running:true,tabId:m.tabId,phase:'navigate',expectedManufacturerFilter:snap.manufacturerFilter,keyword:p.config.keyword,done:1,limit,fromUrl:snap.sourceUrl,nextUrl:snap.nextUrl,lastSignature:snap.signature,sponsoredSeen:snap.rows.filter(r=>r.productUrl&&r.sponsored).map(r=>Model.key(r)),emptyStreak:snap.usefulProductCards===0?1:0};
      await chrome.alarms.create('ti-'+p.id,{when:Date.now()+5000});
     }else await finish(p,p.lastMessage+' No next-page link was found or the limit was set to one page.');
    }
   }catch(e){
    const stopped=e.message==='STOP_REQUESTED';
    logEvent(p,stopped?'stop':'error',stopped?'Stopped by user':e.message,{tabId:m.tabId,pageUrl:await observedSearchUrl(m.tabId),stage:p.job?.phase||'manual-capture'});
    await finish(p,stopped?'Stopped at your request. Previously captured data was saved.':'Error: '+e.message);await save(s);
    throw Error(p.lastMessage);
   }
  }else if(m.type==='setKeyword'){
   if(!p)throw Error('Select a project first.');
   if(p.job?.running)throw Error('Stop the run for this project or wait for it to finish.');
   const keyword=String(m.keyword||'').trim();
   if(!keyword)throw Error('Enter a keyword.');
   const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
   const existing=p.config.keywords.find(k=>normalize(k)===normalize(keyword));
   p.config.keyword=existing||keyword;
   if(!existing)p.config.keywords.push(keyword);
   p.lastMessage='Active keyword: '+p.config.keyword+'; Search TradeIndia using this keyword. Earlier results are saved.';
  }else if(m.type==='stop'){if(p)await finish(p,'Pagination stopped. Captured data was saved.');}
  else if(m.type==='import'){
   const data=m.data;if(data?.format!=='CAPA-TI-1'||!Array.isArray(data.project?.records)||!Array.isArray(data.project?.captures)||!data.project?.config?.keyword)throw Error('The backup is invalid.');
   p=structuredClone(data.project);migrateProject(p);migrateKeywords(p);p.id=crypto.randomUUID();p.job=null;p.name+=' (Restore)';s.projects.push(p);s.activeId=p.id;
  }
  await save(s);return s;
 };
 const pending=m?.type==='stop'?signalStop(m).then(()=>serialized(operation)):serialized(operation);
 pending.then(data=>reply({ok:true,data})).catch(e=>reply({ok:false,error:e.message}));return true;
});
