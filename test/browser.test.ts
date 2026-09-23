const assert = require('assert');
const test = require('node:test');
const { WorkStore } = require('../packages/core/src/work.js');
const { CapabilityRegistry } = require('../packages/capabilities/src/registry.js');
const { VerificationEngine } = require('../packages/verification/src/engine.js');
const { WorkEngine } = require('../packages/runtime/src/engine.js');
const { registerLocalBrowserPack, resolveBrowserBinary } = require('../packages/packs/src/browser-local-pack.js');

test('browser executable override is honored without process-shell expansion', () => {
  const previous = process.env.WORKPROOF_BROWSER_BINARY;
  try {
    process.env.WORKPROOF_BROWSER_BINARY = 'custom-browser';
    assert.equal(resolveBrowserBinary(), 'custom-browser');
  } finally {
    if (previous === undefined) delete process.env.WORKPROOF_BROWSER_BINARY;
    else process.env.WORKPROOF_BROWSER_BINARY = previous;
  }
});

test('real Chromium browser executes an injected page workflow and verifies resulting UI state', async () => {
  const store=new WorkStore(); const registry=new CapabilityRegistry(); const verification=new VerificationEngine(); registerLocalBrowserPack(registry, verification);
  const html = `<!doctype html><html><body><h1>Browser Lab</h1><label>Name <input id="name"></label><button id="create" onclick="document.querySelector('#status').textContent='created: '+document.querySelector('#name').value">Create</button><div id="status">none</div></body></html>`;
  const work=store.create({objective:'Create browser record',inputs:{expectedText:'created: Alpha'},success:[{id:'browser-proof',description:'The browser-visible state confirms the created value',verifier:'pack.browser.text',required:true}],deliverables:[],riskClass:'local_write'});
  const engine=new WorkEngine(store,registry,verification,async()=>false);
  await engine.run(work,[{id:'browser',operation:'browser_workflow',capability:'pack.browser.local',input:{startUrl:'about:blank',html,actions:[{type:'fill',selector:'#name',value:'Alpha'},{type:'click',selector:'#create'},{type:'get_text',selector:'#status'}]},idempotencyKey:'browser:create:alpha',riskClass:'local_write'}]);
  assert.equal(work.status,'verified', JSON.stringify(work.events.slice(-8), null, 2));
  const text = work.artifacts.find((a:any)=>a.kind==='browser-dom-text')?.metadata?.text ?? '';
  assert.match(String(text), /created: Alpha/);
});

export {};
