const fs=require('fs'),vm=require('vm'),assert=require('assert'),ts=require(process.cwd()+'/node_modules/typescript');
function load(file,imports={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8').replaceAll('import.meta.url', JSON.stringify('file:///test/module.js')),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:n=>{if(n in imports)return imports[n];throw Error(n)},URL,Request,Response,Error,console,...globals});return exports}
const mem=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const window={localStorage:mem(),sessionStorage:mem(),dispatchEvent(){},addEventListener(){},removeEventListener(){}};
const provider=load('apps/web/src/lib/ai-provider.ts',{}, {window,Event});
const keys=load('apps/web/src/lib/cloud/api-key.ts',{'../ai-provider':provider},{window});
assert.equal(provider.getProviderConfig().provider,'openrouter');keys.setApiKey('test-router-key-123456',false);
provider.setProviderConfig(provider.defaultProvider('groq'));assert.equal(keys.getApiKey(),'');keys.setApiKey('test-groq-key-123456',false);
provider.setProviderConfig(provider.defaultProvider('openrouter'));assert.equal(keys.getApiKey(),'test-router-key-123456');
for(const u of ['http://api.example.org/v1','https://127.0.0.1/v1','https://[::1]/v1','https://foo.local/v1','https://user:pass@api.org/v1','https://api.org/v1?secret=x'])assert.throws(()=>provider.validateProvider({provider:'custom',baseURL:u,model:'m'}));
assert.throws(()=>provider.validateProvider({...provider.defaultProvider('openrouter'),model:'paid-model'}));
let seen; let upstreamError; let fetchInit; let fetchStatus=200;
class OpenAI {
 static APIConnectionError=class extends Error {};
 static APIConnectionTimeoutError=class extends Error {};
 constructor(opts) {
  this.responses={create:async p=>{seen={opts,p};if(upstreamError)throw upstreamError;return {output_text:'ready',usage:{}};}};
  this.chat={completions:{create:async p=>{seen={opts,p};if(upstreamError)throw upstreamError;return {choices:[{message:{content:'{"ok":true}'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:2}};}}};
 }
}
const route=load('apps/web/src/app/api/execute/route.ts',{'@/lib/ai-provider':provider,'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},openai:OpenAI,'@flow/shared':{resolveModelConfig:c=>({...c,model:c?.model||'gpt-5-mini'})}}, {fetch:async(url,init)=>{fetchInit=init;return new Response(null,{status:fetchStatus})}});
(async()=>{for(const id of ['openrouter','groq','gemini','custom','openai']){const ai=id==='custom'?{provider:id,baseURL:'https://api.example.org/v1',model:'custom-model'}:provider.defaultProvider(id);const r=await route.POST(new Request('https://app.test/api/execute',{method:'POST',body:JSON.stringify({apiKey:'secret-test-value',ai,step:{userPrompt:'hello',outputSchema:id==='openai'?null:{type:'object'},config:{model:'gpt-5-mini',webSearch:true}}})}));assert.equal(r.status,200);assert.equal(seen.opts.baseURL,ai.baseURL);if(id!=='openai'){assert.equal(seen.p.model,ai.model);assert(!seen.p.tools);assert(seen.p.messages[0].content.includes('No web-search tool'));assert.deepEqual(r.body.data.output,{ok:true})}assert(!JSON.stringify(r).includes('secret-test-value'))}for (const [status, detail, expected] of [[400,'API key not valid secret-test-value','rejected this API key'],[400,'FAILED_PRECONDITION secret-test-value','current free account'],[400,'unknown secret-test-value','HTTP 400'],[402,'secret-test-value','requires credits'],[429,'quota secret-test-value','quota is exhausted']]) {
upstreamError=Object.assign(new Error(detail),{status});
const r=await route.POST(new Request('https://app.test/api/execute',{method:'POST',body:JSON.stringify({apiKey:'secret-test-value',ai:provider.defaultProvider('gemini'),step:{userPrompt:'hello'}})}));
assert(r.body.error.includes(expected));assert(!JSON.stringify(r).includes('secret-test-value'));
}
upstreamError=undefined;
const transport=seen.opts.fetch;
await transport('https://api.example.org',{headers:{Authorization:'Bearer synthetic'}});assert.equal(fetchInit.redirect,'manual');
fetchStatus=302;const blocked=await transport('https://api.example.org',{});assert.equal(blocked.status,400);assert((await blocked.json()).error.message.includes('provider_redirect_blocked'));
let cvRequest;
class ApiError extends Error {}
const cv=load('apps/web/src/lib/cv-import.ts',{'./ai-provider':provider,'./api':{CLOUD_MODE:true,ApiError,api:{post:async(path,body)=>{cvRequest={path,body};return {output:{fullName:'Test'}}}}},'./cloud/api-key':keys,'./utils':{localId:()=> 'test'}});
provider.setProviderConfig(provider.defaultProvider('groq'));
await cv.parseCv('Synthetic CV');assert.equal(cvRequest.path,'/api/execute');assert.equal(cvRequest.body.ai.provider,'groq');assert.equal(cvRequest.body.apiKey,'test-groq-key-123456');
console.log('PASS: CV provider routing and safe upstream diagnostics;  provider routing, free-model guard, endpoint validation, key separation, JSON parsing, no key in output');})().catch(e=>{console.error(e);process.exit(1)});
