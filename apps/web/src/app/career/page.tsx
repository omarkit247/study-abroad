'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, PageBody } from '@/components/shared';
import { Panel, PanelHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/field';
import { CLOUD_MODE } from '@/lib/api';
import { SPECIALTIES, STAGES, newCareerPlan, loadCareerPlan, saveCareerPlan, parseCareerPlan, type CareerPlan, type Stage } from '@/lib/career';

export default function CareerPage() {
  const [plan, setPlan] = useState<CareerPlan>(newCareerPlan);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    try { setPlan(loadCareerPlan()); setReady(true); }
    catch (e) { setMessage(`${(e as Error).message} Restore a valid backup to continue.`); }
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(next: CareerPlan) { setPlan(next); setDirty(true); setMessage('Unsaved changes'); }
  function save() {
    try { setPlan(saveCareerPlan(plan)); setDirty(false); setMessage('Saved in this browser.'); }
    catch (e) { setMessage(`Could not save: ${(e as Error).message}`); }
  }
  function backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'medical-career-plan.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 500000) throw new Error('The backup is too large.');
      const restored = parseCareerPlan(JSON.parse(await file.text()));
      setPlan(restored); setReady(true); setDirty(true); setMessage('Backup loaded for review. Save to replace the stored career plan.');
    } catch (e) { setMessage((e as Error).message); }
  }
  const completed = plan.milestones.filter(m => m.status === 'Completed').length;
  return <>
    <PageHeader eyebrow="Germany first · UAE bridge" title="Medical career" description="Build your route into German medical practice. Keep specialty choices open and track the evidence behind each next step." action={<Button variant="primary" disabled={!ready} onClick={save}>Save career plan</Button>} />
    <PageBody className="space-y-6">
      <Panel className="p-5 space-y-3">
        <p className="font-medium">Your career, in one place</p>
        <p className="text-sm text-[var(--color-text-muted)]">Free local planning. Data stays in this browser; export a backup to move it between devices. Live AI runs use API credits and stop if you close the tab.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={backup} disabled={!ready}>Export career backup</Button>
          <label className="text-sm">Restore career backup<Input aria-label="Restore career backup" type="file" accept=".json,application/json" onChange={e => { void restore(e.target.files?.[0]); e.target.value = ''; }} /></label>
        </div>
        <p role="status" aria-live="polite" className="text-sm">{message || (plan.updatedAt ? `Last saved: ${new Date(plan.updatedAt).toLocaleString()}` : 'Review your brief and record your current status. No licensing milestone is assumed completed.')}</p>
      </Panel>
      <fieldset disabled={!ready} className="space-y-6">
        <Panel>
          <PanelHeader title="Career brief" description="Review before using it in research or applications. Keep case numbers and sensitive documents out of the AI brief." />
          <div className="p-5 space-y-4">
            <label className="block text-sm space-y-2">Direction and priorities<Textarea rows={5} value={plan.brief} onChange={e => change({ ...plan, brief: e.target.value })} /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm space-y-2">Current licensing status and evidence<Textarea placeholder="Record the latest authority response and its date. Pending is not approved." value={plan.licensing} onChange={e => change({ ...plan, licensing: e.target.value })} /></label>
              <label className="block text-sm space-y-2">German level and certificates<Textarea placeholder="Separate your current study level from certificates already obtained." value={plan.german} onChange={e => change({ ...plan, german: e.target.value })} /></label>
            </div>
            <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={plan.enabled} onChange={e => change({ ...plan, enabled: e.target.checked })} />Use this saved brief, licensing status, German level and specialty notes in live cloud-mode research and drafting runs. These fields will be sent to the AI provider when I start a run.</label>
            {!CLOUD_MODE && <p className="text-sm">This deployment is in local service mode. Career planning works here; automatic brief inclusion requires cloud mode.</p>}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Licensing and preparation" description={`${completed} of ${plan.milestones.length} planning milestones marked complete. These are planning categories, not a legal requirements checklist.`} />
          <div className="divide-y divide-[var(--color-border)]">
            {plan.milestones.map((m, index) => {
              const update = (patch: Partial<typeof m>) => change({ ...plan, milestones: plan.milestones.map((row, i) => i === index ? { ...row, ...patch } : row) });
              return <section key={m.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-medium">{m.title}</h2><div><Select aria-label={`${m.title} status`} value={m.status} onChange={e => update({ status: e.target.value as Stage })}>{STAGES.map(s => <option key={s}>{s}</option>)}</Select></div></div>
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <label className="block text-sm space-y-1">Next action<Input value={m.nextAction} onChange={e => update({ nextAction: e.target.value })} /></label>
                  <label className="block text-sm space-y-1">Follow-up date<Input type="date" value={m.due} onChange={e => update({ due: e.target.value })} /></label>
                </div>
                <label className="block text-sm space-y-1">Evidence / correspondence notes<Textarea rows={2} value={m.evidence} onChange={e => update({ evidence: e.target.value })} /></label>
              </section>;
            })}
          </div>
          <p className="p-5 text-sm text-[var(--color-text-muted)]">Dates are for your own review. No background reminders or automatic email checks are running. Milestone notes are excluded from the AI brief.</p>
        </Panel>
        <Panel>
          <PanelHeader title="Explore specialties before committing" description="Compare realistic entry, daily work, operative requirements, training pay, specialist pay and later practice economics. Keep sources and dates beside any figures." />
          <div className="grid gap-4 p-5 lg:grid-cols-3">{SPECIALTIES.map(s => <label key={s} className="block space-y-2 text-sm"><span className="font-semibold">{s}</span><Textarea rows={7} value={plan.specialtyNotes[s]} placeholder={s === 'Ophthalmology' ? 'Verify operative training requirements with the relevant medical chamber. Record your comfort with procedures, exposure and verified income evidence.' : 'Record exposure, entry requirements, working conditions and sourced income comparisons. Unknowns can stay unknown.'} onChange={e => change({ ...plan, specialtyNotes: { ...plan.specialtyNotes, [s]: e.target.value } })} /></label>)}</div>
        </Panel>
      </fieldset>
      <Panel className="p-5 space-y-3">
        <h2 className="font-medium">Turn preparation into applications</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Save changes before opening another screen. Add verified qualifications to your profile, then add German departments or UAE bridge employers as opportunities. The existing pipeline researches targets you supply; it does not automatically discover vacancies.</p>
        <div className="flex flex-wrap gap-3"><Button asChild><Link href="/applicants">Professional profile</Link></Button><Button asChild><Link href="/targets">Opportunities</Link></Button><Button asChild><Link href="/runs/new">Research and draft</Link></Button></div>
      </Panel>
    </PageBody>
  </>;
}
