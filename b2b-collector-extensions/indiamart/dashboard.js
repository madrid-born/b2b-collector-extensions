'use strict';
const $=id=>document.getElementById(id),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let db=imNewDB(),busy=false,stopRequested=false;

function currentProjectId(){const id=$('projectSelect').value||db.activeProjectId;if(!id)throw Error('Create or select a project first.');return id;}
function currentProject(){return imProject(db,currentProjectId());}
function projectFilename(){return currentProject().name.replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,80)||'project';}
function note(message){$('status').textContent=message;}
function formatNumber(value){return Number(value||0).toLocaleString('en-US');}
function classLabel(value){return {manufacturer:'Manufacturer',manufacturer_and_trader:'Manufacturer and trader',trader_wholesaler:'Trader or wholesaler',exporter:'Exporter',service_provider:'Service provider',unknown:'Unknown'}[value]||value;}
function relevanceLabel(value){return {keyword_match:'Keyword match',review_excluded_term:'Needs review',unclear:'Relevance unclear',not_assessed:'Unassessed'}[value]||value;}

async function save(){db.activeProjectId=$('projectSelect').value||db.activeProjectId;await chrome.storage.local.set({imSuiteDB:db});render();}

function fillProjects(){
 const selected=db.activeProjectId,$select=$('projectSelect');$select.replaceChildren(new Option('— Create a project first —',''));
 for(const project of Object.values(db.projects||{}).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)))$select.add(new Option(project.name,project.id));
 if(selected&&db.projects[selected])$select.value=selected;
}

function loadProjectForm(){
 const project=db.projects?.[$('projectSelect').value||db.activeProjectId];$('clearProject').disabled=!project;$('keywords').value=project?.keywords||'';
}

function readProjectForm(){
 const project=currentProject();project.definition='';project.sources=['export'];project.include='';project.exclude='';project.keywords=$('keywords').value.trim();project.assessmentEnabled=false;return project;
}

function appendCell(row,value){const cell=document.createElement('td');cell.textContent=String(value??'');row.append(cell);return cell;}

function render(){
 const projectId=db.activeProjectId,project=db.projects?.[projectId],companies=project?imProjectCompanies(db,projectId):[],pages=project?Object.values(db.pages||{}).filter(page=>page.projectId===projectId):[],audits=project?imAudits(db,projectId):[];
 const totalShowMore=pages.reduce((total,page)=>total+(Number(page.preparation?.loadMoreClicks)||0),0);
 $('companyCount').textContent=formatNumber(companies.length);$('manufacturerCount').textContent=formatNumber(companies.filter(company=>['manufacturer','manufacturer_and_trader'].includes(company.businessClass)).length);$('completedSearchCount').textContent=formatNumber(audits.filter(audit=>audit.complete).length);$('showMoreCount').textContent=formatNumber(totalShowMore);
 $('auditRows').replaceChildren();for(const audit of audits){const clicks=pages.filter(page=>page.searchId===audit.searchId).reduce((total,page)=>total+(Number(page.preparation?.loadMoreClicks)||0),0),row=document.createElement('tr');appendCell(row,`${audit.site==='export'?'Export':'Directory'} / ${audit.query||'Untitled'}`);appendCell(row,audit.uniqueCompanies);appendCell(row,clicks);appendCell(row,audit.status||'—');$('auditRows').append(row);}
 $('companyRows').replaceChildren();for(const company of companies.slice().sort((a,b)=>a.name.localeCompare(b.name)).slice(0,100)){const row=document.createElement('tr'),name=appendCell(row,'');const profile=company.profiles?.[0];if(profile){const link=document.createElement('a');link.href=profile;link.target='_blank';link.rel='noreferrer';link.textContent=company.name;name.append(link);}else name.textContent=company.name;appendCell(row,company.businessType||'—');appendCell(row,[...new Set((company.observations||[]).map(observation=>observation.site==='export'?'Export':'Directory'))].join(' + '));$('companyRows').append(row);}
}

async function refreshTabs(){
 const previous=$('tabs').value,tabs=(await chrome.tabs.query({})).filter(tab=>{try{return imSite(tab.url)==='export';}catch{return false;}});$('tabs').replaceChildren();for(const tab of tabs)$('tabs').add(new Option(`${tab.title||'IndiaMART Export'} · ${tab.url}`,String(tab.id)));if(previous&&tabs.some(tab=>String(tab.id)===previous))$('tabs').value=previous;if(!tabs.length)$('tabs').add(new Option('No IndiaMART Export tab is open',''));
}
function tabId(){const value=Number($('tabs').value);if(!value)throw Error('Open an IndiaMART Export page and select Refresh tabs.');return value;}

async function capture(tab){
 note('Scrolling, clicking Show More and collecting companies. Keep the tab open for up to 60 seconds.');await chrome.scripting.executeScript({target:{tabId:tab},files:['extractor.js']});const shouldPrepare=$('lazyLoad').checked,result=await chrome.scripting.executeScript({target:{tabId:tab},func:async prepare=>{const preparation=prepare?await prepareIndiaMARTPage({maxDurationMs:60000,maxLoadMoreClicks:20}):null;return extractIndiaMART(document,location.href,preparation);},args:[shouldPrepare]});const data=result[0]?.result;if(!data)throw Error('The page returned no data.');if(data.blocked)throw Error('Collection stopped after detecting an access check or CAPTCHA.');return data;
}

async function mergeData(data){readProjectForm();const result=imMergePage(db,data,currentProjectId());await save();const prep=data.preparation?` Preparation: ${data.preparation.loadMoreClicks||0} clicks, ${data.preparation.resultCards??data.preparation.companySignals??data.preparation.companyAnchors??0} cards, ${Math.ceil((data.preparation.durationMs||0)/1000)} seconds${data.preparation.timedOut?', timed out':''}.`:'';note(`${data.site==='export'?'Export':'Directory'} — Page ${result.page}: ${result.rows} companies captured.${prep} Audit: ${result.audit.status}`);return result;}

async function navigate(tab,url){
 imAllowedURL(url);await chrome.tabs.update(tab,{url});const deadline=Date.now()+60000;while(Date.now()<deadline){await pause(500);const state=await chrome.tabs.get(tab);if(state.status==='complete'){const site=imSite(state.url);if(['directory','export'].includes(site)){await pause(1200);return state.url;}throw Error('Navigation did not reach an IndiaMART listings page.');}}throw Error('The page took more than 60 seconds to load.');
}

async function collect(tab,startURL=''){
 if(startURL)await navigate(tab,startURL);const limit=Math.max(1,Math.min(100,Math.floor(Number($('max').value)||20))),delay=Math.max(5,Math.min(120,Number($('delay').value)||7)),seen=new Set();
 for(let index=0;index<limit&&!stopRequested;index++){
  const state=await chrome.tabs.get(tab),currentURL=state.url;if(seen.has(currentURL))throw Error('Collection stopped after detecting a repeated page.');seen.add(currentURL);note(`Collecting page ${index+1} of ${limit}…`);
  try{const data=await capture(tab);await mergeData(data);if(!data.next){const identity=imPageIdentity(data.source,{query:data.query,page:data.pagination?.current}),audit=imAuditSearch(db,`${currentProjectId()}::${identity.search}`);note(audit.complete?`Search finished: ${audit.status}`:`Search stopped: ${audit.status}`);return;}if(index===limit-1){note(`Safety limit reached. Continue manually from: ${data.next}`);return;}if(data.next===currentURL)throw Error('The next-page link points to the current page.');await pause(delay*1000);if(!stopRequested)await navigate(tab,data.next);}catch(error){db.errors.push({projectId:currentProjectId(),source:currentURL,error:error.message,capturedAt:new Date().toISOString()});await save();throw error;}
 }
 if(stopRequested)note('Collection stopped safely. Captured data was saved.');
}

function keywordURLs(project){
 const keywords=$('keywords').value.split(/\r?\n/).map(imText).filter(Boolean);if(!keywords.length)throw Error('Enter at least one keyword.');project.sources=['export'];return keywords.map(keyword=>`https://export.indiamart.com/search.php?ss=${encodeURIComponent(keyword)}`);
}

async function runQueue(tab,urls){const unique=[...new Set(urls.map(url=>imAllowedURL(url).href))];for(let index=0;index<unique.length&&!stopRequested;index++){note(`Queue item ${index+1} of ${unique.length}: ${unique[index]}`);await collect(tab,unique[index]);}}

function download(name,data,mime){const url=URL.createObjectURL(new Blob([data],{type:mime})),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}

function companyRows(project,companies){return companies.map(company=>[company.name,company.profiles?.[0]||'',(company.profiles||[]).join(' | '),company.companyId,company.city,company.state,company.address,company.businessType,classLabel(company.businessClass),relevanceLabel(imRelevance(company,project)),!!company.verifications?.verifiedExporter,!!company.verifications?.trustSeal,!!company.verifications?.gstVerified,!!company.verifications?.iecVerified,company.rating,company.reviewCount,company.establishedYear,company.exportingSince,(company.exportsTo||[]).join(' | '),(company.products||[]).map(product=>product.title).join(' | '),(company.observations||[]).length]);}
const companyHeaders=['Company','Primary profile','All profiles','Company ID','City','State','Address','Business type shown','Business class','Keyword assessment','Verified Exporter','TrustSEAL','GST Verified','IEC Verified','Rating','Review count','Established year','Exporting since','Exports to','Product titles','Evidence observations'];

function workbookSheets(){
 const project=currentProject(),projectId=project.id,companies=imProjectCompanies(db,projectId),audits=imAudits(db,projectId),pages=Object.values(db.pages||{}).filter(page=>page.projectId===projectId),products=companies.flatMap(company=>(company.products||[]).map(product=>[company.name,company.profiles?.[0]||'',!!product.primary,product.title,product.url,product.price,product.specifications])),evidence=companies.flatMap(company=>(company.observations||[]).map(observation=>[company.name,observation.site,observation.query,observation.source,observation.page,observation.cardIndex,observation.companyProfile,(observation.productURLs||[]).join(' | '),observation.businessTypeEvidence,observation.badgeEvidence,observation.cardText,observation.capturedAt]));
 return [
  {name:'Project',rows:[['Item','Value'],['Project',project.name],['Source','IndiaMART Export'],['Keywords',project.keywords],['Created at',project.createdAt],['Warning',project.warning]]},
  {name:'SearchSummary',rows:[['Site','Query','Declared by site','Count kind','Extracted unique','Detected cards','Parsed cards','Unparsed cards','Merged repeats','Pages','Terminal page','Quality checks complete','Coverage complete','Audit status'],...audits.map(audit=>[audit.site,audit.query,audit.declaredTotal??'',audit.declaredTotalKind,audit.uniqueCompanies,audit.detectedCards,audit.rawCards,audit.unparsedCards,audit.duplicatesMerged,audit.pages,audit.terminalPage,!!audit.qualityComplete,!!audit.complete,audit.status])]},
  {name:'Companies',rows:[companyHeaders,...companyRows(project,companies)]},
  {name:'Products',rows:[['Company','Profile','Primary product','Product','Product URL','Price shown','Specifications shown'],...products]},
  {name:'Evidence',rows:[['Company','Site','Query','Source page','Page','Card index','Company profile','Product URLs','Business type evidence','Badge evidence','Visible card excerpt','Captured at'],...evidence]},
  {name:'Coverage',rows:[['Site','Query','Source','Page','Stored rows','Detected cards','Parsed rows','Unparsed cards','Primary products','Next URL','Terminal observed','Terminal evidence','Declared total','Count kind','No results','Load-more clicks','Prepared result cards','Prepared company signals','Prepared company anchors','Prepared product anchors','Preparation rounds','Dynamic list exhausted','Stalled Show More clicks','Preparation timed out','Load-more limit reached','Preparation seconds','Captured at'],...pages.map(page=>[page.site,page.query,page.source,page.page,page.count,page.extraction?.detectedCards??'',page.extraction?.parsedRows??'',page.extraction?.unparsedCards??'',page.extraction?.primaryProducts??'',page.next,!!page.pagination?.terminal,page.pagination?.evidence,page.declaredTotal??'',page.declaredTotalKind,!!page.noResults,page.preparation?.loadMoreClicks??'',page.preparation?.resultCards??'',page.preparation?.companySignals??'',page.preparation?.companyAnchors??'',page.preparation?.productAnchors??'',page.preparation?.rounds??'',page.preparation?.exhausted??'',page.preparation?.stalledClicks??'',page.preparation?.timedOut??'',page.preparation?.limitReached??'',page.preparation?.durationMs?Math.ceil(page.preparation.durationMs/1000):'',page.capturedAt])]}
 ];
}

function makeCSV(rows){const escape=value=>{const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};return '\ufeff'+rows.map(row=>row.map(escape).join(',')).join('\r\n');}

async function task(action){if(busy)return;busy=true;stopRequested=false;for(const element of document.querySelectorAll('input,select,textarea,button'))if(element.id!=='stop')element.disabled=true;$('stop').disabled=false;try{await action();}catch(error){note(`Stopped: ${error.message}`);}finally{busy=false;for(const element of document.querySelectorAll('input,select,textarea,button'))element.disabled=false;fillProjects();loadProjectForm();await refreshTabs();render();}}

$('newProject').onclick=()=>task(async()=>{const name=imText($('newProjectName').value);if(Object.values(db.projects).some(project=>imNorm(project.name)===imNorm(name)))throw Error('A project with that name already exists. Select it or enter a different name.');const project=imCreateProject(db,name,{sources:['export']});$('newProjectName').value='';fillProjects();$('projectSelect').value=project.id;db.activeProjectId=project.id;loadProjectForm();await save();note(`Project created: ${project.name}`);});
$('projectSelect').onchange=async()=>{db.activeProjectId=$('projectSelect').value;loadProjectForm();await chrome.storage.local.set({imSuiteDB:db});render();};
$('clearProject').onclick=()=>task(async()=>{const project=currentProject(),count=imProjectCompanies(db,project.id).length;if(!confirm(`Clear results for “${project.name}”? This removes ${count} companies and keeps the project name and settings.`))return;const removed=imClearProjectResults(db,project.id);await save();note(`Results cleared. Removed ${removed.companies} companies, ${removed.searches} searches and ${removed.pages} pages.`);});
$('refresh').onclick=()=>task(refreshTabs);$('stop').onclick=()=>{stopRequested=true;note('Stop requested. The current operation will finish first.');};
$('runCurrent').onclick=()=>task(()=>collect(tabId()));
$('runKeywords').onclick=()=>task(async()=>{const project=readProjectForm();await save();await runQueue(tabId(),keywordURLs(project));});
$('excel').onclick=()=>task(async()=>download(`IndiaMART-${projectFilename()}.xlsx`,makeXLSX(workbookSheets()),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
$('csv').onclick=()=>task(async()=>{const project=currentProject(),rows=[companyHeaders,...companyRows(project,imProjectCompanies(db,project.id))];download(`IndiaMART-${projectFilename()}-companies.csv`,makeCSV(rows),'text/csv;charset=utf-8');});
$('backup').onclick=()=>task(async()=>download(`IndiaMART-${projectFilename()}-backup.json`,JSON.stringify(db,null,2),'application/json'));
$('restore').onclick=()=>task(async()=>{const file=$('restoreFile').files[0];if(!file)throw Error('Select a JSON file.');const restored=imValidateBackup(JSON.parse(await file.text()));if(!confirm('Replace all current extension data with this backup?'))return;db=restored;await chrome.storage.local.set({imSuiteDB:db});fillProjects();loadProjectForm();render();note('Backup restored.');});

(async()=>{const stored=await chrome.storage.local.get('imSuiteDB');db=stored.imSuiteDB?imValidateBackup(stored.imSuiteDB):imNewDB();fillProjects();loadProjectForm();await refreshTabs();render();note(Object.keys(db.projects).length?'Ready. Select a project and an IndiaMART tab.':'Ready. Create a project to get started.');})().catch(error=>note(`Startup error: ${error.message}`));
