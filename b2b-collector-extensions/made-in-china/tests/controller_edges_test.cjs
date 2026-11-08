const fs=require('fs'),vm=require('vm'),assert=require('assert'),{parseHTML}=require('linkedom');
const url=(n,word='test')=>`https://www.made-in-china.com/company-search/${word}/C1--BT_1/${n}.html`;
const data=(n,ids,next='',word='test')=>({source:url(n,word),query:word,rows:ids.map(k=>({name:k,key:k+'.en.made-in-china.com',profile:`https://${k}.en.made-in-china.com/`,mainProducts:'',city:'',businessType:'Manufacturer/Factory',products:[]})),selectedFilters:{'Business Type':'Manufacturer/Factory'},certificateCodes:[],manufacturerFilter:true,pagination:{current:n,terminal:!next},capturedAt:'2026-01-01',next});
async function scenario(pages,opts={}){
 const {document,window}=parseHTML(fs.readFileSync('dashboard.html','utf8'));for(const n of document.querySelectorAll('select'))Object.defineProperty(n,'value',{value:'1',writable:true});
 let current=opts.start||Object.keys(pages)[0],store={},clock=0;
 class FakeDate extends Date{static now(){return clock+=1000;}}
 const c={URL,document,window,console,Date:FakeDate,TextEncoder,Uint8Array,DataView,Blob,confirm:()=>true,setTimeout:fn=>queueMicrotask(fn),chrome:{storage:{local:{get:async()=>structuredClone(store),set:async o=>{Object.assign(store,structuredClone(o));}}},tabs:{query:async()=>[{id:1,title:'Test',url:current}],get:async()=>({id:1,url:current,status:'complete'}),update:async(id,o)=>{current=opts.redirect||o.url;}},scripting:{executeScript:async o=>o.files?[{}]:[{result:structuredClone(pages[current])}]}}};
 vm.createContext(c);for(const f of ['model.js','extractor.js','xlsx.js','dashboard.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 await new Promise(r=>setImmediate(r));document.getElementById('project').value='Audit';document.getElementById('max').value=opts.max||500;
 await document.getElementById('run').onclick();
 return {db:store.micDB,summary:c.micSummary(store.micDB,'Audit'),status:document.getElementById('status').textContent,c,document,store};
}
module.exports={scenario};
if(require.main===module)(async()=>{
 let r=await scenario({[url(1)]:data(1,['a','b'],url(2)),[url(2)]:data(2,['b','c'],url(3)),[url(3)]:data(3,['d'])});assert.equal(Object.keys(r.db.companies).length,4);assert(r.summary[0].complete);assert.equal(r.db.pages.filter(p=>p.state==='collected').length,3);console.log('PASS: full three-page controller run and shared-company union');
 const snapshot=JSON.stringify(r.db);let backup;r.c.receive=(name,value)=>{backup=value};vm.runInContext('download=(name,value)=>receive(name,value)',r.c);r.document.getElementById('backup').onclick();assert.equal(JSON.stringify(JSON.parse(backup)),snapshot);
 await r.document.getElementById('clear').onclick();assert.equal(Object.keys(r.store.micDB.companies).length,0);Object.defineProperty(r.document.getElementById('restoreFile'),'files',{value:[{text:async()=>backup}],configurable:true});await r.document.getElementById('restore').onclick();assert.equal(JSON.stringify(r.store.micDB),snapshot);console.log('PASS: JSON backup -> clear -> restore preserves all records and summary');
 const damaged=JSON.parse(backup);damaged.pages[0].source='invalid source';Object.defineProperty(r.document.getElementById('restoreFile'),'files',{value:[{text:async()=>JSON.stringify(damaged)}],configurable:true});await r.document.getElementById('restore').onclick();assert.equal(JSON.stringify(r.store.micDB),snapshot,'Malformed backup must not overwrite working data');console.log('PASS: malformed backup cannot overwrite working data');

 const changed=data(2,['b']);changed.selectedFilters={};changed.manufacturerFilter=false;
 r=await scenario({[url(1)]:data(1,['a'],url(2)),[url(2)]:changed});assert.equal(Object.keys(r.db.companies).length,1);assert(!r.summary[0].complete);assert(r.status.includes('filters changed'));console.log('PASS: filter loss rejects page before merge');
 r=await scenario({[url(1)]:data(1,['a'],url(2)),[url(2)]:data(2,['b'])},{max:1});assert(!r.summary[0].complete);assert(r.status.includes('Safety limit'));console.log('PASS: safety limit cannot claim complete');
 r=await scenario({[url(3)]:data(3,['d'])});assert(!r.summary[0].complete);console.log('PASS: starting at final page cannot claim full coverage');
 r=await scenario({[url(1)]:data(1,['a'],url(2)),[url(2)]:data(2,['b'])},{redirect:'https://www.made-in-china.com/security.html'});assert(!r.summary[0].complete);assert.equal(Object.keys(r.db.companies).length,1);console.log('PASS: unexpected redirect stops');
 // A non-adjacent repeated supplier page must not masquerade as a new final page.
 r=await scenario({[url(1)]:data(1,['a'],url(2)),[url(2)]:data(2,['b'],url(3)),[url(3)]:data(3,['a'])});assert(!r.summary[0].complete);assert(r.status.includes('Identical supplier list'));console.log('PASS: repeated page content detected beyond adjacent pages');
 const first=data(1,['a'],url(2,'other'));first.source='https://www.made-in-china.com/companysearch.do?word=test&businessType=1';
 r=await scenario({[first.source]:first,[url(2,'other')]:data(2,['b'],'','other')});assert(Object.values(r.db.companies).every(c=>c.name!=='b'));assert(r.status.includes('query changed'));console.log('PASS: query switch from legacy URL cannot mix a second keyword');
})().catch(e=>{console.error(e);process.exitCode=1});
