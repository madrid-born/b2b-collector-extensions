const fs=require('fs'),path=require('path'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),collector=fs.readFileSync(path.join(root,'collector.js'),'utf8');
function load(file){const html=fs.readFileSync(file,'utf8'),url=html.match(/saved from url=\(\d+\)(\S+)\s*-->/)[1];const d=new JSDOM(html,{url,runScripts:'outside-only'}),w=d.window;Object.defineProperty(w.HTMLElement.prototype,'innerText',{get(){return this.textContent;}});w.HTMLElement.prototype.getClientRects=()=>[{}];w.eval(collector);return w;}
(async()=>{
 for(const name of fs.readdirSync(process.argv[2]).filter(f=>f.endsWith('.html'))){
  const w=load(path.join(process.argv[2],name)),s=w.inspectTradeIndia({keyword:'IV Cannula'});assert(!s.error);assert.equal(s.cardCount,31);assert.equal(s.rows.filter(r=>r.productUrl).length,s.page===7?11:31);assert.equal(s.rows.filter(r=>!r.productUrl).length,s.page===7?20:0);assert(s.rows.every(r=>r.status===(r.productUrl?'product':'company-only')));assert(s.rows.some(r=>r.productUrl&&!/manufacturer/i.test(r.businessType)),'non-manufacturers must be retained');
  if(s.page===7){assert(s.rows.some(r=>/Gamjee/.test(r.productName)));assert(s.rows.some(r=>/3 Stripes/.test(r.productName)));}
  for(const keyword of ['Xanthan Gum','Sodium Carboxymethyl Cellulose','CMC','Gelatin','\u06a9\u0631\u0628\u0648\u06a9\u0633\u06cc \u0645\u062a\u06cc\u0644 \u0633\u0644\u0648\u0644\u0632']){const u=new URL(w.location.href);u.searchParams.set('keyword',keyword);w.history.replaceState({},'',u.href);const raw=w.inspectTradeIndia({keyword});assert.equal(raw.rows.length,s.rows.length);assert.deepEqual(raw.rows.map(r=>r.productUrl),s.rows.map(r=>r.productUrl));assert.equal(raw.rows.filter(r=>r.status==='product').length,s.rows.filter(r=>r.productUrl).length);}
  assert(w.inspectTradeIndia({keyword:'Different Keyword'}).error);
  // Stale URL parameter must not re-enable an unchecked filter on navigation.
  w.document.querySelector('#manufacturer_check').checked=false;
  for(const badge of w.document.querySelectorAll('span.iconWrap'))if(badge.parentElement.textContent.trim()==='Manufacturer')badge.parentElement.remove();
  const stale=new URL(w.location.href);stale.searchParams.set('manufacturer','true');stale.searchParams.set('keyword','IV Cannula');w.history.replaceState({},'',stale.href);
  const nofilter=w.inspectTradeIndia({keyword:stale.searchParams.get('keyword')});assert.equal(nofilter.manufacturerFilter,false);assert.equal(new URL(nofilter.nextUrl).searchParams.has('manufacturer'),false);

  // An adaptive scroll test: new content increases page height before stability.
  let clock=0,y=0,height=2400,grown=false;w.Date.now=()=>clock;w.setTimeout=(fn,ms)=>{clock+=ms;if(y>=height-800&&!grown){height+=1200;grown=true;}fn();return 0;};Object.defineProperty(w,'innerHeight',{value:800});Object.defineProperty(w,'scrollY',{get:()=>y});Object.defineProperty(w.document.documentElement,'scrollHeight',{get:()=>height});Object.defineProperty(w.document.body,'scrollHeight',{get:()=>height});w.scrollTo=(x,v)=>{y=v;};w.scrollBy=(x,v)=>{y=Math.min(height-800,y+v);};const loaded=await w.prepareTradeIndiaPage();assert(loaded.ready);assert(grown);assert.equal(y,0);assert(loaded.steps>3);
  // Never claim a continuously expanding page was fully loaded.
  w.setTimeout=(fn,ms)=>{clock+=ms;height+=1000;fn();return 0;};const unsettled=await w.prepareTradeIndiaPage();assert(unsettled.error);
  console.log('PASS HTML page',s.page,'raw cards',s.cardCount,'products',s.productCards,'generic keyword independence and scroll stability');w.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
