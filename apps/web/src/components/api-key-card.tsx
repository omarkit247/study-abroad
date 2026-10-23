'use client';
import { AI_PROVIDERS, defaultProvider, getProviderConfig, setProviderConfig, type ProviderConfig, type ProviderId } from '@/lib/ai-provider';

import * as React from 'react';
import { KeyRound, CheckCircle2, XCircle, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { api, CLOUD_MODE, ApiError } from '@/lib/api';
import { getApiKeyState, setApiKey, clearApiKey, looksLikeKey, subscribeToApiKey, type ApiKeyState } from '@/lib/cloud/api-key';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice, SwitchRow, Panel } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';

/**
 * Where a visitor supplies their own OpenAI key.
 *
 * This is the whole basis on which the hosted app can be shared: whoever
 * deployed it holds no key, so every model call is billed to the person who
 * made it. The copy says so explicitly, because "paste your API key here" is
 * exactly the request a careful person should be suspicious of, and they
 * deserve to know where it goes.
 */

/** Live key state, shared across the header badge and every panel. */
export function useApiKeyState(): ApiKeyState {
  const [state, setState] = React.useState<ApiKeyState>({ present: false, hint: '', remembered: false });

  React.useEffect(() => {
    setState(getApiKeyState());
    return subscribeToApiKey(() => setState(getApiKeyState()));
  }, []);

  return state;
}

export function ApiKeyCard({ compact = false }: { compact?: boolean }) {
  const toast = useToast();
  const state = useApiKeyState();

  const [provider, setProvider] = React.useState<ProviderConfig>(defaultProvider('openrouter'));
  const [providerError, setProviderError] = React.useState('');
  React.useEffect(() => { setProvider(getProviderConfig()); }, []);
  const saveProvider = () => {
    try { setProviderConfig(provider); setProvider(getProviderConfig()); setValue(''); setResult(null); setProviderError(''); toast.success('Provider saved', 'Enter a key for this provider below.'); }
    catch (error) { setProviderError(error instanceof Error ? error.message : 'Invalid provider'); }
  };
  const [value, setValue] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  React.useEffect(() => setRemember(state.remembered), [state.remembered]);

  const save = () => {
    const key = value.trim();
    if (!looksLikeKey(key)) {
      toast.error('That does not look like a complete key', 'Paste the complete provider key without spaces.');
      return;
    }

    if (JSON.stringify(provider) !== JSON.stringify(getProviderConfig())) { toast.error('Save provider settings first'); return; }
    setApiKey(key, remember);
    setValue('');
    setResult(null);
    toast.success('Key saved', remember ? 'Stored in this browser.' : 'Kept for this session only.');
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const outcome = await api.post<{ ok: boolean; message: string }>('/api/settings/api-key/test');
      setResult(outcome);
    } catch (error) {
      setResult({ ok: false, message: error instanceof ApiError ? error.message : 'The check could not be completed.' });
    } finally {
      setTesting(false);
    }
  };

  const remove = () => {
    clearApiKey();
    setResult(null);
    toast.success('Key removed', 'Nothing is left in this browser.');
  };

  return (
    <div className="space-y-4">
      <Field label="AI provider">{({ id }) => <select id={id} className="w-full rounded border p-3 bg-[var(--color-surface)]" value={provider.provider} onChange={e => { setProvider(defaultProvider(e.target.value as ProviderId)); setValue(''); setResult(null); }}>
        {Object.entries(AI_PROVIDERS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
      </select>}</Field>
      {provider.provider !== 'openai' && <Field label="Provider model ID" hint="For non-OpenAI providers this model overrides OpenAI model choices in every pipeline step.">{({ id }) => <Input id={id} value={provider.model} onChange={e => setProvider({ ...provider, model: e.target.value })} />}</Field>}
      {provider.provider === 'custom' && <Field label="API base URL" hint="Public HTTPS base URL implementing /chat/completions. Only use a provider you trust with your key and prompts.">{({ id }) => <Input id={id} value={provider.baseURL} onChange={e => setProvider({ ...provider, baseURL: e.target.value })} />}</Field>}
      <Button onClick={saveProvider}>Save provider settings</Button>
      {providerError && <Notice tone="negative">{providerError}</Notice>}
      <p className="text-sm text-[var(--color-text-muted)]">OpenRouter accepts free model IDs only. Gemini and Groq have account-dependent free quotas; stay on their free plans. Custom providers set their own prices. No automatic paid fallback. Non-OpenAI calls use supplied information only, without built-in web search. Free models may produce incomplete or invalid structured output.</p>
      {state.present ? (
        <Notice tone="positive" icon={<CheckCircle2 />} title="Your key is set">
          <span className="font-[family-name:var(--font-mono)]">{state.hint}</span>
          {state.remembered ? ' — remembered on this device.' : ' — kept for this browser session only.'}
        </Notice>
      ) : (
        <Notice tone="warning" icon={<KeyRound />} title="Add your provider key to run for real">
          Until then everything works in demo mode: the whole product is usable, but nothing is researched and no draft is
          real.
        </Notice>
      )}

      <Field
        label={state.present ? 'Replace the key' : 'Your provider API key'}
        hint="Save provider settings first. Keys are stored separately for each provider and custom endpoint."
      >
        {({ id }) => (
          <Input
            id={id}
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && save()}
            placeholder="Paste your provider API key"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Field>

      <div className="rounded-[var(--radius-control)] border border-[var(--color-border)]">
        <div className="px-3">
          <SwitchRow
            label="Remember on this device"
            hint={
              remember
                ? 'Stays until you clear it. Do not use this on a shared or public computer.'
                : 'Cleared when you close the tab. The safer choice on a computer you share.'
            }
            checked={remember}
            onCheckedChange={setRemember}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={save} disabled={!value.trim()}>
          {state.present ? 'Replace key' : 'Save key'}
        </Button>
        <Button variant="secondary" onClick={test} loading={testing} disabled={!state.present || JSON.stringify(provider) !== JSON.stringify(getProviderConfig())}>
          Test it
        </Button>
        {state.present && (
          <Button variant="dangerGhost" onClick={remove}>
            <Trash2 />
            Remove
          </Button>
        )}
        <Button asChild variant="ghost">
          <a href={AI_PROVIDERS[provider.provider].keyURL || provider.baseURL || "#"} target="_blank" rel="noreferrer noopener">
            Get a key
            <ExternalLink />
          </a>
        </Button>
      </div>

      {result && (
        <Notice tone={result.ok ? 'positive' : 'negative'} icon={result.ok ? <CheckCircle2 /> : <XCircle />}>
          {result.message}
        </Notice>
      )}

      {!compact && (
        <Panel className="border-dashed bg-transparent p-4 shadow-none">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--color-signal)]" />
            <div className="space-y-2 text-[0.8125rem] leading-relaxed text-[var(--color-text-muted)]">
              <p className="font-medium text-[var(--color-text)]">Where your key goes</p>
              <ul className="space-y-1.5">
                <li>
                  It is kept in {remember ? 'this browser' : 'this browser session'} and sent only on the requests you
                  trigger, to this app&rsquo;s own route, which forwards it to your saved provider and does not intentionally store it.
                </li>
                <li>
                  {CLOUD_MODE
                    ? 'The server handles your key during each request. Usage counts against your provider account and its free quota or billing plan.'
                    : 'Everything runs on this machine.'}
                </li>
                <li>It is never written into a run record, a log, or an exported workspace.</li>
                <li>Revoke it any time from your provider dashboard — that works regardless of what is stored here.</li>
              </ul>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
