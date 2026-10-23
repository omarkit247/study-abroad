'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { loadCareerPlan, SPECIALTIES } from '@/lib/career';
import type { Target } from '@/lib/types';
import { PageHeader, PageBody } from '@/components/shared';
import { Panel, PanelHeader } from '@/components/ui/primitives';
import { Input, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

const ROLES = ['Research assistant', 'Clinical research coordinator', 'Research fellowship', 'Research collaboration', 'Teaching / research assistant', 'Doctoral research'] as const;
const STATUSES = ['new', 'shortlisted', 'contacted', 'applied', 'interview', 'offer', 'closed'];
const EMPTY = { name: '', organization: '', country: 'Germany', role: 'Research assistant', specialty: '', url: '', deadline: '', eligibility: 'Unknown', requirements: '', compensation: '', verified: '', notes: '' };
const TAG = 'medical-research';
function sourceUrl(value: string): string | undefined {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; }
}
export default function ResearchPage() {
  const [specialties, setSpecialties] = useState<string[]>([...SPECIALTIES]);
  const [country, setCountry] = useState('Germany');
  const [specialty, setSpecialty] = useState('');
  const [role, setRole] = useState<string>(ROLES[0]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  useEffect(() => { try { setSpecialties(Object.keys(loadCareerPlan().specialtyNotes)); } catch { setMessage('Career plan could not be read. Default specialties are shown.'); } }, []);
  const { data, error, isLoading, mutate } = useSWR('/api/targets', path => api.getWithMeta<Target[]>(path));
  const all = (data?.data ?? []).filter(t => t.tags.includes(TAG));
  const rows = all.filter(t => !filter || `${t.name} ${t.organization} ${t.country} ${t.focusAreas.join(' ')} ${t.status}`.toLowerCase().includes(filter.toLowerCase()));
  const query = `${country} ${specialty} ${role} medicine ${country === 'Germany' ? 'wissenschaftlicher Mitarbeiter Universitätsklinikum Stelle' : 'university hospital vacancy'}`;
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!sourceUrl(form.url)) { setMessage('Use an http or https link to the original listing.'); return; }
    setBusy(true);
    try {
      await api.post('/api/targets', {
        name: form.name, organization: form.organization, kind: 'research', role: form.role, country: form.country,
        focusAreas: form.specialty.trim() ? [form.specialty.trim()] : [], links: [{ id: 'source', label: 'Original opportunity', url: form.url }],
        deadline: form.deadline, status: 'new', tags: [TAG], notes: form.notes,
        customFields: [
          { id: 'eligibility', label: 'Eligibility assessment', value: form.eligibility },
          { id: 'requirements', label: 'Requirements and evidence', value: form.requirements },
          { id: 'funding', label: 'Compensation / funding evidence', value: form.compensation || 'Not stated / unverified' },
          { id: 'checked', label: 'Source last checked', value: form.verified || 'Not checked' },
        ],
      });
      setForm({ ...EMPTY }); await mutate(); setMessage('Opportunity saved. It is also available in Opportunities and the run wizard.');
    } catch (e) { setMessage(`Could not save: ${(e as Error).message}`); }
    finally { setBusy(false); }
  }
  async function updateStatus(id: string, status: string) {
    setPending(id);
    try { await api.patch(`/api/targets/${id}`, { status }); await mutate(); setMessage('Application status updated.'); }
    catch (e) { setMessage(`Could not update: ${(e as Error).message}`); }
    finally { setPending(null); }
  }
  return <>
    <PageHeader eyebrow="Germany first · UAE bridge" title="Research opportunities" description="Find research work, build academic experience and track applications alongside your clinical career." />
    <PageBody className="space-y-6">
      <Panel>
        <PanelHeader title="Find opportunities" description="Choose a location, specialty and role. Searches open in a new tab and cost no API credits. Verify each result on the employer’s original listing." />
        <div className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">Location<Select value={country} onChange={e => setCountry(e.target.value)}><option>Germany</option><option>UAE</option><option>Remote / international</option></Select></label>
            <label className="text-sm">Specialty<Select value={specialty} onChange={e => setSpecialty(e.target.value)}><option value="">Any medical specialty</option>{specialties.map(s => <option key={s}>{s}</option>)}</Select></label>
            <label className="text-sm">Role<Select value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</Select></label>
          </div>
          <div className="flex flex-wrap gap-3"><Button asChild><a href={`https://www.google.com/search?q=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer">Search opportunities</a></Button><Button asChild><a href={`https://www.google.com/search?q=${encodeURIComponent(query + (country === 'UAE' ? ' site:ac.ae' : country === 'Germany' ? ' site:de' : ''))}`} target="_blank" rel="noopener noreferrer">Search regional sources</a></Button></div>
          <p className="text-sm text-[var(--color-text-muted)]">These are search links, not verified vacancies or an automatic feed. Research roles may have different licensing requirements from clinical jobs; check the specific listing. Paid, funded and unpaid opportunities should be distinguished.</p>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Save a research opportunity" description="Capture the original source and what you know about eligibility. Unknown requirements stay unknown." />
        <form onSubmit={add} className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">Position / project<Input required maxLength={300} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label className="text-sm">University / hospital / group<Input required maxLength={300} value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} /></label>
            <label className="text-sm">Location<Input required value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></label>
            <label className="text-sm">Specialty<Input list="research-specialties" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /><datalist id="research-specialties">{specialties.map(s => <option key={s} value={s} />)}</datalist></label>
            <label className="text-sm">Role<Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</Select></label>
            <label className="text-sm">Original listing URL<Input required type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></label>
            <label className="text-sm">Deadline<Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></label>
            <label className="text-sm">Source last checked<Input type="date" value={form.verified} onChange={e => setForm({ ...form, verified: e.target.value })} /></label>
            <label className="text-sm">Eligibility<Select value={form.eligibility} onChange={e => setForm({ ...form, eligibility: e.target.value })}><option>Unknown</option><option>Potentially eligible after requirements</option><option>Eligible now — evidence recorded</option><option>Not currently eligible — evidence recorded</option></Select></label>
            <label className="text-sm">Compensation / funding<Input placeholder="Amount, currency, period, source; or not stated" value={form.compensation} onChange={e => setForm({ ...form, compensation: e.target.value })} /></label>
          </div>
          <label className="block text-sm">Requirements and evidence<Textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} placeholder="Language, degree, research experience, licensing if required, work authorization and evidence supporting the eligibility assessment." /></label>
          <label className="block text-sm">Application notes<Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save opportunity'}</Button>
        </form>
      </Panel>
      <p role="status" aria-live="polite" className="text-sm">{message}</p>
      <Panel>
        <PanelHeader title={`Research shortlist (${all.length})`} description="Saved in the same workspace as your other opportunities, included in its export, and selectable for research and drafting runs." />
        <div className="p-5 space-y-4">
          <Input aria-label="Filter research shortlist" placeholder="Filter by position, institution, country, specialty or status" value={filter} onChange={e => setFilter(e.target.value)} />
          {error ? <p role="alert">Could not load opportunities. <button onClick={() => void mutate()}>Retry</button></p> : isLoading ? <p>Loading…</p> : !rows.length ? <p>{all.length ? 'No matching opportunities.' : 'No research opportunities saved yet. Start with a search above.'}</p> : rows.map(t => <article key={t.id} className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
            <h2 className="font-semibold">{t.name}</h2><p className="text-sm">{t.organization} · {t.country} · {t.focusAreas.join(', ') || 'Any specialty'}</p>
            <p className="text-sm">Deadline: {t.deadline || 'Not recorded'} · {t.customFields.find(f => f.label === 'Eligibility assessment')?.value || 'Eligibility unknown'}</p>
            <div className="flex flex-wrap items-center gap-3"><div><Select aria-label={`Application status for ${t.name}`} disabled={pending === t.id} value={t.status} onChange={e => void updateStatus(t.id, e.target.value)}>{Array.from(new Set([...STATUSES, t.status])).map(s => <option key={s}>{s}</option>)}</Select></div>{t.links[0] && sourceUrl(t.links[0].url) && <a className="text-sm underline" href={sourceUrl(t.links[0].url)} target="_blank" rel="noopener noreferrer">Original listing</a>}<Link className="text-sm underline" href={`/runs/new?targets=${encodeURIComponent(t.id)}`}>Research and draft</Link></div>
          </article>)}
          <Button asChild><Link href="/targets">Edit full records in Opportunities</Link></Button>
        </div>
      </Panel>
    </PageBody>
  </>;
}
