'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, PageBody } from '@/components/shared';
import { Panel, PanelHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/field';
import { GERMAN_SOURCES, GERMAN_SPECIALTY_TERMS, parseCareerOpsTsv } from '@/lib/german-sources';
import { loadCareerPlan, SPECIALTIES } from '@/lib/career';
import { api } from '@/lib/api';

export default function SourcesPage() {
  const [query, setQuery] = useState(''); const [city, setCity] = useState(''); const [specialty, setSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([...SPECIALTIES]); const [category, setCategory] = useState('All');
  const [tsv, setTsv] = useState(''); const [preview, setPreview] = useState<ReturnType<typeof parseCareerOpsTsv>>([]);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { try { setSpecialties(Object.keys(loadCareerPlan().specialtyNotes)); } catch { /* Defaults remain available. */ } }, []);
  const search = [query, city, GERMAN_SPECIALTY_TERMS[specialty] || specialty].filter(Boolean).join(' ');
  async function importRows() {
    setBusy(true);
    try {
      const result = await api.post<{ imported: number; skipped: unknown[] }>('/api/targets/import', { format: 'json', content: JSON.stringify(preview) });
      setMessage(`${result.imported} records imported; ${result.skipped.length} skipped. Review them in Opportunities before a run.`); setPreview([]);
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  return <><PageHeader title="German sources & career-ops" description="Find hospitals, professors, departments, training authorisations and jobs. Keep source evidence separate from assumptions about eligibility." />
    <PageBody className="space-y-6"><Panel className="p-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-3"><label className="text-sm">Hospital, professor or role<Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, Assistenzarzt, wissenschaftlicher Mitarbeiter" /></label><label className="text-sm">City / region<Input value={city} onChange={e => setCity(e.target.value)} placeholder="NRW, Münster, Düsseldorf…" /></label><label className="text-sm">Specialty<Select value={specialty} onChange={e => setSpecialty(e.target.value)}><option value="">Any specialty</option>{specialties.map(s => <option key={s}>{s}</option>)}</Select></label></div>
      <label className="block text-sm">Source type<Select value={category} onChange={e => setCategory(e.target.value)}>{['All', ...new Set(GERMAN_SOURCES.map(s => s.category))].map(s => <option key={s}>{s}</option>)}</Select></label>
      <p className="text-sm">Directory reviewed 23 October 2026. Search buttons open external search results; they do not scrape or verify records. Confirm a professor’s current role and public professional contact on their institution’s website. Never infer email addresses.</p>
    </Panel><div className="grid gap-4 lg:grid-cols-2">{GERMAN_SOURCES.filter(s => category === 'All' || s.category === category).map(s => <Panel key={s.name} className="p-5 space-y-3"><h2 className="font-semibold">{s.name}</h2><p className="text-sm">{s.detail}</p><p className="text-xs text-[var(--color-text-muted)]">{s.access}</p><div className="flex flex-wrap gap-3"><Button asChild><a href={s.url} target="_blank" rel="noopener noreferrer">Open source</a></Button><Button asChild><a href={`https://www.google.com/search?q=${encodeURIComponent(`site:${s.domain} ${search}`)}`} target="_blank" rel="noopener noreferrer">Search this source</a></Button>{'terms' in s && <a href={s.terms} target="_blank" rel="noopener noreferrer" className="underline text-sm">Access terms</a>}</div></Panel>)}</div>
    <Panel><PanelHeader title="Use career-ops alongside this workspace" description="Run its scanners and evaluation tools locally. Bring headed tracker-addition TSV records here for medical eligibility review and drafting. No shared server or paid connector is required." /><div className="p-5 space-y-4">
      <p className="text-sm">Supported format: headed TSV additions with company, role, status and score; optional url, date, location and notes. Full Markdown trackers and reports are not supported by this importer. Imported scores remain external opinions, and application statuses are kept in notes rather than treated as verified facts.</p>
      <label className="block text-sm">Paste career-ops TSV<Textarea rows={7} value={tsv} onChange={e => { setTsv(e.target.value); setPreview([]); }} /></label>
      <Button disabled={busy} onClick={() => { try { const rows = parseCareerOpsTsv(tsv); setPreview(rows); setMessage(`${rows.length} records ready for review.`); } catch (e) { setPreview([]); setMessage((e as Error).message); } }}>Preview import</Button>
      {preview.length > 0 && <><div className="max-h-72 overflow-auto space-y-2">{preview.map((r, i) => <p key={i} className="text-sm">{r.organization} — {r.name} · {r.website || 'No source URL supplied'}</p>)}</div><Button variant="primary" disabled={busy} onClick={() => void importRows()}>{busy ? 'Importing…' : 'Import reviewed records'}</Button></>}
      <p role="status" className="text-sm">{message}</p><div className="flex flex-wrap gap-3"><Button asChild><Link href="/targets">Review opportunities</Link></Button><a className="underline text-sm" href="https://github.com/omarkit247/career-ops" target="_blank" rel="noopener noreferrer">career-ops repository</a></div>
    </div></Panel></PageBody></>;
}
