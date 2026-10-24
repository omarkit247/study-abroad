'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadCareerPlan, type CareerPlan } from '@/lib/career';
import { Panel, PanelHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export function CareerOverview() {
  const [plan, setPlan] = useState<CareerPlan | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => { try { setPlan(loadCareerPlan()); setError(''); } catch { setError('Your career plan could not be read. Open Medical career to restore a backup.'); } };
    refresh(); window.addEventListener('focus', refresh); window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const actions = plan?.milestones.filter(m => m.status !== 'Completed' && (m.nextAction || m.due)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')) ?? [];
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return <Panel>
    <PanelHeader title="Your next career steps" description="Germany first · UAE bridge · specialty still open" action={<Button asChild size="sm"><Link href="/career">Update career plan</Link></Button>} />
    <div className="grid gap-4 p-5 md:grid-cols-3">
      <div><h2 className="font-medium">German recognition</h2><p className="mt-2 text-sm whitespace-pre-line text-[var(--color-text-muted)]">{plan?.licensing || 'Record your latest Münster response and its date. A pending case is not approval.'}</p></div>
      <div><h2 className="font-medium">German preparation</h2><p className="mt-2 text-sm whitespace-pre-line text-[var(--color-text-muted)]">{plan?.german || 'Record your study level separately from B2 or FSP certificates.'}</p></div>
      <div><h2 className="font-medium">Opportunities alongside preparation</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">Explore UAE research, teaching and suitable support roles while preparing for Germany.</p><Link className="mt-2 inline-block text-sm underline" href="/research">Find research opportunities</Link></div>
    </div>
    <div className="border-t border-[var(--color-border)] p-5 space-y-3">
      {error && <p role="alert">{error}</p>}
      {actions.length ? actions.slice(0, 4).map(m => <div key={m.id} className="flex flex-wrap justify-between gap-2 text-sm"><div><strong>{m.title}</strong><p>{m.nextAction || 'Review this milestone'}</p></div><span>{m.due ? `${m.due < today ? 'Review overdue · ' : 'Review · '}${m.due}` : m.status}</span></div>) : <p className="text-sm text-[var(--color-text-muted)]">Add a next action or follow-up date in Medical career to build your personal action list.</p>}
      <p className="text-xs text-[var(--color-text-muted)]">Dates are planning reminders shown here, not automatic notifications. {plan?.updatedAt ? `Plan last saved ${new Date(plan.updatedAt).toLocaleDateString()}.` : ''}</p>
    </div>
  </Panel>;
}
