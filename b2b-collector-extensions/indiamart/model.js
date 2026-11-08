/* Pure project, identity, merge, classification and audit operations. No Chrome APIs. */
'use strict';

const IM_SCHEMA=1;
const imText=value=>String(value??'').replace(/\s+/g,' ').trim();
const imNorm=value=>imText(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const imTerms=value=>String(value||'').split(/[|\n]/).map(imText).filter(Boolean);
const imNow=()=>new Date().toISOString();
const imUUID=()=>globalThis.crypto?.randomUUID?.()||`im-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function imNewDB(){return {schemaVersion:IM_SCHEMA,projects:{},companies:{},searches:{},pages:{},errors:[],activeProjectId:''};}

function imCreateProject(db,name,options={}){
 const clean=imText(name);if(!clean)throw Error('A project name is required.');
 const id=options.id||imUUID();db.projects??={};if(db.projects[id])throw Error('This project ID already exists.');
 db.projects[id]={id,name:clean,createdAt:options.createdAt||imNow(),definition:imText(options.definition),sources:options.sources||['export'],keywords:String(options.keywords??'').trim(),assessmentEnabled:options.assessmentEnabled!==false,include:imText(options.include),exclude:imText(options.exclude),warning:'Business type and badges are IndiaMART claims captured as evidence; they are not independent verification.'};
 db.activeProjectId=id;return db.projects[id];
}

function imProject(db,id){const project=db.projects?.[id];if(!project)throw Error('Create or select a project first.');return project;}

function imAllowedURL(value){
 const url=new URL(value);if(url.protocol!=='https:'||!['dir.indiamart.com','export.indiamart.com','www.indiamart.com'].includes(url.hostname.toLowerCase()))throw Error('Only supported IndiaMART pages are allowed.');return url;
}

function imSite(value){const host=imAllowedURL(value).hostname.toLowerCase();return host==='export.indiamart.com'?'export':host==='dir.indiamart.com'?'directory':'profile';}

function imPageIdentity(source,override={}){
 const url=imAllowedURL(source),site=imSite(source),ignored=new Set(['page','pageno','page_no','start','utm_source','utm_medium','utm_campaign','utm_term','utm_content']);
 let query='';for(const key of ['ss','q','query','keyword','search'])if(url.searchParams.get(key)){query=url.searchParams.get(key);break;}
 if(!query){const category=decodeURIComponent(url.pathname).match(/\/(?:impcat\/)?([^/]+)\.html$/i)?.[1];if(category)query=category.replace(/[-+]/g,' ');}
 query=imText(override.query||query);
 let page=Number(override.page||url.searchParams.get('page')||url.searchParams.get('pageno')||url.searchParams.get('page_no')||1);if(!Number.isInteger(page)||page<1)page=1;
 const filters=[...new Set([...url.searchParams.keys()])].filter(key=>!ignored.has(key)&&!['ss','q','query','keyword','search'].includes(key)).sort().map(key=>`${key}=${url.searchParams.getAll(key).sort().join(',')}`).join('&');
 const route=query?imNorm(query):url.pathname.toLowerCase().replace(/\/+$/,'');return {site,query,page,filters,search:`${site}::${route}::${filters}`};
}

function imCanonicalURL(value){
 if(!value)return '';try{const url=imAllowedURL(value);url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key))url.searchParams.delete(key);return url.href.replace(/\/$/,'/');}catch{return '';}
}

function imAliases(row){
 const aliases=[],profile=imCanonicalURL(row.profile||row.companyUrl),companyId=imText(row.companyId)||profile.match(/\/company\/(\d+)/i)?.[1]||'';
 if(companyId)aliases.push(`id:${companyId}`);
 if(profile){const url=new URL(profile),path=url.pathname.replace(/^\/+|\/+$/g,'');if(url.hostname==='www.indiamart.com'&&path&&!/^(?:proddetail|impcat|search|enquiry|contact|member|seller)$/i.test(path))aliases.push(`slug:${path.toLowerCase()}`);else aliases.push(`url:${url.hostname}${url.pathname.toLowerCase().replace(/\/$/,'')}`);}
 const name=imNorm(row.name),city=imNorm(row.city);if(name&&city)aliases.push(`namecity:${name}:${city}`);if(name)aliases.push(`name:${name}`);return [...new Set(aliases)];
}

function imClassifyBusiness(value){
 const text=imText(value).toLocaleLowerCase(),manufacturer=/\b(manufacturer|manufacturing|factory|producer)\b/i.test(text),trader=/\b(trader|trading|wholesaler|retailer|distributor|supplier|dealer)\b/i.test(text),exporter=/\b(exporter|exporting|merchant exporter)\b/i.test(text),service=/\b(service provider|services)\b/i.test(text);
 if(manufacturer&&trader)return 'manufacturer_and_trader';if(manufacturer)return 'manufacturer';if(trader)return 'trader_wholesaler';if(exporter)return 'exporter';if(service)return 'service_provider';return 'unknown';
}

function imMergeText(a,b){const values=[...new Set([...imTerms(String(a||'').replace(/\s*\|\s*/g,'\n')),...imTerms(String(b||'').replace(/\s*\|\s*/g,'\n'))])];return values.join(' | ');}
function imMergeArray(a,b){return [...new Set([...(a||[]),...(b||[])].map(imText).filter(Boolean))];}

function imFindCompany(db,projectId,aliases){
 const wanted=new Set(aliases);return Object.values(db.companies||{}).find(company=>company.projectId===projectId&&(company.aliases||[]).some(alias=>wanted.has(alias)));
}

function imMergePage(db,data,projectId){
 const project=imProject(db,projectId),identity=imPageIdentity(data.source,{query:data.query,page:data.pagination?.current});if(identity.site==='profile')throw Error('Open a Directory or Export listings page before collecting.');
 if(data.blocked)throw Error('Collection stopped after detecting an access check or CAPTCHA.');
 if(!data.noResults&&!(data.rows||[]).length)throw Error('No supplier cards were found. The page may still be loading or its layout may have changed.');
 db.companies??={};db.searches??={};db.pages??={};const searchId=`${projectId}::${identity.search}`;
 let search=db.searches[searchId];if(!search)search=db.searches[searchId]={id:searchId,projectId,site:identity.site,search:identity.search,query:data.query||identity.query,filters:identity.filters,createdAt:data.capturedAt||imNow(),declaredTotal:null,declaredTotalKind:'unknown'};
 const declared=data.declaredTotal==null?NaN:Number(data.declaredTotal);if(Number.isInteger(declared)&&declared>=0){search.declaredTotal=declared;search.declaredTotalKind=data.declaredTotalKind||'approximate';}
 for(const company of Object.values(db.companies))if(company.projectId===projectId)company.observations=(company.observations||[]).filter(observation=>!(observation.searchId===searchId&&observation.page===identity.page));
 const companyKeys=[];let newCompanies=0;
 for(const row of data.rows||[]){
  const aliases=imAliases(row);if(!aliases.length||!imText(row.name))continue;let company=imFindCompany(db,projectId,aliases);
  if(!company){const key=aliases[0]||`local:${imUUID()}`;company=db.companies[`${projectId}::${key}`]={key,projectId,aliases:[],name:imText(row.name),profiles:[],companyId:'',city:'',state:'',address:'',businessType:'',businessClass:'unknown',rating:'',reviewCount:'',establishedYear:'',exportingSince:'',exportsTo:[],verifications:{verifiedExporter:false,trustSeal:false,gstVerified:false,iecVerified:false},products:[],observations:[],createdAt:data.capturedAt||imNow()};newCompanies++;}
  company.aliases=imMergeArray(company.aliases,aliases);company.profiles=imMergeArray(company.profiles,[row.profile||row.companyUrl]);company.companyId||=imText(row.companyId);company.name=company.name||imText(row.name);company.city=company.city||imText(row.city);company.state=company.state||imText(row.state);company.address=company.address||imText(row.address);company.businessType=imMergeText(company.businessType,row.businessType);company.rating=company.rating||imText(row.rating);company.reviewCount=company.reviewCount||imText(row.reviewCount);company.establishedYear=company.establishedYear||imText(row.establishedYear);company.exportingSince=company.exportingSince||imText(row.exportingSince);company.exportsTo=imMergeArray(company.exportsTo,row.exportsTo);
  const flags=row.verifications||{};for(const key of Object.keys(company.verifications))company.verifications[key]=company.verifications[key]||!!flags[key];
  const productMap=new Map((company.products||[]).map(item=>[(item.url&&imCanonicalURL(item.url))||`title:${imNorm(item.title)}`,item]));for(const product of row.products||[]){const item={title:imText(product.title),url:imCanonicalURL(product.url),price:imText(product.price),specifications:imText(product.specifications),primary:!!product.primary},key=item.url||`title:${imNorm(item.title)}`,existing=productMap.get(key);if(!key)continue;if(existing){existing.primary=!!existing.primary||item.primary;existing.price||=item.price;existing.specifications||=item.specifications;}else productMap.set(key,item);}company.products=[...productMap.values()].sort((a,b)=>Number(!!b.primary)-Number(!!a.primary));
  company.businessClass=imClassifyBusiness([company.businessType,row.evidence?.businessType].join(' '));company.updatedAt=data.capturedAt||imNow();
  company.observations.push({searchId,site:identity.site,source:data.source,page:identity.page,query:data.query||identity.query,cardIndex:row.index||0,companyProfile:imCanonicalURL(row.profile||row.companyUrl),productURLs:(row.products||[]).map(product=>imCanonicalURL(product.url)).filter(Boolean),businessTypeEvidence:imText(row.evidence?.businessType),badgeEvidence:imText(row.evidence?.badges),cardText:imText(row.evidence?.cardText).slice(0,1000),capturedAt:data.capturedAt||imNow()});companyKeys.push(company.key);
 }
 for(const [key,company] of Object.entries(db.companies))if(company.projectId===projectId&&!(company.observations||[]).length)delete db.companies[key];
  const pageKey=`${searchId}::${identity.page}`;db.pages[pageKey]={pageKey,searchId,projectId,site:identity.site,source:data.source,page:identity.page,query:data.query||identity.query,state:'collected',count:companyKeys.length,companyKeys,next:data.next||'',pagination:data.pagination||{},preparation:data.preparation||null,extraction:data.extraction||null,declaredTotal:Number.isInteger(declared)?declared:null,declaredTotalKind:data.declaredTotalKind||'unknown',noResults:!!data.noResults,capturedAt:data.capturedAt||imNow()};
 return {searchId,page:identity.page,newCompanies,rows:companyKeys.length,audit:imAuditSearch(db,searchId)};
}

function imAuditSearch(db,searchId){
 const search=db.searches?.[searchId];if(!search)throw Error('Search not found');const pages=Object.values(db.pages||{}).filter(page=>page.searchId===searchId&&page.state==='collected').sort((a,b)=>a.page-b.page);const terminalPages=pages.filter(page=>page.pagination?.terminal).map(page=>page.page),terminal=terminalPages.length?Math.max(...terminalPages):0,numbers=new Set(pages.map(page=>page.page));
 const contiguous=!!terminal&&Array.from({length:terminal},(_,index)=>index+1).every(page=>numbers.has(page));const rawCards=pages.reduce((total,page)=>total+(page.companyKeys?.length||0),0),detectedCards=pages.reduce((total,page)=>total+(Number(page.extraction?.detectedCards)||0),0),unparsedCards=pages.reduce((total,page)=>total+(Number(page.extraction?.unparsedCards)||0),0),sourceCompanies=new Set(pages.flatMap(page=>page.companyKeys||[])),outputCompanies=new Set();for(const company of Object.values(db.companies||{}))if(company.projectId===search.projectId&&(company.observations||[]).some(observation=>observation.searchId===searchId))outputCompanies.add(company.key);
 const missing=[...sourceCompanies].filter(key=>!outputCompanies.has(key)),extra=[...outputCompanies].filter(key=>!sourceCompanies.has(key)),setMatches=!missing.length&&!extra.length,declaredTotal=Number.isInteger(search.declaredTotal)?search.declaredTotal:null,declaredTotalKind=search.declaredTotalKind||'unknown',countMatches=declaredTotalKind==='exact'&&Number.isInteger(declaredTotal)?declaredTotal===sourceCompanies.size:null,noResults=pages.length===1&&pages[0].noResults,qualityProblems=[];
 for(const page of pages){const extraction=page.extraction,preparation=page.preparation;if(!extraction)qualityProblems.push(`Page ${page.page}: Legacy capture lacks quality evidence. Rerun this search`);else{const detected=Number(extraction.detectedCards)||0,parsed=Number(extraction.parsedRows)||0,unparsed=Number(extraction.unparsedCards)||0;if(unparsed>0||parsed<detected)qualityProblems.push(`Page ${page.page}: ${Math.max(unparsed,detected-parsed)} unparsed cards`);if(parsed!==Number(page.count||0))qualityProblems.push(`Page ${page.page}: Card and saved row counts differ`);}if(preparation?.blocked)qualityProblems.push(`Page ${page.page}: Access check detected`);if(preparation?.timedOut)qualityProblems.push(`Page ${page.page}: Page preparation timed out`);if(preparation?.limitReached)qualityProblems.push(`Page ${page.page}: Show More limit reached`);if(preparation&&Number(preparation.stalledClicks)>0&&!preparation.exhausted)qualityProblems.push(`Page ${page.page}: Show More stopped before the end could be confirmed`);if(preparation?.resultCards&&extraction?.parsedRows<preparation.resultCards)qualityProblems.push(`Page ${page.page}: ${preparation.resultCards-extraction.parsedRows} loaded cards were missed`);}
 const qualityComplete=!qualityProblems.length,complete=(noResults||contiguous)&&setMatches&&countMatches!==false&&qualityComplete,problems=[];if(!noResults&&!terminal)problems.push('End of pagination unconfirmed');else if(!noResults&&!contiguous)problems.push('Pages are missing between page 1 and the end');if(!setMatches)problems.push(`Set mismatch. ${missing.length} missing, ${extra.length} extra`);if(countMatches===false)problems.push(`The site reports exactly ${declaredTotal}. Captured ${sourceCompanies.size} unique companies`);if(countMatches===null&&Number.isInteger(declaredTotal))problems.push(`The site count (${declaredTotal}) is approximate or informational`);problems.push(...qualityProblems);
 return {searchId,site:search.site,query:search.query,pages:pages.length,terminalPage:terminal,contiguous,rawCards,detectedCards,unparsedCards,uniqueCompanies:sourceCompanies.size,duplicatesMerged:rawCards-sourceCompanies.size,declaredTotal,declaredTotalKind,countMatches,missing,extra,setMatches,qualityComplete,complete,status:complete?(problems.length?`Complete coverage. ${problems.join(' | ')}`:'Complete and consistent coverage'):(problems.join(' | ')||'Complete coverage unconfirmed')};
}

function imAudits(db,projectId){return Object.values(db.searches||{}).filter(search=>search.projectId===projectId).map(search=>imAuditSearch(db,search.id));}
function imProjectCompanies(db,projectId){return Object.values(db.companies||{}).filter(company=>company.projectId===projectId);}

function imRelevance(company,project){
 if(!project?.assessmentEnabled)return 'not_assessed';const include=imTerms(project.include).map(imNorm),exclude=imTerms(project.exclude).map(imNorm),text=imNorm([company.name,company.businessType,...(company.products||[]).map(product=>product.title)].join(' '));if(exclude.some(term=>term&&text.includes(term)))return 'review_excluded_term';if(!include.length)return 'not_assessed';return include.some(term=>term&&text.includes(term))?'keyword_match':'unclear';
}

function imClearProjectResults(db,projectId){
 imProject(db,projectId);let companies=0,searches=0,pages=0;for(const [key,value] of Object.entries(db.companies||{}))if(value.projectId===projectId){delete db.companies[key];companies++;}for(const [key,value] of Object.entries(db.searches||{}))if(value.projectId===projectId){delete db.searches[key];searches++;}for(const [key,value] of Object.entries(db.pages||{}))if(value.projectId===projectId){delete db.pages[key];pages++;}const before=(db.errors||[]).length;db.errors=(db.errors||[]).filter(value=>value.projectId!==projectId);return {companies,searches,pages,errors:before-db.errors.length};
}

function imValidateBackup(value){if(!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==IM_SCHEMA)throw Error('Select a backup from IndiaMART Supplier Suite v1.');for(const key of ['projects','companies','searches','pages'])if(!value[key]||typeof value[key]!=='object')throw Error('The backup format is invalid.');value.errors??=[];value.activeProjectId??='';return value;}

if(typeof module!=='undefined')module.exports={IM_SCHEMA,imText,imNorm,imTerms,imNewDB,imCreateProject,imProject,imAllowedURL,imSite,imPageIdentity,imCanonicalURL,imAliases,imClassifyBusiness,imMergePage,imAuditSearch,imAudits,imProjectCompanies,imRelevance,imClearProjectResults,imValidateBackup};
