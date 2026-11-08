const fs=require('fs'),path=require('path'),assert=require('assert');const M=require('../model.js');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).project;
const before=JSON.stringify(p),companies=M.companies(p);assert.equal(JSON.stringify(p),before);
const ids=companies.map(c=>c.profileId).filter(Boolean);assert.equal(new Set(ids).size,ids.length);
assert.equal(p.records.length,319);assert.equal(p.records.filter(r=>M.status(p,r)==='product').length,221);
for(const name of ['DEGANIA','NEWTECH','NANOVATE','EDGES MEDICARE','WESTERN SURGICAL'])assert(companies.some(c=>c.name.startsWith(name)),name+' was incorrectly excluded');
const protectedCount=companies.length;p.decisions=Object.fromEntries(p.records.map(r=>[M.key(r),{action:'exclude'}]));assert.equal(M.companies(p).length,protectedCount);
for(const keyword of ['IV Cannula','Xanthan Gum','CMC','Gelatin']){p.config.keyword=keyword;p.config.reviewKeyword=keyword;assert.equal(M.companies(p).length,protectedCount);}
const test={config:{keyword:'A'},records:[],captures:[]};
const row={companyId:'1',companyName:'Same Name',productId:'10',productName:'CVC kit',productUrl:'https://www.tradeindia.com/products/cvc-10.html',keyword:'A',businessType:'Supplier',sourceUrl:'https://www.tradeindia.com/search.html?keyword=A',page:1,position:1};
M.merge(test,{rows:[row],keyword:'A'});M.merge(test,{rows:[{...row,keyword:'B',sourceUrl:'https://www.tradeindia.com/search.html?keyword=B',businessType:'Distributor'}],keyword:'B'});assert.equal(test.records.length,1);assert.equal(test.records[0].evidence.length,2);assert.equal(M.companies(test).length,1);assert(M.companies(test)[0].business.includes('Distributor'));assert.equal(M.companies(test)[0].keywords.split('\n').length,2);
M.merge(test,{rows:[{...row,companyId:'2'}]});assert.equal(M.companies(test).length,2,'same name, different IDs must stay separate');
M.merge(test,{rows:[{...row,companyId:'1',productId:'11',productUrl:'https://www.tradeindia.com/products/other-11.html',productName:'Unrelated mould'}]});assert.equal(M.companies(test).length,2);assert(M.companies(test)[0].products.includes('Unrelated mould'));

const filters={config:{keyword:'A'},records:[],captures:[]};M.merge(filters,{rows:[row],manufacturerFilter:true});M.merge(filters,{rows:[row],manufacturerFilter:false});assert.equal(filters.records.length,1);assert.equal(filters.records[0].evidence.length,2);assert(M.companies(filters)[0].filters.includes('on'));assert(M.companies(filters)[0].filters.includes('off'));
const source=['model.js','collector.js','background.js','popup.js','popup.html'].map(f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8')).join('\n');assert(!/ProductRelevance|ReviewedProducts|excluded-product|product-review/.test(source));
console.log('PASS all 319 raw rows retained; companies',companies.length,'identified',ids.length,'products 221; no title/role screening; stable profile-ID grouping and cross-keyword provenance.');
