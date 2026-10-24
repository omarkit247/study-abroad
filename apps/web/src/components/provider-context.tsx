'use client';
import { useEffect, useState } from 'react';
import { CLOUD_MODE } from '@/lib/api';
import { getProviderConfig, AI_PROVIDERS, type ProviderConfig } from '@/lib/ai-provider';
export function useEffectiveProvider() {
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  useEffect(() => { const refresh = () => setProvider(CLOUD_MODE ? getProviderConfig() : null); refresh(); window.addEventListener('flow-provider-change', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('flow-provider-change', refresh); window.removeEventListener('storage', refresh); }; }, []);
  return provider;
}
export function ProviderContext() {
  const provider = useEffectiveProvider();
  return <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-4 text-sm space-y-1">
    <p className="font-medium">{provider ? `${AI_PROVIDERS[provider.provider].label} · ${provider.provider === 'openai' ? 'model set per step' : provider.model}` : 'Model settings are shown per step'}</p>
    <p>{provider && provider.provider !== 'openai' ? 'Your selected model runs every step. Add the relevant listing text, requirements and source dates to the opportunity notes: this provider does not browse links in these workflows.' : 'The medical workflows use supplied source material. Web search is available only on steps that support and enable it.'}</p>
    <p>All messages remain drafts for your review. Nothing is sent automatically.</p>
  </div>;
}
