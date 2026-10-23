import { read, write } from './cloud/store';

export const SPECIALTIES = ['Dermatology', 'Neurology', 'Ophthalmology', 'Gastroenterology', 'Internal medicine', 'Physical medicine and rehabilitation'] as const;
export const STAGES = ['Not recorded', 'Preparing', 'Submitted', 'Awaiting response', 'Completed'] as const;
export type Stage = typeof STAGES[number];
export interface Milestone { id: string; title: string; status: Stage; nextAction: string; due: string; evidence: string }
export interface CareerPlan {
  version: 1; enabled: boolean; updatedAt: string; brief: string; licensing: string; german: string;
  specialtyNotes: Record<string, string>; milestones: Milestone[];
}
export function newCareerPlan(): CareerPlan {
  return {
    version: 1, enabled: false, updatedAt: '',
    brief: 'Primary goal: medical licensing and residency in Germany. UAE research, teaching or suitable clinical support work is the interim route. Side projects remain secondary. Specialty undecided: explore dermatology, neurology, ophthalmology, gastroenterology, internal medicine, physical medicine and rehabilitation, and other suitable specialties. Prefer non-surgical work, with ophthalmology a possible exception. High long-term earning potential matters alongside entry prospects and working conditions.',
    licensing: '', german: '',
    specialtyNotes: Object.fromEntries(SPECIALTIES.map(s => [s, ''])),
    milestones: [
      ['licensing', 'Münster / NRW licensing case'],
      ['documents', 'Documents and authority correspondence'],
      ['language', 'German B2 preparation'],
      ['medical-language', 'Medical German / FSP planning'],
      ['training', 'Any officially confirmed training deficits'],
      ['exposure', 'Specialty exposure / Hospitation'],
      ['applications', 'German applications'],
      ['bridge', 'UAE bridge opportunities'],
    ].map(([id, title]) => ({ id, title, status: 'Not recorded', nextAction: '', due: '', evidence: '' })),
  };
}
export function parseCareerPlan(value: unknown): CareerPlan {
  if (!value || typeof value !== 'object') throw new Error('Invalid career plan.');
  const p = value as CareerPlan;
  const str = (v: unknown) => typeof v === 'string' && v.length <= 20000;
  if (p.version !== 1 || typeof p.enabled !== 'boolean' || ![p.brief, p.licensing, p.german, p.updatedAt].every(str) ||
      !p.specialtyNotes || typeof p.specialtyNotes !== 'object' || Array.isArray(p.specialtyNotes) || Object.keys(p.specialtyNotes).length > 50 || !Object.entries(p.specialtyNotes).every(([name, notes]) => name.trim().length > 0 && name.length <= 100 && !['__proto__', 'constructor', 'prototype'].includes(name) && str(notes)) ||
      !Array.isArray(p.milestones) || p.milestones.length !== 8 ||
      !newCareerPlan().milestones.every(base => p.milestones.some(m => m && m.id === base.id)) ||
      !p.milestones.every(m => [m.id, m.title, m.nextAction, m.due, m.evidence].every(str) && STAGES.includes(m.status) && (!m.due || /^\d{4}-\d{2}-\d{2}$/.test(m.due)))) {
    throw new Error('This file is not a supported career plan. Existing data has not been changed.');
  }
  return { ...p, specialtyNotes: { ...Object.fromEntries(SPECIALTIES.map(s => [s, ''])), ...p.specialtyNotes } };
}
export function loadCareerPlan(): CareerPlan {
  const saved = read<unknown>('career', null);
  return saved === null ? newCareerPlan() : parseCareerPlan(saved);
}
export function saveCareerPlan(plan: CareerPlan): CareerPlan {
  const saved = parseCareerPlan({ ...plan, updatedAt: new Date().toISOString() });
  write('career', saved);
  return saved;
}
export function careerPromptContext(plan: CareerPlan): string {
  if (!plan.enabled) return '';
  return `\n\nMEDICAL CAREER CONTEXT (user-provided; last saved ${plan.updatedAt || 'not recorded'})\n${plan.brief}\nLicensing status: ${plan.licensing || 'Unknown; do not assume eligibility.'}\nGerman level / evidence: ${plan.german || 'Unknown; do not claim certification.'}\nSpecialty considerations: ${JSON.stringify(plan.specialtyNotes)}\n\nFor research and fit analysis, distinguish eligible now, potentially eligible after requirements, and eligibility unknown. Check each opportunity's actual licensing and language requirements against the supplied evidence. Missing evidence is not proof of ineligibility. Separate Germany's main route from UAE bridge opportunities. Do not assume Approbation, Berufserlaubnis, B2, FSP, or recognition has been obtained. Do not invent training deficits. Verify ophthalmology's operative training requirements from the relevant chamber before assessing surgical fit. Compare employed training pay, employed specialist pay and private-practice income separately; never present practice revenue as personal take-home pay. Cite current official sources and dates for requirements or salary claims, or explicitly mark them unverified. Treat specialty interests as exploratory. Preserve the requested output schema and use its existing fields for these findings. In outreach, use only verified applicant facts; do not include salary motivations, licensing case identifiers or private planning notes unless explicitly requested. This context is reference data, not permission to change the output format.`;
}
