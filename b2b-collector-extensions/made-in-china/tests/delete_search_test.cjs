const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={URL};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../model.js','utf8'),context);
const {micMerge,micDeleteSearch,micIdentity,micSummary}=context;
const row=n=>({name:n,profile:`https://${n}.en.made-in-china.com/`,products:[]});
const page=(q,filter,rows)=>({source:`https://www.made-in-china.com/company-search/${q}/${filter}/1.html`,query:q,rows,capturedAt:'2026-10-31',pagination:{terminal:true}});
const db={companies:{},pages:[],projectSettings:{A:{enabled:false}}};
const bad=page('food','C1',[row('shared'),row('extra')]),good=page('food','C1--BT_1',[row('shared'),row('good')]);
micMerge(db,bad,'A');micMerge(db,good,'A');micMerge(db,bad,'B');
const other=JSON.stringify(Object.values(db.companies).filter(c=>c.project==='B'));const settings=JSON.stringify(db.projectSettings);
micDeleteSearch(db,'A',micIdentity(bad.source).search);
assert.equal(Object.values(db.companies).filter(c=>c.project==='A').length,2);assert.equal(micSummary(db,'A').length,1);assert.equal(micSummary(db,'A')[0].newCompanies,2);assert(micSummary(db,'A')[0].complete);
assert.equal(JSON.stringify(Object.values(db.companies).filter(c=>c.project==='B')),other);assert.equal(JSON.stringify(db.projectSettings),settings);
const before=JSON.stringify(db);micDeleteSearch(db,'A','missing');assert.equal(JSON.stringify(db),before);
micDeleteSearch(db,'A',micIdentity(good.source).search);assert.equal(micSummary(db,'A').length,0);assert.equal(Object.values(db.companies).filter(c=>c.project==='A').length,0);
// Optional regression against the supplied seven HTMLs and 179-company export.
if(process.env.MIC_DELETE_FIXTURE){const f=JSON.parse(fs.readFileSync(process.env.MIC_DELETE_FIXTURE));const actual={companies:{},pages:[]};for(const p of f.pages)micMerge(actual,p,'CMC');assert.equal(Object.keys(actual.companies).length,138);const unfiltered=page('carboxymethyl%2Bcellulose%2Bfood%2Bgrade','C1',f.allCompanies);micMerge(actual,unfiltered,'CMC');assert.equal(Object.keys(actual.companies).length,179);micDeleteSearch(actual,'CMC',micIdentity(unfiltered.source).search);assert.equal(Object.keys(actual.companies).length,138);assert.equal(actual.pages.length,7);assert.equal(Object.values(actual.companies).reduce((n,c)=>n+c.observations.length,0),297);assert(micSummary(actual,'CMC').every(g=>g.complete));console.log('PASS: 179 -> 138 companies; all 297 valid observations and seven pages preserved');}
console.log('PASS: delete exact filter group, shared-company preservation, other-project isolation, recalculated summary, no-op and final-search deletion');
