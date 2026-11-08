'use strict';

function imxText(node){return String(node?.innerText||node?.textContent||'').replace(/\s+/g,' ').trim();}
function imxLines(node){const rendered=String(node?.innerText||'').trim(),structural=[...node?.querySelectorAll?.('h1,h2,h3,h4,h5,h6,p,li,dt,dd,tr,button,a,strong')||[]].map(element=>String(element.textContent||'').trim()).filter(Boolean).join('\n'),source=[rendered,structural].filter(Boolean).join('\n')||String(node?.textContent||'');return [...new Set(source.split(/\r?\n/).map(value=>value.replace(/\s+/g,' ').trim()).filter(Boolean))];}
function imxSafe(value,source=location.href){if(!value)return '';try{const url=new URL(value,source);if(url.protocol!=='https:'||!/(^|\.)indiamart\.com$/i.test(url.hostname))return '';url.hash='';return url.href;}catch{return '';}}
function imxBlocked(doc=document){const text=imxText(doc.body),title=doc.title||'';return /captcha|verify you are human|access denied|request blocked|too many requests|security verification|403 forbidden/i.test(`${title} ${text}`);}
function imxSite(source=location.href){return new URL(source).hostname.toLowerCase()==='export.indiamart.com'?'export':'directory';}

function imxIsProduct(anchor,site){
 const href=imxSafe(anchor?.getAttribute?.('href'));if(!href)return false;const url=new URL(href),path=url.pathname;
 if(site==='export')return url.hostname==='export.indiamart.com'&&/\/(?:products?|product-detail|proddetail)(?:\/|$)/i.test(path);
 return /\/proddetail\//i.test(path);
}

function imxIsCompany(anchor,site){
 const href=imxSafe(anchor?.getAttribute?.('href'));if(!href)return false;const url=new URL(href),path=url.pathname.replace(/^\/+|\/+$/g,'');
 if(url.hostname==='www.indiamart.com')return /^[^/]+$/i.test(path)&&!/^(search|proddetail|impcat|enquiry|contact|seller|member|help|aboutus|terms|privacy)$/i.test(path);
 if(site==='export'&&url.hostname==='export.indiamart.com')return /^(?:company|supplier|seller)\/(?:\d+|[a-z0-9-]+)(?:\/[^?#]+)?$/i.test(path)||/^company-profile\/[a-z0-9-]+$/i.test(path);
 return false;
}

function imxPlausibleCompanyName(value){const text=String(value||'').replace(/\s+/g,' ').trim();return text.length>=2&&text.length<=180&&!/^(?:request quote|get latest price|get best price|ask price|show more|view more|load more|business type|nature of business|verified exporter|trustseal|gst verified|iec verified|exporting since|est\.? year|exports? to)$/i.test(text)&&!/(?:₹|£|\$|\b(?:rs\.?|inr)\s*\d)/i.test(text);}
function imxCompanyHint(anchor){const hint=[anchor?.className,anchor?.id,anchor?.getAttribute?.('aria-label'),anchor?.getAttribute?.('title'),anchor?.parentElement?.className].join(' '),data=anchor?.dataset||{};return /company|supplier|seller|firm|cmpny|vendor/i.test(hint)||!!(data.companyid||data.companyId||data.supplierId||data.sellerId||data.memberId);}
function imxCompanyAnchors(node,site){return [...node.querySelectorAll('a[href]')].filter(anchor=>imxPlausibleCompanyName(imxText(anchor))&&(imxIsCompany(anchor,site)||(imxCompanyHint(anchor)&&!!imxSafe(anchor.getAttribute('href'))&&!imxIsProduct(anchor,site))));}
function imxCompanyNameNodes(node){const selector='[data-company-name],[data-supplier-name],[data-seller-name],[class*="company-name" i],[class*="supplier-name" i],[class*="seller-name" i],[class*="firm-name" i],[class*="cmpny-name" i]';return [...node.querySelectorAll(selector)].filter(element=>imxPlausibleCompanyName(element.dataset?.companyName||element.dataset?.supplierName||element.dataset?.sellerName||imxText(element)));}
function imxCompanyAnchor(node,site){const anchors=imxCompanyAnchors(node,site);return anchors.sort((a,b)=>{const ah=imxCompanyHint(a),bh=imxCompanyHint(b);return Number(bh)-Number(ah);})[0]||null;}
function imxCompanyId(node,profile=''){const fromURL=profile.match(/\/(?:company|supplier|seller)\/(\d+)/i)?.[1];if(fromURL)return fromURL;for(const element of [node,...node.querySelectorAll('[data-companyid],[data-company-id],[data-supplier-id],[data-seller-id],[data-member-id]')]){const data=element?.dataset||{},value=data.companyid||data.companyId||data.supplierId||data.sellerId||data.memberId||element?.getAttribute?.('data-company-id')||'';if(String(value).trim())return String(value).trim();}return '';}
function imxCompanyIdentity(node,site,source=location.href){const anchor=imxCompanyAnchor(node,site);if(anchor){const profile=imxSafe(anchor.getAttribute('href'),source),name=imxText(anchor);return {anchor,profile,name,companyId:imxCompanyId(node,profile)};}const named=imxCompanyNameNodes(node)[0],dataNode=node.matches?.('[data-company-name],[data-supplier-name],[data-seller-name]')?node:node.querySelector?.('[data-company-name],[data-supplier-name],[data-seller-name]'),name=(named?.dataset?.companyName||named?.dataset?.supplierName||named?.dataset?.sellerName||imxText(named)||dataNode?.dataset?.companyName||dataNode?.dataset?.supplierName||dataNode?.dataset?.sellerName||'').trim();return imxPlausibleCompanyName(name)?{anchor:null,profile:'',name,companyId:imxCompanyId(node)}:null;}

function imxProductAnchors(node,site){
 return [...node.querySelectorAll('a[href]')].filter(anchor=>{
  if(imxIsProduct(anchor,site))return true;if(imxIsCompany(anchor,site)||imxCompanyHint(anchor))return false;
  const href=imxSafe(anchor.getAttribute('href')),text=imxText(anchor);if(!href||!text||/^(?:request quote|get latest price|get best price|ask price|show more products?)$/i.test(text))return false;
  const hint=[anchor.className,anchor.parentElement?.className,anchor.getAttribute('data-product-id'),anchor.getAttribute('data-pid')].join(' ');
  return /(?:^|[\s_-])(?:product|prd|item)(?:[\s_-]|$)/i.test(hint)||!!anchor.closest?.('h1,h2,h3,h4,[class*="product" i],[class*="prd" i]');
 });
}
function imxPrimaryProductNode(card,companyName=''){const selector='[data-product-name],[class*="product-name" i],[class*="product-title" i],[class*="prd-name" i],[class*="prd-title" i],h1,h2,h3,h4';return [...card.querySelectorAll(selector)].find(node=>{const text=(node.dataset?.productName||imxText(node)).trim();return text&&text!==companyName&&text.length>=3&&text.length<=300&&!/^(?:business type|nature of business|verified exporter|trustseal|gst verified|iec verified)$/i.test(text);})||null;}
function imxHasAction(node){return /request quote|get latest price|get best price|ask price|₹|£|\$|rs\.?\s*\d|inr\s*\d/i.test(imxText(node));}
function imxCompanySignatures(node,site){const signatures=new Set();for(const anchor of imxCompanyAnchors(node,site)){const href=imxSafe(anchor.getAttribute('href'));signatures.add(href?`url:${new URL(href).hostname}${new URL(href).pathname.replace(/\/$/,'')}`:`name:${imxText(anchor).toLowerCase()}`);}for(const element of imxCompanyNameNodes(node)){if(element.matches?.('a[href]')&&imxIsCompany(element,site))continue;const name=element.dataset?.companyName||element.dataset?.supplierName||element.dataset?.sellerName||imxText(element);if(name)signatures.add(`name:${name.toLowerCase()}`);}return signatures;}
function imxExplicitCard(node){return node?.matches?.('article,li,[role="listitem"],[data-companyid],[data-company-id],[data-supplier-id],[data-seller-id],[class*="listing" i],[class*="supplier" i],[class*="seller" i],[class*="result" i],[class*="product-card" i],[class*="prd-card" i]');}

function imxCardOf(seed,site){
 let node=seed,best=null,explicitBest=null;for(let level=0;level<14&&node?.parentElement;level++){node=node.parentElement;if(node.tagName==='BODY'||node.tagName==='HTML')break;const text=imxText(node);if(text.length>36000)break;const signatures=imxCompanySignatures(node,site);if(signatures.size>1){if(best)break;continue;}const identity=imxCompanyIdentity(node,site),hasProduct=imxProductAnchors(node,site).length>0||!!imxPrimaryProductNode(node,identity?.name||''),hasAction=imxHasAction(node);if(identity&&hasProduct&&hasAction){best=node;if(imxExplicitCard(node))explicitBest=node;}}
 return explicitBest||best;
}

function imxCards(doc,site){
 const candidates=[],seenNodes=new Set(),addCandidate=card=>{if(card&&!seenNodes.has(card)){seenNodes.add(card);candidates.push(card);}};
 const seeds=[...imxCompanyAnchors(doc,site),...imxCompanyNameNodes(doc),...doc.querySelectorAll('[data-companyid],[data-company-id],[data-supplier-id],[data-seller-id]'),...imxProductAnchors(doc,site)];for(const seed of seeds)addCandidate(imxCardOf(seed,site));
 const explicit='article,li,[role="listitem"],[data-companyid],[data-company-id],[data-supplier-id],[data-seller-id],[class*="listing" i],[class*="supplier" i],[class*="seller" i],[class*="result" i],[class*="product-card" i],[class*="prd-card" i]';for(const node of doc.querySelectorAll(explicit))if(imxCompanyIdentity(node,site)&&imxHasAction(node)&&(imxProductAnchors(node,site).length||imxPrimaryProductNode(node,imxCompanyIdentity(node,site)?.name||'')))addCandidate(node);
 const cards=new Map();for(const card of candidates){const identity=imxCompanyIdentity(card,site);if(!identity)continue;const key=identity.companyId?`id:${identity.companyId}`:identity.profile?`url:${new URL(identity.profile).hostname}${new URL(identity.profile).pathname.replace(/\/$/,'')}`:`name:${identity.name.toLocaleLowerCase()}`,score=imxProductAnchors(card,site).length*100+Math.min(imxText(card).length,9999),existing=cards.get(key);if(!existing||score>existing.score)cards.set(key,{card,score});}
 return [...cards.values()].map(item=>item.card).sort((a,b)=>{const position=a.compareDocumentPosition?.(b)||0;return position&4?-1:position&2?1:0;});
}

function imxField(lines,label){const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),valuePattern=new RegExp(`^${escaped}\\s*[:：-]\\s*(.+)$`,'i'),sameLinePattern=new RegExp(`^${escaped}\\s+(.+)$`,'i'),labelOnlyPattern=new RegExp(`^${escaped}\\s*[:：-]?\\s*$`,'i');for(let index=0;index<lines.length;index++){const line=lines[index],match=line.match(valuePattern)||line.match(sameLinePattern);if(match?.[1])return match[1].trim();if(labelOnlyPattern.test(line)&&lines[index+1]&&!/^[\p{L} ]{2,30}\s*[:：]/u.test(lines[index+1]))return lines[index+1].trim();}return '';}
function imxMatch(text,regex){return text.match(regex)?.[1]?.trim()||'';}
function imxBusinessType(lines){const labelled=imxField(lines,'Business Type')||imxField(lines,'Nature of Business');if(labelled)return labelled;const exact=/^(?:manufacturer(?:\s*(?:&|and|\/)\s*(?:exporter|supplier|trader|wholesaler))?|manufacturer\/factory|wholesaler|trader|exporter|retailer|distributor|supplier|service provider)$/i;return lines.find(line=>exact.test(line))||'';}

function imxRow(card,index,site,source){
 const lines=imxLines(card),cardText=lines.join(' | '),identity=imxCompanyIdentity(card,site,source);if(!identity?.name)return null;const {profile,name,companyId}=identity;
 const productMap=new Map(),primaryNode=imxPrimaryProductNode(card,name),primaryTitle=(primaryNode?.dataset?.productName||imxText(primaryNode)).trim(),anchors=imxProductAnchors(card,site);
 for(const [anchorIndex,anchor] of anchors.entries()){const url=imxSafe(anchor.getAttribute('href'),source),title=(imxText(anchor)||anchor.getAttribute('title')||anchor.querySelector('img')?.alt||'').trim();if(!title)continue;let price='';const nearby=imxText(anchor.closest('div,li,article')||card),match=nearby.match(/((?:₹|Rs\.?|INR|£|\$)\s*[\d,.]+(?:\s*\/\s*[\p{L}]+)?)/iu);if(match)price=match[1];const key=(url&&url.split('#')[0])||`title:${title.toLocaleLowerCase()}`,primary=!!(primaryNode&&(primaryNode===anchor||primaryNode.contains?.(anchor)||anchor.contains?.(primaryNode)))||(!primaryNode&&anchorIndex===0);const existing=productMap.get(key);productMap.set(key,{title,url:url?url.split('#')[0]:'',price,specifications:'',primary:primary||!!existing?.primary});}
 if(primaryTitle&&!anchors.some(anchor=>primaryNode===anchor||primaryNode?.contains?.(anchor)||anchor.contains?.(primaryNode))){const key=`title:${primaryTitle.toLocaleLowerCase()}`;productMap.set(key,{title:primaryTitle,url:'',price:'',specifications:'',primary:true});}
 const products=[...productMap.values()].sort((a,b)=>Number(b.primary)-Number(a.primary)),businessType=imxBusinessType(lines);
 const city=imxField(lines,'City')||imxField(lines,'Location'),state=imxField(lines,'State'),address=imxField(lines,'Address');
 const reviewLine=lines.findIndex(line=>/\(\s*[\d,]+\s*Reviews?\s*\)/i.test(line)),rating=imxMatch(cardText,/\b([0-5](?:\.\d)?)\s*(?:\|\s*)?\(\s*[\d,]+\s*Reviews?\s*\)/i)||(reviewLine>0&&/^[0-5](?:\.\d)?$/.test(lines[reviewLine-1])?lines[reviewLine-1]:''),reviewCount=imxMatch(cardText,/\(\s*([\d,]+)\s*Reviews?\s*\)/i),establishedYear=imxField(lines,'Est. Year')||imxField(lines,'Established')||imxMatch(cardText,/(?:Est\.?\s*Year|Established(?:\s*in)?)\s*[:：]?\s*(\d{4})/i),exportingSince=imxField(lines,'Exporting Since');
 const exportText=imxField(lines,'Exports to'),exportsTo=exportText?exportText.split(/,|;/).map(value=>value.trim()).filter(Boolean):[];
 const badges=['Verified Exporter','TrustSEAL','GST Verified','IEC Verified'].filter(label=>cardText.toLowerCase().includes(label.toLowerCase()));
 return {index,name,profile,companyId,city,state,address,businessType,rating,reviewCount,establishedYear,exportingSince,exportsTo,verifications:{verifiedExporter:badges.includes('Verified Exporter'),trustSeal:badges.includes('TrustSEAL'),gstVerified:badges.includes('GST Verified'),iecVerified:badges.includes('IEC Verified')},products,evidence:{businessType:businessType?`Business Type: ${businessType}`:'',badges:badges.join(' | '),cardText:cardText.slice(0,1000)}};
}

function imxNext(doc,source,current){
 const direct=doc.querySelector('a[rel="next"][href],a.next[href],a.nextpage[href],[class*="next"] a[href]');if(direct)return imxSafe(direct.getAttribute('href'),source);
 for(const anchor of doc.querySelectorAll('a[href]'))if(/^\s*(?:next|\u0628\u0639\u062f\u06cc)\s*(?:[»›>]|page)?\s*$/i.test(imxText(anchor))||/next/i.test(anchor.getAttribute('aria-label')||anchor.getAttribute('title')||''))return imxSafe(anchor.getAttribute('href'),source);
 const numbered=[...doc.querySelectorAll('a[href]')].map(anchor=>({anchor,page:Number(imxText(anchor))})).filter(item=>Number.isInteger(item.page)&&item.page===current+1);return numbered[0]?imxSafe(numbered[0].anchor.getAttribute('href'),source):'';
}

function extractIndiaMART(doc=document,source=location.href,preparation=null){
 const site=imxSite(source),body=imxText(doc.body);if(imxBlocked(doc))return {source,site,blocked:true,rows:[],next:'',extraction:{detectedCards:0,parsedRows:0,unparsedCards:0},pagination:{current:1,terminal:false},capturedAt:new Date().toISOString()};
 const url=new URL(source),query=url.searchParams.get('ss')||url.searchParams.get('q')||url.searchParams.get('query')||doc.querySelector('input[name="ss"],input[type="search"],input[placeholder*="Search"]')?.value||'';
 const active=doc.querySelector('[aria-current="page"],.active.page,.pagination .active,.pager .active'),current=Number(url.searchParams.get('page')||url.searchParams.get('pageno')||imxText(active)||1)||1,noResults=/no (?:products?|suppliers?|results?) found|sorry[^.]{0,60}no matching|0\s+(?:products?|results?)/i.test(body),cards=imxCards(doc,site),rows=cards.map((card,index)=>imxRow(card,index+1,site,source)).filter(Boolean),next=imxNext(doc,source,current),unparsedCards=Math.max(0,cards.length-rows.length);
 let declaredTotal=null,declaredTotalKind='unknown';const declared=body.match(/(?:about\s*)?([\d,]+)\s+(?:products?|suppliers?|results?)/i)||body.match(/(?:products?|suppliers?|results?)\s*[:：]?\s*(?:about\s*)?([\d,]+)/i);if(declared){declaredTotal=Number(declared[1].replace(/,/g,''));declaredTotalKind='approximate';}
 const hasPager=!!doc.querySelector('.pagination,.pager,[class*="pagination"],[aria-label*="pagination" i]'),dynamicEnd=!!preparation?.exhausted&&!preparation?.timedOut&&!preparation?.limitReached&&!(preparation?.stalledClicks>0),terminal=noResults||(!next&&(hasPager||dynamicEnd)),visiblePages=[...doc.querySelectorAll('.pagination a,.pager a,[class*="pagination"] a')].map(node=>Number(imxText(node))).filter(Number.isInteger);
 return {rows,next,source,site,query,declaredTotal,declaredTotalKind,noResults,preparation:preparation||null,extraction:{detectedCards:cards.length,parsedRows:rows.length,unparsedCards,primaryProducts:rows.filter(row=>row.products?.some(product=>product.primary)).length},pagination:{current,visiblePages,terminal,evidence:noResults?'explicit no-results message':next?'next-page link found':dynamicEnd?`dynamic list exhausted after ${preparation.loadMoreClicks||0} load-more click(s)`:terminal?'pagination ends here':'ending not proven'},capturedAt:new Date().toISOString()};
}

function imxIsLoadMoreText(value){return /^(?:show|load|view)\s+more\s+(?:products?|suppliers?|results?)(?:\s*\(\s*\d+\s*\))?$/i.test(String(value||'').replace(/\s+/g,' ').trim());}
function imxUsableControl(node){if(!node||node.hidden||node.disabled||node.getAttribute?.('aria-disabled')==='true')return false;const view=node.ownerDocument?.defaultView,style=view?.getComputedStyle?.(node);return !style||!(style.display==='none'||style.visibility==='hidden'||style.pointerEvents==='none');}
function imxFindLoadMore(doc=document){return [...doc.querySelectorAll('button,a[href],[role="button"],input[type="button"]')].find(node=>imxUsableControl(node)&&[node.value,imxText(node),node.getAttribute?.('aria-label'),node.getAttribute?.('title')].some(imxIsLoadMoreText))||null;}
function imxPageSnapshot(doc=document,site=imxSite(location.href)){const companies=new Set(imxCompanyAnchors(doc,site).map(anchor=>imxSafe(anchor.getAttribute('href'))||`name:${imxText(anchor).toLocaleLowerCase()}`).filter(Boolean)),products=new Set(imxProductAnchors(doc,site).map(anchor=>imxSafe(anchor.getAttribute('href'))||`title:${imxText(anchor).toLocaleLowerCase()}`).filter(Boolean)),cards=imxCards(doc,site);return {companies:companies.size,companySignals:cards.length,products:products.size,cards:cards.length,links:doc.querySelectorAll('a[href]').length,height:doc.documentElement?.scrollHeight||0};}
function imxSnapshotGrew(before,after){return after.cards>before.cards||after.companySignals>before.companySignals||after.companies>before.companies||after.products>before.products;}
function imxSnapshotSame(a,b){return a.cards===b.cards&&a.companySignals===b.companySignals&&a.companies===b.companies&&a.products===b.products;}
function imxSleep(milliseconds){return new Promise(resolve=>setTimeout(resolve,milliseconds));}
async function imxWaitForGrowth(before,timeout=4000,absoluteDeadline=Infinity){const deadline=Math.min(Date.now()+timeout,absoluteDeadline),site=imxSite(location.href);let grew=false,last=before,stableSince=0;while(Date.now()<deadline){await imxSleep(Math.min(200,Math.max(0,deadline-Date.now())));const after=imxPageSnapshot(document,site);if(imxSnapshotGrew(before,after)){grew=true;if(imxSnapshotSame(last,after)){stableSince=stableSince||Date.now();if(Date.now()-stableSince>=600)return {grew:true,snapshot:after};}else stableSince=0;}last=after;}return {grew,snapshot:last};}

async function prepareIndiaMARTPage(options={}){
 if(imxBlocked(document))return {blocked:true,exhausted:false,rounds:0,loadMoreClicks:0};
 const settings=typeof options==='number'?{maxRounds:options}:options,maxRounds=Math.max(4,Math.min(40,Number(settings.maxRounds)||20)),maxDurationMs=Math.max(10000,Math.min(60000,Number(settings.maxDurationMs)||45000)),maxLoadMoreClicks=Math.max(1,Math.min(20,Number(settings.maxLoadMoreClicks)||10)),startedAt=Date.now(),deadline=startedAt+maxDurationMs,start=window.scrollY,site=imxSite(location.href);let rounds=0,loadMoreClicks=0,stableRounds=0,stalledClicks=0,snapshot=imxPageSnapshot(document,site),exhausted=false,limitReached=false;
 try{
  for(rounds=1;rounds<=maxRounds&&Date.now()<deadline;rounds++){
   const height=document.documentElement.scrollHeight;for(const ratio of [0.35,0.65,0.85,1]){if(Date.now()>=deadline)break;window.scrollTo({top:Math.floor(height*ratio),behavior:'auto'});await imxSleep(Math.min(180,Math.max(0,deadline-Date.now())));}
   if(Date.now()>=deadline)break;const control=imxFindLoadMore(document);if(control){if(loadMoreClicks>=maxLoadMoreClicks){limitReached=true;break;}const before=imxPageSnapshot(document,site);control.scrollIntoView?.({block:'center',behavior:'auto'});await imxSleep(Math.min(120,Math.max(0,deadline-Date.now())));control.click();loadMoreClicks++;const outcome=await imxWaitForGrowth(before,5000,deadline);snapshot=outcome.snapshot;if(outcome.grew){stableRounds=0;stalledClicks=0;}else{stalledClicks++;if(stalledClicks>=2)break;}continue;}
   const before=snapshot,outcome=await imxWaitForGrowth(before,1100,deadline);snapshot=outcome.snapshot;if(outcome.grew)stableRounds=0;else stableRounds++;if(stableRounds>=3){exhausted=true;break;}
  }
 }finally{window.scrollTo({top:start,behavior:'auto'});}
 const timedOut=Date.now()>=deadline;return {blocked:false,exhausted,rounds:Math.min(rounds,maxRounds),loadMoreClicks,companyAnchors:snapshot.companies,companySignals:snapshot.companySignals,resultCards:snapshot.cards,productAnchors:snapshot.products,linkCount:snapshot.links,documentHeight:snapshot.height,stalledClicks,timedOut,limitReached,durationMs:Date.now()-startedAt};
}
