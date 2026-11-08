const fs=require('fs'),vm=require('vm'),assert=require('assert'),{parseHTML}=require('linkedom');
const c={URL};vm.createContext(c);for(const f of ['model.js','extractor.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
function load(i){const s=JSON.parse(fs.readFileSync(`tests/fixtures/quality-${i}.json`));const html='<!doctype html><html><head><title>'+s.title+'</title></head><body><input name="word" value="'+s.query+'">'+(s.heading||'<h1>'+s.query+'</h1>')+s.filters.join('')+s.chips.join('')+s.cards.join('')+(s.pager||'')+'</body></html>';const d=parseHTML(html).document;for(const n of d.querySelectorAll('input'))if(s.checked.some(v=>v.name===n.name&&v.value===n.value))n.setAttribute('checked','checked');return {snapshot:s,doc:d};}
const db={schemaVersion:3,companies:{},pages:[]},results=[];let rawCount=0;
for(let i=1;i<=4;i++){
 const {snapshot:s,doc}=load(i),d=c.extractMIC(doc,s.source);results.push(d);rawCount+=d.rows.length;assert.equal(d.rows.length,s.cards.length);assert.equal(d.pagination.current,i);assert.equal(d.pagination.terminal,i===4);assert.equal(d.selectedFilters['Business Type'],'Manufacturer/Factory');assert.equal(d.manufacturerFilter,true);
 for(const [j,r] of d.rows.entries()){const e=s.expected[j];assert.equal(r.name,normalize(e.name));assert.equal(new URL(r.profile).hostname,new URL(e.profile,s.source).hostname);const fields=Object.fromEntries(e.fields.map(([k,v])=>[normalize(k).replace(/\s*:$/,''),normalize(v)]));assert.equal(r.city,fields['City/Province']||'');assert.equal(r.mainProducts,fields['Main Products']||'');assert.equal(r.businessType,fields['Business Type']||'');}
 if(d.next){assert.equal(new URL(d.next).searchParams.get('businessType'),'1');assert.equal(d.pagination.nextPage,i+1);}
 c.micMerge(db,d,'Live');
}
const {snapshot:isoSnapshot,doc:isoDoc}=load('iso');const iso=c.extractMIC(isoDoc,isoSnapshot.source);assert.equal(iso.rows.length,17);assert.equal(iso.selectedFilters['Management Certification'],'ISO 13485');assert(iso.certificateCodes.includes('28'));assert(iso.pagination.terminal);assert.equal(iso.pagination.current,1);
assert.equal(rawCount,113);assert.equal(db.pages.length,4);assert.equal(c.micSummary(db,'Live').length,1);assert(c.micSummary(db,'Live')[0].complete);
// Arbitrary paths and Made-in-China subdomains pass domain checks; lookalikes cannot.
for(const u of ['https://www.made-in-china.com/quality-china-supplier/iv_cannula.html?businessType=1','https://www.made-in-china.com/new/future/layout?x=1','https://made-in-china.com/anything','https://supplier.made-in-china.com/unseen'])assert.equal(c.micSiteURL(u),u);
for(const u of ['https://made-in-china.com.evil.test/path','https://evil.test/?site=made-in-china.com','https://made-in-china.com@evil.test/','https://evil.test@www.made-in-china.com/'])assert.throws(()=>c.micSiteURL(u));
const {doc:arbitrary}=load(1);const old=c.extractMIC(arbitrary,'https://www.made-in-china.com/anything/new/cmc_90.html');assert.equal(old.rows.length,30);assert.equal(old.pagination.current,1);
assert.equal(c.micPageIdentity(old).search,c.micPageIdentity(results[0]).search);
// The same card evidence under unknown class names remains discoverable.
const {doc:generic}=load(1);for(const n of generic.querySelectorAll('.qs-card'))n.className='future-supplier-entry';assert.equal(c.extractMIC(generic,'https://www.made-in-china.com/a/new-route').rows.length,30);
// Different DOM filters cannot collapse into one search even at the same URL.
const {doc:filtered}=load(1);filtered.querySelector('.qs-filter-group[aria-label="Business Type"]').remove();filtered.querySelectorAll('.qs-selected-tags__tag').forEach(n=>n.remove());const without=c.extractMIC(filtered,'https://www.made-in-china.com/anything');assert.notEqual(c.micPageIdentity(without).search,c.micPageIdentity(results[0]).search);
// A genuine product page/login page without supplier evidence remains rejected.
for(const text of ['<h1>Sign in</h1>','<h1>Medical IV Cannula</h1><a href="https://example.en.made-in-china.com/product/p.html">Product</a>'])assert.throws(()=>c.extractMIC(parseHTML('<html><body>'+text+'</body></html>').document,'https://www.made-in-china.com/unknown'));
// Existing projects retain the established search group instead of growing duplicate groups.
const legacy=JSON.parse(JSON.stringify(db));for(const p of legacy.pages){delete p.contentVersion;p.search='old-search-key';p.pageKey='Live::old-search-key::'+p.page;}for(const company of Object.values(legacy.companies))for(const o of company.observations)o.search='old-search-key';c.micMerge(legacy,results[0],'Live');assert.equal(c.micSummary(legacy,'Live').length,1);assert.equal(c.micSummary(legacy,'Live')[0].search,'old-search-key');
const {doc:unapplied}=load(1);unapplied.querySelectorAll('.qs-selected-tags__tag').forEach(n=>n.remove());const business=unapplied.querySelector('input[name="businessType"]');business.removeAttribute('checked');business.checked=false;assert.throws(()=>c.extractMIC(unapplied,'https://www.made-in-china.com/any?businessType=1'),/not active/);
const roundTrip=JSON.parse(JSON.stringify(db));c.micValidateBackup(roundTrip);assert.equal(c.micSummary(roundTrip,'Live')[0].companies,Object.keys(db.companies).length);
const {doc:zeroDoc}=load(1);zeroDoc.querySelectorAll('.qs-card,.qs-pagination').forEach(n=>n.remove());zeroDoc.querySelector('h1').innerHTML='<span class="qs-page__search-word">iv cannula</span><span class="qs-page__tip-text" role="status">0 manufacturers and suppliers found</span>';const zero=c.extractMIC(zeroDoc,'https://www.made-in-china.com/brand-new-path');assert.equal(zero.rows.length,0);assert(zero.pagination.terminal);const reduced=JSON.parse(JSON.stringify(db));c.micMerge(reduced,zero,'Live');assert.equal(Object.keys(reduced.companies).length,0);assert.equal(reduced.pages.length,1);
const before=Object.keys(db.companies).length;c.micDeleteSearch(db,'Live',c.micSummary(db,'Live')[0].search);assert.equal(Object.keys(db.companies).length,0);assert.equal(db.pages.length,0);
module.exports={results,iso};
console.log(`PASS: four live page snapshots; 113 cards -> ${before} unique profiles; 17 ISO suppliers in one page; full field comparison, filters and terminal pagination; unknown paths/classes, domain boundary, legacy-group reuse, restore, zero-result refresh and search deletion`);
