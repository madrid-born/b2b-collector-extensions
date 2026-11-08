const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('dashboard.js','utf8');
const captureSource=source.slice(source.indexOf('async function capture('),source.indexOf('\n',source.indexOf('async function capture(')));
(async()=>{
 let retries=0;const page={location:{href:'https://www.made-in-china.com/unknown'},document:{title:'Suppliers'},extractMIC:()=>{throw new Error('No supplier list could be identified in the page content.')}};
 const context={pause:async()=>{},chrome:{scripting:{executeScript:async o=>{if(o.files)return [{}];retries++;const result=vm.runInNewContext('('+o.func.toString()+')()',page);return [{frameId:0,result:JSON.parse(JSON.stringify(result))}];}}}};
 vm.createContext(context);vm.runInContext(captureSource,context);
 await assert.rejects(context.capture(1),e=>e.message.includes('No supplier list could be identified')&&e.message.includes(page.location.href));assert.equal(retries,3);
 const data={rows:[{name:'A'}],source:page.location.href};page.extractMIC=()=>data;assert.deepEqual(await context.capture(1),data);
 page.extractMIC=()=>{throw new Error('Security verification/block: collection stopped.')};retries=0;await assert.rejects(context.capture(1),/Security verification/);assert.equal(retries,1);
 console.log('PASS: real injected function transports thrown errors with source URL; transient retries work, blocked pages stop, successful data unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
