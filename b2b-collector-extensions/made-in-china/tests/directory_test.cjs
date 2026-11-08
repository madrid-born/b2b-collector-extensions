const fs=require('fs'),vm=require('vm'),assert=require('assert'),{parseHTML}=require('linkedom');
const raw=fs.readFileSync('upload/Iv cannula Manufacturers & Suppliers, China iv cannula Manufacturers Price.html','utf8'),source=raw.match(/saved from url=\(\d+\)(https?:\/\/[^\s<>]+)/)[1];
const doc=parseHTML(raw).document,ctx={URL,document:doc,location:{href:source}};vm.createContext(ctx);for(const f of ['model.js','extractor.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const d=ctx.extractMIC();assert.equal(d.rows.length,50);assert(d.manufacturerFilter);assert.equal(d.selectedFilters['Business Type'],'Manufacturer/Factory');assert.equal(d.certificateCodes.length,0);assert.equal(d.pagination.current,1);assert(!d.pagination.terminal);assert.equal(ctx.micIdentity(d.next).search,ctx.micIdentity(source).search);assert.equal(ctx.micIdentity(d.next).page,2);
assert.equal(d.rows[0].businessType,'Manufacturer/Factory & Trading Company');assert(d.rows[0].mainProducts.includes('Blood Collection Tubes'));assert.equal(d.rows[1].profile,'https://longli.en.made-in-china.com/');
for(const [i,card] of [...doc.querySelectorAll('.list-node')].entries()){
 const row=d.rows[i];assert.equal(row.name,card.querySelector('.company-name a').textContent.replace(/\s+/g,' ').trim());
 for(const [label,field] of [['Business Type','businessType'],['Main Products','mainProducts'],['City/Province','city']]){
  const el=[...card.querySelectorAll('label.subject')].find(x=>x.textContent.trim()===label+':');
  const expected=el?[...el.parentNode.children].filter(x=>x!==el).map(x=>x.textContent).join(' ').replace(/\s+/g,' ').trim():'';assert.equal(row[field],expected);
 }
}
const db={companies:{},pages:[]};ctx.micMerge(db,d,'IV');assert.equal(ctx.micSummary(db,'IV')[0].complete,false);
for(const [url,page] of [['https://www.made-in-china.com/manufacturers/iv-cannula.html',1],['https://www.made-in-china.com/manufacturers/iv-cannula_2.html',2]]){assert.equal(ctx.micIdentity(url).page,page);const testDoc=doc.cloneNode(true);testDoc.querySelector('.pager strong').textContent=String(page);const bare=ctx.extractMIC(testDoc,url);assert(bare.manufacturerFilter);assert(bare.query);}
// Synthetic boundary: bare-directory last page must read its underscore page number.
const synthetic=parseHTML(raw).document;synthetic.querySelector('.pager strong').remove();for(const a of synthetic.querySelectorAll('.pager a'))a.remove();const strong=synthetic.createElement('strong');strong.textContent='3';synthetic.querySelector('.pager').append(strong);const end=ctx.extractMIC(synthetic,'https://www.made-in-china.com/manufacturers/iv-cannula_3.html');assert.equal(end.pagination.current,3);assert(end.pagination.terminal);
console.log('PASS: real directory HTML: 50 companies, all names/business/main-products/cities match; profile root, filter preservation, no-certificate extraction; directory URLs and synthetic terminal page');

const noInput=parseHTML(raw).document;noInput.querySelectorAll('input[name=word]').forEach(n=>n.remove());noInput.querySelector('.pager strong').textContent='2';assert.equal(ctx.extractMIC(noInput,'https://www.made-in-china.com/manufacturers/iv-cannula_2.html').query.toLowerCase(),'iv cannula');console.log('PASS: directory query fallback without search input');
