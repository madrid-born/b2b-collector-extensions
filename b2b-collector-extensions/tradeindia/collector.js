function inspectTradeIndia(config) {
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const normalize = s => clean(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const shown = e => e && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  const text = e => clean(e?.innerText || e?.textContent);
  const url = raw => {try {const u=new URL(raw,location.href); if(u.protocol !== 'https:' || !/(^|\.)tradeindia\.com$/i.test(u.hostname))return ''; u.hash=''; return u.href;}catch{return '';}};
  const visibleBody=document.body?.innerText || '';
  if(/verify (?:you are|that you are) human|unusual traffic|access denied|request blocked|captcha|checking your browser/i.test(document.title+' '+visibleBody.slice(0,2500)))return {error:'The page shows an access restriction or human verification check. Check the page in your browser.'};
  if(!/\/search\.html$/.test(location.pathname))return {error:'Open a TradeIndia product search on the search.html page.'};
  const current=new URL(location.href);
  const keyword=current.searchParams.get('keyword') || '';
  if(normalize(keyword)!==normalize(config.keyword))return {error:'The page keyword differs from the project keyword. Update the project or the search page.'};
  const check=document.querySelector('#manufacturer_check');
  const filterBadge=[...document.querySelectorAll('span.iconWrap')].some(a=>text(a.parentElement)==='Manufacturer' && shown(a.parentElement));
  const manufacturerFilter=!!check?.checked || filterBadge;
  const nodes=[...document.querySelectorAll('.coy-name')].filter(shown);
  const cards=[...new Set(nodes.map(n=>n.closest('.card')).filter(Boolean))];
  if(!cards.length)return {error:'No recognizable cards were loaded. Let the page finish loading, then try again.'};
  const rows=[];
  cards.forEach((card,index)=>{
    const nameNode=card.querySelector('.coy-name');
    const name=text(nameNode);
    const nameLink=nameNode?.closest('a') || nameNode?.querySelector('a');
    const rawCompany=url(nameLink?.href);
    const companyUrl=rawCompany && /^\/[a-z0-9][a-z0-9-]*-\d+\/?$/i.test(new URL(rawCompany).pathname)?rawCompany:'';
    const companyId=companyUrl ? new URL(companyUrl).pathname.match(/-(\d+)\/?$/)?.[1] : '';
    const businessNode=[...card.querySelectorAll('p')].find(e=>/^Business\s*Type\s*:/i.test(text(e)));
    const businessType=text(businessNode).replace(/^Business\s*Type\s*:\s*/i,'');
    const locNode=card.querySelector('.product_details .d-block.mt-2 span');
    const locationText=text(locNode);
    const sponsored=!!card.querySelector('img[alt*="Sponsored"],.ilcl-bedges');
    const products=new Map();
    for(const a of card.querySelectorAll('a[href*="/products/"]')){
      if(!shown(a))continue;
      const productUrl=url(a.href); if(!productUrl)continue;
      const titleNode=a.querySelector('.card_title,h2,h3');
      const productName=text(titleNode) || text(a) || clean(a.querySelector('img')?.alt);
      if(!productName)continue;
      const id=new URL(productUrl).pathname.match(/-c?(\d+)\.html$/)?.[1] || productUrl;
      if(!products.has(id) || titleNode)products.set(id,{productId:id,productName,productUrl});
    }
    const entries=products.size ? [...products.values()] : [{productId:'',productName:'',productUrl:''}];
    for(const product of entries){
      const status=product.productUrl?'product':'company-only';
      const reason=product.productUrl?'Raw product title and link collected from the card':'Company-only card retained for review';
      rows.push({companyId,companyName:name,companyUrl,companyLink:rawCompany,location:locationText,businessType,sponsored,...product,status,reason,page:Number(current.searchParams.get('page')||1),position:index+1,sourceUrl:location.href,keyword,capturedAt:new Date().toISOString()});
    }
  });
  const page=Number(current.searchParams.get('page')||1);
  const links=[...document.querySelectorAll('a[href]')].filter(shown).map(a=>({u:url(a.href),label:text(a),rel:a.rel})).filter(x=>x.u);
  const next=links.find(x=>{const u=new URL(x.u);return u.origin===current.origin && u.pathname===current.pathname && normalize(u.searchParams.get('keyword'))===normalize(keyword) && Number(u.searchParams.get('page'))===page+1;});
  // A full navigation resets the site's in-memory filters. Carry the current query
  // settings onto the site's actual next-page link, and explicitly encode Manufacturer.
  let nextUrl=next?.u||'';
  if(nextUrl){
    const target=new URL(nextUrl);
    for(const [key,value] of current.searchParams){
      if(key!=='page' && !target.searchParams.has(key))target.searchParams.append(key,value);
    }
    if(config.preserveManufacturerFilter||manufacturerFilter)target.searchParams.set('manufacturer','true');
    else target.searchParams.delete('manufacturer');
    nextUrl=target.href;
  }
  const totalMatch=visibleBody.match(/\b([\d,]+)\s+products\b/i);
  return {rows,page,keyword,manufacturerFilter,reportedTotal:totalMatch?Number(totalMatch[1].replace(/,/g,'')):null,cardCount:cards.length,productCards:new Set(rows.filter(r=>r.productUrl).map(r=>r.position)).size,companyOnlyCards:new Set(rows.filter(r=>!r.productUrl).map(r=>r.position)).size,nextUrl,sourceUrl:location.href,signature:rows.map(r=>(r.companyId||normalize(r.companyName))+'|'+r.productId).join(';')};
}

// Load cards by scrolling the real page; no relevance or role classification.
async function prepareTradeIndiaPage(){
 globalThis.__CAPA_TI_STOP_SCROLL=false;
 const start=Date.now();let stable=0,steps=0,lastHeight=-1,lastCount=-1;
 if(!/\/search\.html$/.test(location.pathname))return {error:'Open the search page.'};
 const text=(document.title+' '+(document.body?.innerText||'').slice(0,2500));
 if(/verify (?:you are|that you are) human|unusual traffic|access denied|request blocked|captcha|checking your browser/i.test(text))return {error:'Loading stopped after detecting an access restriction or human verification check.'};
 window.scrollTo(0,0);
 while(Date.now()-start<50000&&steps<120){
  if(globalThis.__CAPA_TI_STOP_SCROLL)return {error:'STOP_REQUESTED'};
  const height=Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0);
  window.scrollBy(0,Math.max(300,window.innerHeight*0.85));steps++;
  await new Promise(resolve=>setTimeout(resolve,300));
  if(window.scrollY+window.innerHeight>=height-8){
   await new Promise(resolve=>setTimeout(resolve,800));
   const h=Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0);
   const count=document.querySelectorAll('.coy-name').length;
   if(h===lastHeight&&count===lastCount)stable++;else stable=0;
   lastHeight=h;lastCount=count;
   if(globalThis.__CAPA_TI_STOP_SCROLL)return {error:'STOP_REQUESTED'};
   if(stable>=2){window.scrollTo(0,0);return {ready:true,steps,elapsedMs:Date.now()-start,loadedCompanyHeadings:count};}
  }else stable=0;
 }
 window.scrollTo(0,0);
 return {error:'The page failed to stabilize before the timeout. Retry after it finishes loading.',steps};
}

function interruptTradeIndiaPreparation(){globalThis.__CAPA_TI_STOP_SCROLL=true;return {stopRequested:true};}
