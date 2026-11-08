const Model={
 profileId(r){
  if(r.companyId&&/^\d+$/.test(String(r.companyId)))return String(r.companyId);
  try{return new URL(r.companyUrl).pathname.match(/-(\d+)\/?$/)?.[1]||'';}catch{return '';}
 },
 companyKey(r){
  const id=this.profileId(r);if(id)return 'profile:'+id;
  // Missing profile IDs are never merged merely because names match.
  if(r.productId||r.productUrl)return 'unresolved-product:'+(r.productId||r.productUrl);
  return 'unresolved-card:'+[r.sourceUrl||'',r.position??'',r.companyLink||''].join('|');
 },
 key(r){return this.companyKey(r)+'|'+(r.productId||r.productUrl||'company-only');},
 status(p,r){return r.productUrl?'product':'company-only';},
 keywords(r){
  const values=[...(r.keywords||[]),r.keyword,...(r.evidence||[]).map(e=>e.keyword||this.keywordFromUrl(e.sourceUrl))];
  const seen=new Set();return values.filter(Boolean).filter(v=>{const k=v.toLowerCase().trim();if(seen.has(k))return false;seen.add(k);return true;});
 },
 keywordFromUrl(u){try{return new URL(u).searchParams.get('keyword')||'';}catch{return ''; }},
 merge(project,snapshot){
  let added=0;const now=new Date().toISOString();
  for(const row of snapshot.rows){
   const key=this.key(row),old=project.records.find(r=>this.key(r)===key);
   const evidence={sourceUrl:row.sourceUrl,page:row.page,position:row.position,capturedAt:row.capturedAt,keyword:row.keyword||snapshot.keyword||this.keywordFromUrl(row.sourceUrl),businessType:row.businessType,status:row.status,productName:row.productName,companyName:row.companyName,location:row.location,companyUrl:row.companyUrl,manufacturerFilter:snapshot.manufacturerFilter};
   if(old){old.evidence||=[];if(!old.evidence.some(e=>e.sourceUrl===evidence.sourceUrl&&e.position===evidence.position&&e.productName===evidence.productName&&e.businessType===evidence.businessType&&e.manufacturerFilter===evidence.manufacturerFilter))old.evidence.push(evidence);old.keywords=this.keywords({...old,keywords:[...this.keywords(old),evidence.keyword]});}
   else{project.records.push({...row,keywords:[evidence.keyword].filter(Boolean),evidence:[evidence]});added++;}
  }
  project.captures.push({at:now,keyword:snapshot.keyword||this.keywordFromUrl(snapshot.sourceUrl),page:snapshot.page,url:snapshot.sourceUrl,reportedTotal:snapshot.reportedTotal,cards:snapshot.cardCount,productCards:snapshot.productCards,nonSponsoredProductCards:snapshot.nonSponsoredProductCards,newSponsoredProductCards:snapshot.newSponsoredProductCards,usefulProductCards:snapshot.usefulProductCards,companyOnlyCards:snapshot.companyOnlyCards,newRecords:added,filter:snapshot.manufacturerFilter,signature:snapshot.signature,scroll:snapshot.scroll||null});
  return added;
 },
 companies(p){
  const map=new Map();
  for(const r of p.records){
   const key=this.companyKey(r);if(!map.has(key))map.set(key,{profileId:this.profileId(r),name:r.companyName,url:r.companyUrl,locations:new Set(),businessTypes:new Set(),products:new Set(),links:new Set(),pages:new Set(),keywords:new Set(),sources:new Set(),companyLinks:new Set(),filters:new Set()});
   const c=map.get(key);
   for(const k of this.keywords(r))c.keywords.add(k);
   if(r.productUrl){c.products.add(r.productName);c.links.add(r.productUrl);}
   if(r.location)c.locations.add(r.location);if(r.businessType)c.businessTypes.add(r.businessType);if(r.companyLink)c.companyLinks.add(r.companyLink);
   for(const e of r.evidence||[]){if(e.page)c.pages.add(e.page);if(e.sourceUrl)c.sources.add(e.sourceUrl);if(e.businessType)c.businessTypes.add(e.businessType);if(e.location)c.locations.add(e.location);if(e.productName&&r.productUrl)c.products.add(e.productName);if(typeof e.manufacturerFilter==='boolean')c.filters.add(e.manufacturerFilter?'Manufacturer on':'Manufacturer off');}
  }
  const join=s=>[...s].filter(Boolean).join('\n');
  return [...map.values()].map(c=>({profileId:c.profileId,name:c.name,url:c.url,location:join(c.locations),business:join(c.businessTypes),products:join(c.products),links:join(c.links),pages:[...c.pages].sort((a,b)=>a-b).join(', '),keywords:join(c.keywords),sources:join(c.sources),companyLinks:join(c.companyLinks),cardType:c.products.size?'Has product card':'Company card only',filters:join(c.filters)||'Not logged (legacy)',identity:c.profileId?'Profile ID':'Missing profile ID; retained with source/product identity'}));
 }
};
if(typeof module!=='undefined')module.exports=Model;
