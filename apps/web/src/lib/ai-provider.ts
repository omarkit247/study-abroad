export const AI_PROVIDERS = {
  openrouter: { label: 'OpenRouter — free models', baseURL: 'https://openrouter.ai/api/v1', model: 'openrouter/free', keyURL: 'https://openrouter.ai/settings/keys' },
  gemini: { label: 'Google Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.1-flash-lite', keyURL: 'https://aistudio.google.com/apikey' },
  groq: { label: 'Groq', baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', keyURL: 'https://console.groq.com/keys' },
  openai: { label: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-5-mini', keyURL: 'https://platform.openai.com/api-keys' },
  custom: { label: 'Custom OpenAI-compatible API', baseURL: '', model: '', keyURL: '' },
} as const;
export type ProviderId = keyof typeof AI_PROVIDERS;
export interface ProviderConfig { provider: ProviderId; model: string; baseURL: string }
export const PROVIDER_STORAGE = 'flow:v1:ai-provider';
export function defaultProvider(provider: ProviderId): ProviderConfig {
  return { provider, model: AI_PROVIDERS[provider].model, baseURL: AI_PROVIDERS[provider].baseURL };
}
export function validateProvider(input: ProviderConfig): ProviderConfig {
  if (!input || !Object.hasOwn(AI_PROVIDERS, input.provider)) throw new Error('Choose a supported AI provider.');
  if (typeof input.model !== 'string' || !input.model.trim() || input.model.length > 200) throw new Error('Enter the model ID from your provider.');
  let baseURL: string = AI_PROVIDERS[input.provider].baseURL;
  if (input.provider === 'custom') {
    const url = new URL(input.baseURL);
    // Hosted endpoints only. Never follow redirects with the supplied credential.
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443') ||
        !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) {
      throw new Error('Use a public HTTPS API base URL without credentials, query strings or a custom port.');
    }
    baseURL = url.href.replace(/\/+$/, '');
  }
  const model = input.model.trim();
  if (input.provider === 'openrouter' && model !== 'openrouter/free' && !model.endsWith(':free')) {
    throw new Error('This OpenRouter option accepts only openrouter/free or a model ID ending in :free.');
  }
  return { provider: input.provider, model, baseURL };
}
export function getProviderConfig(): ProviderConfig {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(PROVIDER_STORAGE);
      if (saved) return validateProvider(JSON.parse(saved));
      // Keep existing OpenAI users working; new installations start with free routing.
      if (window.localStorage.getItem('flow:v1:openai-key') || window.sessionStorage.getItem('flow:v1:openai-key')) return defaultProvider('openai');
    }
  } catch { /* use defaults */ }
  return defaultProvider('openrouter');
}
export function setProviderConfig(config: ProviderConfig) {
  const valid = validateProvider(config);
  window.localStorage.setItem(PROVIDER_STORAGE, JSON.stringify(valid));
  window.dispatchEvent(new Event('flow-provider-change'));
}
export function providerKeyScope(): string {
  const config = getProviderConfig();
  return config.provider === 'openai' ? 'openai' : `${config.provider}:${config.baseURL}`;
}
