import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as shared from '../packages/shared/src/index.js';
const generated = shared.buildMedicalDefaults('2026-10-24', shared.createId);
assert.equal(generated.pipelines.length, 3);
assert.equal(generated.prompts.length, 9);
for (const prompt of generated.prompts) { shared.promptSchema.parse(prompt); assert.equal(prompt.versions[0].config.webSearch, false); }
for (const pipeline of generated.pipelines) { shared.pipelineSchema.parse(pipeline); assert.deepEqual(shared.validatePipeline(pipeline, generated.prompts.map(p => p.key)), []); }
const storage = new Map();
const store = { readList: k => structuredClone(storage.get(k) ?? []), writeList: (k,v) => storage.set(k, structuredClone(v)) };
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/src/lib/cloud/local-api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name => name==='@flow/shared'?shared:name==='./store'?store:{},URLSearchParams,console});
exports.ensureSeeded();
assert.equal(storage.get('prompts').length,14);assert.equal(storage.get('pipelines').length,6);
storage.get('prompts')[0].name='My edited prompt';
storage.get('pipelines')[0].name='My edited workflow';
exports.ensureSeeded();assert.equal(storage.get('prompts').length,14);assert.equal(storage.get('pipelines').length,6);
assert.equal(storage.get('prompts')[0].name,'My edited prompt');assert.equal(storage.get('pipelines')[0].name,'My edited workflow');
const profile=shared.profileSchema.parse({id:'test',createdAt:'2026-10-24',updatedAt:'2026-10-24',fullName:'Synthetic Doctor'});assert.equal(profile.targetDegree,'');
console.log('PASS: medical schemas, references, additive seeding, no duplicate workflows, preserved edits, no default PhD');
