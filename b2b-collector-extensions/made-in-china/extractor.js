function extractMIC(doc=document, source=location.href) {
 const text=n=>(n?.textContent||'').replace(/\s+/g,' ').trim();
 const site=u=>u.protocol==='https:'&&/(^|\.)made-in-china\.com$/i.test(u.hostname)&&!u.username&&!u.password;
 const origin=new URL(source);if(!site(origin))throw Error('Open a Made-in-China page.');
 const safe=value=>{try{if(!value)return '';const u=new URL(value,source);return site(u)?u.href:''}catch{return ''}};
 const decode=value=>{try{return decodeURIComponent(value)}catch{return value}};
 const path=decode(origin.pathname),body=text(doc.body);
 if(/Sorry, you have been blocked|Verify you are human|Checking your browser/i.test(body)||/Attention Required|Just a moment/i.test(doc.title))throw Error('Security verification/block: collection stopped.');
 const profileAnchor=n=>n.querySelector('.company-name a,.qs-card__name,.supplier-name a,h2 a,h3 a')||[...n.querySelectorAll('a[href]')].find(a=>isProfile(a)&&text(a).length>2);
 const isProfile=a=>{const href=safe(a?.getAttribute('href'));if(!href)return false;const u=new URL(href);return (/\.en\.made-in-china\.com$/i.test(u.hostname)&&(/^(?:\/)?$/.test(u.pathname)||/^\/(?:company-[^/]+\.html|360-Virtual-Tour\.html)$/i.test(u.pathname)))||/^\/showroom\/[^/]+\/?$/.test(u.pathname)};
 const totalText=text(doc.querySelector('.qs-page__tip-text'))||text(doc.querySelector('h1'));
 const totalMatch=totalText.match(/([\d,]+)\s+(?:manufacturers(?:\s+and\s+suppliers)?|suppliers|results)\s+found/i);const reportedTotal=totalMatch?Number(totalMatch[1].replace(/,/g,'')):null;
 const emptySupplierList=reportedTotal===0&&!!doc.querySelector('.qs-filter-group,.refine-node')&&/manufacturers|suppliers/i.test(totalText);
 // Recognize repeated supplier cards, independent of the URL path.
 let candidates=[...doc.querySelectorAll('.list-node,.qs-card,.supplier-card')].filter(n=>n.querySelector('.company-name,.qs-card__title,.supplier-name,h2,h3'));
 if(!candidates.length){
  const found=new Set();
  for(const a of doc.querySelectorAll('h2 a,h3 a,.company-name a,.supplier-name a,a[href*=".en.made-in-china.com"],a[href*="/showroom/"]')){
   if(!isProfile(a)||!text(a))continue;let n=a.parentElement;
   for(let i=0;n&&i<7;i++,n=n.parentElement){
    if(n===doc.body)break;
    const titles=[...n.querySelectorAll('a[href]')].filter(a=>isProfile(a)&&text(a).length>2);
    if(titles.length>1)break;
    if(titles.length===1&&/(?:Main Products|City\/Province|Business Type)\s*:/i.test(text(n))&&(n.tagName==='ARTICLE'||n.tagName==='LI'||n.querySelector('a[href*="/product/"],a[href*="audited-supplier-reports"]'))){found.add(n);break;}
   }
  }
  candidates=[...found];
 }
 candidates=candidates.filter(n=>!candidates.some(other=>other!==n&&other.contains(n)));
 if(!candidates.length&&!emptySupplierList)throw Error('No supplier list could be identified in the page content. Open supplier results and wait for them to load.');
 // Product result tiles are not supplier result cards.
 if(!candidates.every(n=>/(?:Main Products|City\/Province|Business Type)\s*:/i.test(text(n))))throw Error('Supplier details could not be identified for every card; page not saved.');
 const selectedFilters={},filterParameters={},missingRequestedFilters=[];
 const activeChipTexts=[...doc.querySelectorAll('.qs-selected-tags__tag,[data-selected-filter]')].map(text);
 doc.querySelectorAll('.refine-node').forEach(n=>{const selected=n.querySelector('.refine-selected');if(selected){const clone=selected.cloneNode(true);clone.querySelectorAll('a').forEach(a=>a.remove());const k=text(n.querySelector('h3'));if(k)selectedFilters[k]=text(clone)}});
 const groups=[...doc.querySelectorAll('.qs-filter-group,[faw-module$="filter"],[role="group"][aria-label]')];
 for(const group of groups){
  if(group.closest('.qs-card,.list-node,.supplier-card'))continue;
  const groupName=(group.getAttribute('aria-label')||text(group.querySelector('.qs-filter-group__title,h3,legend'))).replace(/:$/,'').trim();
  if(!groupName)continue;
  for(const input of group.querySelectorAll('input[type="radio"],input[type="checkbox"]')){
   const label=input.closest('label');const valueText=text(label?.querySelector('.ft-radio-label,.ft-checkbox-label'))||text(label)||label?.querySelector('img[alt]')?.getAttribute('alt')||'';
   const requested=!!(input.name&&origin.searchParams.getAll(input.name).includes(input.value));
   const checked=typeof input.checked==='boolean'?input.checked:(input.hasAttribute('checked')||requested);
   if(requested&&!checked&&!activeChipTexts.includes(valueText))missingRequestedFilters.push(groupName);
   if(!checked||!valueText)continue;
   selectedFilters[groupName]=selectedFilters[groupName]&&selectedFilters[groupName]!==valueText?[...new Set([selectedFilters[groupName],valueText])].sort().join(' | '):valueText;
   if(input.name)filterParameters[input.name]=input.value;
  }
  for(const input of group.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]),select')){
   const v=(input.value||input.getAttribute('value')||'').trim();if(v&&input.name){filterParameters[input.name]=v;selectedFilters[groupName+' / '+input.name]=v;}
  }
 }
 // Active chips can survive browser HTML saving without checked properties.
 for(const chip of doc.querySelectorAll('.qs-selected-tags__tag,[data-selected-filter]')){
  const label=text(chip).replace(/\s*[×✕]\s*$/,'');if(!label)continue;
  const matching=groups.find(g=>[...g.querySelectorAll('label')].some(n=>text(n)===label));
  const k=matching?.getAttribute('aria-label');if(k&&!selectedFilters[k])selectedFilters[k]=label;
 }
 if(missingRequestedFilters.length)throw Error('Requested filters are not active in page controls: '+[...new Set(missingRequestedFilters)].join(', '));
 const encodedManufacturer=/--BT_1(?:-|\/)/.test(path)||origin.searchParams.get('businessType')==='1';
 let manufacturer=encodedManufacturer;const certificates=[...new Set([...path.matchAll(/MC_(\d+)/g)].map(m=>m[1]).concat(origin.searchParams.getAll('managementCertification').flatMap(v=>v.split(',')),filterParameters.managementCertification||[]).filter(v=>/^\d+$/.test(v)))];
 if(encodedManufacturer&&selectedFilters['Business Type']&&!/Manufacturer\/Factory/i.test(selectedFilters['Business Type']))throw Error('Business filter on page differs from requested URL.');
 if(selectedFilters['Business Type'])manufacturer=/Manufacturer\/Factory/i.test(selectedFilters['Business Type']);
 else if(encodedManufacturer)selectedFilters['Business Type']='Manufacturer/Factory';
 if(certificates.includes('28')&&selectedFilters['Management Certification']&&!/ISO\s*13485/i.test(selectedFilters['Management Certification']))throw Error('Certificate filter on page differs from requested URL.');
 const input=doc.querySelector('input[name="word"],input[data-suggest="supplier"],input[type="search"]');
 const heading=doc.querySelector('h1');const headingCopy=heading?.cloneNode(true);headingCopy?.querySelectorAll('span,small').forEach(n=>{if(/\d+\s+(?:manufacturers|suppliers|results)/i.test(text(n)))n.remove()});
 const fallbackWord=(path.match(/company-search\/([^/]+)/)||[])[1]||(path.match(/^\/(?:manufacturers|quality-china-supplier)\/(.+?)(?:[-_]\d+)?\.html$/)||[])[1]?.replace(/[-_]/g,' ');
 const query=(input?.value||input?.getAttribute('value')||origin.searchParams.get('word')||origin.searchParams.get('keyword')||text(headingCopy).replace(/\s*Manufacturers\s*(?:&|and)?\s*Suppliers.*$/i,'').replace(/\s*Manufacturers.*$/i,'')||fallbackWord||'').replace(/\+/g,' ').trim();
 if(!query)throw Error('Supplier list found, but its search keyword could not be read.');
 const rows=candidates.map((n,index)=>{
  const a=profileAnchor(n);let profile=safe(a?.getAttribute('href'));if(!profile||!text(a))throw Error('Some supplier cards have no valid company link; page not saved.');
  if((n.querySelector('label.subject')&&!n.querySelector('table'))||n.matches('.qs-card')||!n.matches('.list-node')){const p=new URL(profile);if(p.hostname.endsWith('.en.made-in-china.com'))profile=p.origin+'/';}
  const fields={};n.querySelectorAll('table tr').forEach(tr=>{const cells=tr.querySelectorAll('td');if(cells.length>1)fields[text(cells[0]).replace(/\s*:\s*$/,'')]=text(cells[1]);});
  n.querySelectorAll('label.subject,.qs-card__detail-label,dt,[data-field-label]').forEach(label=>{const k=text(label).replace(/\s*:\s*$/,'');if(!k||fields[k])return;const value=label.matches('dt')?label.nextElementSibling:label.parentElement.querySelector('.qs-card__detail-value,dd,[data-field-value]');if(value)fields[k]=text(value);else{const clone=label.parentNode.cloneNode(true);clone.querySelectorAll('label,.qs-card__detail-label,[data-field-label]').forEach(x=>x.remove());fields[k]=text(clone);}});
  for(const label of n.querySelectorAll('label,dt,span,th,strong,b,div')){
   const key=text(label).match(/^(Main Products|Business Type|City\/Province)\s*:$/i)?.[1];if(!key)continue;
   const canonical={'main products':'Main Products','business type':'Business Type','city/province':'City/Province'}[key.toLowerCase()];if(fields[canonical])continue;
   let value=text(label.nextElementSibling);if(!value){const whole=text(label.parentElement);if(whole.startsWith(text(label)))value=whole.slice(text(label).length).trim();}
   value=value.split(/(?:Main Products|Business Type|City\/Province|R&D Capacity|Quick Response|Fast Delivery|Mgmt\. Certification)\s*:/i)[0].trim();
   if(value)fields[canonical]=value;
  }
  const products=[...n.querySelectorAll('a[href*="/product/"]')].map(a=>({title:a.getAttribute('title')||a.querySelector('img')?.getAttribute('title')||a.querySelector('img')?.alt||text(a),url:safe(a.getAttribute('href'))})).filter(p=>p.url&&p.title);
  // Retain the established title preference in old result cards.
  if(n.matches('.list-node')){products.length=0;for(const a of n.querySelectorAll('a[href]'))if(/\/product\//.test(a.getAttribute('href'))){const p={title:a.getAttribute('title')||text(a)||a.querySelector('img')?.alt||'',url:safe(a.getAttribute('href'))};if(p.url&&p.title)products.push(p);}}
  const p=new URL(profile);let key=p.hostname.toLowerCase();if(p.hostname==='www.made-in-china.com'||p.hostname==='made-in-china.com'){const m=p.pathname.match(/^\/showroom\/([^/]+)\/?$/);if(!m)throw Error('Unknown shared-domain profile: '+profile);key+='/showroom/'+m[1];}
  return {key,name:text(a),profile:profile.split('?')[0],businessType:fields['Business Type']||'',mainProducts:fields['Main Products']||'',city:fields['City/Province']||'',auditURL:safe(n.querySelector('a[href*="audited-supplier-reports"]')?.getAttribute('href')||''),products:[...new Map(products.map(p=>[p.url.split('?')[0],p])).values()],index:index+1,manufacturerFilter:manufacturer,certificateCodes:certificates,source,query};
 });
 const pager=[...doc.querySelectorAll('.pager,.qs-pagination,nav[aria-label="Pagination"],.pagination,[role="navigation"][aria-label="Pagination"]')].find(n=>!n.closest('.qs-card,.list-node,.supplier-card'));
 const numeric=n=>/^\d+$/.test(text(n))?Number(text(n)):0;
 const active=pager?.querySelector('[aria-current="page"],.ft-pagination-item.is-active,strong,.page-item.active,.pagination-item.active');
 const urlPage=(()=>{for(const k of ['page','pageNo','pageNum','pageIndex','p'])if(origin.searchParams.has(k))return Number(origin.searchParams.get(k));return Number(path.match(/\/(\d+)\.html$/)?.[1]||path.match(/[-_](\d+)\.html$/)?.[1]||0)})();
 const explicitPage=['page','pageNo','pageNum','pageIndex','p'].some(k=>origin.searchParams.has(k))||/^\/company-search\/[^/]+\/[^/]+\/\d+\.html$/.test(path)||/^\/manufacturers\/.+_\d+\.html$/.test(path);
 const current=numeric(active)||(explicitPage?urlPage:0)||1,currentKnown=!!numeric(active)||(explicitPage&&!!urlPage);
 if(!Number.isSafeInteger(current)||current<1||(explicitPage&&urlPage&&numeric(active)&&urlPage!==numeric(active)))throw Error('Visible page number differs from source URL; page not saved.');
 const links=[...pager?.querySelectorAll('a[href]')||[]].filter(a=>!a.closest('.qs-pagination__size,.num-per-page')&&!/^Show:/i.test(a.getAttribute('aria-label')||'')&&!a.matches('[aria-disabled="true"],.is-disabled,.disabled,.page-dis')&&!a.closest('.is-disabled,.disabled,.page-dis'));
 const numbers=links.map(numeric).filter(n=>n>0);
 const nextNode=links.find(a=>numeric(a)===current+1)||links.find(a=>a.matches('[rel="next"],.next')||/\bnext\b/i.test(a.getAttribute('aria-label')||text(a))||a.querySelector('.icon-right,.icon-arrow-right'));
 const rawNext=nextNode?.getAttribute('href')||'';let next=safe(rawNext);if(rawNext&&!next)throw Error('Invalid next-page URL; ending cannot be confirmed.');
 if(next){
  const target=new URL(next);const volatile=/^(?:pv_id|bv_id|pbv_id|faw_id|log_from|page|pageNo|pageNum|pageIndex|p)$/i;
  for(const [k,v] of origin.searchParams)if(!volatile.test(k)&&!target.searchParams.has(k))target.searchParams.append(k,v);
  for(const [k,v] of Object.entries(filterParameters))if(!target.searchParams.has(k))target.searchParams.set(k,v);
  next=target.href;
  // Legacy link-only filter routes remain usable when their directory pager omits encoded filters.
  if(path.startsWith('/company-search/')&&target.pathname.startsWith('/manufacturers/')){
   const m=path.match(/^(\/company-search\/([^/]+)\/[^/]+\/)\d+\.html$/),np=decode(target.pathname).match(/^\/manufacturers\/(.+?)_(\d+)\.html$/);
   if(m&&np&&m[2].replace(/\+/g,'-').toLowerCase()===np[1].toLowerCase()){target.pathname=m[1]+np[2]+'.html';next=target.href;}
  }
 }
 const future=numbers.some(n=>n>current),perPage=Number(text(doc.querySelector('.num-per-page .selected,.qs-pagination__size-option--active')))||0;
 const dynamicNext=[...pager?.querySelectorAll('button')||[]].some(n=>!n.disabled&&/\bnext\b|load more/i.test(n.getAttribute('aria-label')||text(n)));
 if(reportedTotal!==null&&perPage>0&&rows.length!==Math.max(0,Math.min(perPage,reportedTotal-(current-1)*perPage)))throw Error('Supplier cards are not fully loaded or result totals changed; page not saved.');
 const hasMoreResults=[...doc.querySelectorAll('button,a')].some(n=>!n.closest('.qs-card,.list-node,.supplier-card')&&/^(?:load|show) more(?: suppliers| companies| results)?$/i.test(n.getAttribute('aria-label')||text(n)));
 const singlePageEvidence=!pager&&reportedTotal===rows.length&&current===1&&!hasMoreResults;
 const terminal=(!!pager&&currentKnown&&!next&&!future&&!dynamicNext)||singlePageEvidence;
 const nextPage=next?(numeric(nextNode)||current+1):null;
 const pagination={current,perPage,visiblePages:numbers,terminal,nextPage,evidence:singlePageEvidence?'visible supplier total matches all cards':terminal?'supplier pager ends here':next?'next page available':'ending uncertain'};
 return {rows,next,source,query,selectedFilters,pagination,manufacturerFilter:manufacturer,certificateCodes:certificates,filterText:[...doc.querySelectorAll('.refine')].map(text).join(' | '),filterParameters,reportedTotal,contentVersion:1,capturedAt:new Date().toISOString()};
}
