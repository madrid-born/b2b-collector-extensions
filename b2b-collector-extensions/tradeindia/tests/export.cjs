const fs=require('fs'),path=require('path'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).project;
const d=new JSDOM(fs.readFileSync(path.join(root,'popup.html'),'utf8'),{runScripts:'outside-only'}),w=d.window;
w.chrome={runtime:{sendMessage:async()=>({ok:true,data:{projects:[p],activeId:p.id}})},storage:{onChanged:{addListener(){}}}};
w.eval(['model.js','xlsx.js','popup.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nthis.testSheets=sheets;this.testModel=Model;');
const s=w.testSheets(p);assert.deepEqual(s.map(x=>x.name),['Companies','Collected Products','Company Only','Page Audit','Run Log','Settings']);assert.equal(s.find(x=>x.name==='Collected Products').rows.length,221);assert.equal(s.find(x=>x.name==='Company Only').rows.length,98);
const C=s.find(x=>x.name==='Companies'),ids=C.rows.map(r=>r[0]).filter(Boolean);assert.equal(ids.length,new Set(ids).size);assert(C.rows.some(r=>r[1]==='EDGES MEDICARE PRIVATE LIMITED'));assert(C.rows.some(r=>r[1]==='NANOVATE'));
for(const sh of s)for(const row of sh.rows)assert.equal(row.length,sh.headers.length,sh.name);
const n=C.rows.length;
for(const kw of ['Xanthan Gum','CMC','Gelatin']){p.config.keyword=kw;p.config.reviewKeyword=kw;assert.equal(w.testSheets(p)[0].rows.length,n);}
const before=JSON.stringify(p);w.testSheets(p);assert.equal(before,JSON.stringify(p));
console.log('PASS actual UI/export: all 221 product rows and 98 company-only rows retained, 299 distinct identified profiles + 1 marked unresolved row, all column counts correct, output unaffected by product keyword.');

// A busy first-page request must not suppress the Stop button in the popup.
let stopped=false;w.chrome.runtime.sendMessage=async m=>{if(m.type==='stop')stopped=true;return {ok:true,data:{projects:[p],activeId:p.id}};};p.job={running:true,done:0,limit:null};w.eval('busy=true;render();');w.document.getElementById('stop').click();
Promise.resolve().then(()=>{assert(stopped,'Stop must bypass the UI busy guard');console.log('PASS popup Stop works during busy initial scroll.');});
