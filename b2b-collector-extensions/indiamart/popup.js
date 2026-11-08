'use strict';
const $=id=>document.getElementById(id),dashboard=chrome.runtime.getURL('dashboard.html');

async function openDashboard(){
 const existing=(await chrome.tabs.query({url:dashboard+'*'}))[0];
 if(existing){await chrome.windows.update(existing.windowId,{focused:true});await chrome.tabs.update(existing.id,{active:true});}
 else await chrome.tabs.create({url:dashboard});
 window.close();
}

async function init(){
 const {imSuiteDB:db}=await chrome.storage.local.get('imSuiteDB');
 if(!db){$('project').textContent='No projects yet';$('certificate').textContent='Open the full dashboard to get started';$('status').textContent='';return;}
 const project=db.projects?.[db.activeProjectId];
 if(!project){$('project').textContent='No active project selected';$('certificate').textContent='Select a project in the dashboard';return;}
 const all=Object.values(db.companies||{}).filter(company=>company.projectId===project.id);
 const manufacturers=all.filter(company=>['manufacturer','manufacturer_and_trader'].includes(company.businessClass));
 const pages=Object.values(db.pages||{}).filter(page=>page.projectId===project.id);
 $('project').textContent=project.name;
 $('certificate').textContent=`Sources: ${project.sources?.join(' + ')||'Export'}`;
 $('companies').textContent=all.length.toLocaleString('en-US');
 $('manufacturers').textContent=manufacturers.length.toLocaleString('en-US');
 $('pages').textContent=pages.length.toLocaleString('en-US');
 $('status').textContent='Data is stored locally in your browser.';
}

$('expand').onclick=()=>openDashboard().catch(error=>$('status').textContent=error.message);
$('open').onclick=()=>openDashboard().catch(error=>$('status').textContent=error.message);
init().catch(error=>$('status').textContent=error.message);
