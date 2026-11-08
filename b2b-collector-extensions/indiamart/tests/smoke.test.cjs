const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const source = 'https://export.indiamart.com/search.php?ss=IV+Cannula';

function load(...files) {
  const context = vm.createContext({ URL, TextEncoder, location: { href: source } });
  for (const file of files) vm.runInContext(read(file), context, { filename: file });
  return context;
}

test('the Manifest V3 popup and dashboard ship with English HTML and local assets', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ['https://export.indiamart.com/*']);
  for (const page of [manifest.action.default_popup, 'dashboard.html']) {
    const html = read(page);
    assert.match(html, /<html lang="en">/);
    for (const [, file] of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
      assert.ok(fs.existsSync(path.join(root, file)), file);
    }
  }
});

test('projects keep one keyword per line and retain it after restoring a JSON backup', () => {
  const context = load('model.js');
  const keywords = vm.runInContext(`
    const db = imNewDB();
    const project = imCreateProject(db, 'IV', { keywords: ' IV Cannula\\nPeripheral IV Catheter ' });
    imValidateBackup(JSON.parse(JSON.stringify(db))).projects[project.id].keywords;
  `, context);
  assert.equal(keywords, 'IV Cannula\nPeripheral IV Catheter');
});

test('recapture merges the same company and coverage reports partial loading in English', () => {
  const context = load('model.js');
  context.source = source;
  vm.runInContext(`
    const db = imNewDB();
    const project = imCreateProject(db, 'IV');
    const data = {
      source,
      declaredTotal: null,
      rows: [{ name: 'Example Medical', companyId: '123', businessType: 'Manufacturer' }],
      extraction: { detectedCards: 1, parsedRows: 1, unparsedCards: 0 },
      pagination: { current: 1, terminal: true }
    };
    imMergePage(db, data, project.id);
  `, context);
  const recapture = vm.runInContext('imMergePage(db, data, project.id)', context);
  assert.equal(recapture.audit.status, 'Complete and consistent coverage');
  assert.equal(recapture.audit.uniqueCompanies, 1);
  const partial = vm.runInContext(
    'imMergePage(db, { ...data, preparation: { timedOut: true } }, project.id)',
    context
  );
  assert.equal(partial.audit.complete, false);
  assert.match(partial.audit.status, /Page 1: Page preparation timed out/);
});

test('supplier badges stay separate from Business Type and pagination can read localized source links', () => {
  const context = load('extractor.js');
  assert.equal(context.imxBusinessType(['Verified Exporter']), '');
  assert.equal(context.imxBusinessType(['Business Type', 'Manufacturer']), 'Manufacturer');
  const next = { textContent: '\u0628\u0639\u062f\u06cc', getAttribute: name => name === 'href' ? '?ss=IV+Cannula&page=2' : '' };
  const doc = { querySelector: () => null, querySelectorAll: () => [next] };
  assert.equal(context.imxNext(doc, source, 1), source + '&page=2');
});

test('Excel export writes an OOXML workbook without treating formula-like text as a formula', () => {
  const context = load('xlsx.js');
  const bytes = Buffer.from(context.makeXLSX([{ name: 'Companies', rows: [['=1+1']] }]));
  assert.equal(bytes.readUInt32LE(), 0x04034b50);
  assert.match(bytes.toString(), /<sheet name="Companies"/);
  assert.match(bytes.toString(), /t="inlineStr"[^]*<t xml:space="preserve">=1\+1<\/t>/);
});
