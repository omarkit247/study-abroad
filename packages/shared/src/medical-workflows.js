import { buildDefaultPrompts } from './builtins.js';

const routes = [
  { key: 'germany', name: 'Germany · clinical role or Hospitation', description: 'Review a department or listing, separate current eligibility from missing evidence, and draft a focused enquiry.', instruction: 'The target is a German clinical department, training position or Hospitation. Distinguish Approbation, Berufserlaubnis, language certification, FSP and chamber training authorisation. Do not infer any of these from an MD or a pending recognition application. An observership is not permission to practise. Ask about unresolved requirements without claiming eligibility. Do not assume a specialty has been chosen.' },
  { key: 'uae', name: 'UAE · research, teaching or support role', description: 'Assess an interim role against your documented experience, licensing requirements and practical availability.', instruction: 'The target is a UAE research assistant, teaching assistant, clinical support or coordination role. Determine the actual duties from supplied material. Do not assume clinical licensing is required for every research role, or that a support title permits clinical practice. Separate employer requirements, professional licensing and work authorisation. Do not equate an MD with an active UAE licence. Treat this as an interim career route.' },
  { key: 'research', name: 'Medical research · professor or project', description: 'Use supplied project and publication evidence to assess fit and draft a specific research enquiry.', instruction: 'The target is a medical professor, lab, project or research opportunity. Distinguish a funded project from an advertised vacancy. Separate paid employment, funded study and unpaid participation. Match only documented research skills and publications; never invent authorship, methods, statistics experience or access to patient data. Ask about role scope, supervision and funding when unknown.' },
];

/** Additive defaults: stable IDs and keys let existing workspaces retain edits. */
export function buildMedicalDefaults(createdAt, makeId) {
  const templates = buildDefaultPrompts(createdAt, makeId);
  const prompts = [], pipelines = [];
  for (const route of routes) {
    const steps = [];
    for (const [key, templateKey, title] of [
      ['research', 'research.target_profile', 'Review source evidence'],
      ['analysis', 'analysis.fit_assessment', 'Assess fit and eligibility gaps'],
      ['draft', 'outreach.first_contact', 'Draft a focused enquiry'],
    ]) {
      const source = templates.find(p => p.key === templateKey);
      if (!source) throw new Error(`Missing medical workflow template: ${templateKey}`);
      const template = structuredClone(source);
      const promptKey = `medical.${route.key}.${key}`;
      template.id = `prm_${promptKey.replaceAll('.', '_')}`;
      template.key = promptKey;
      template.name = `${route.name} · ${title}`;
      template.description = 'Uses your profile and supplied opportunity notes. No automatic web search or sending.';
      template.isBuiltIn = false;
      template.tags = ['medical', route.key];
      const version = template.versions[0];
      version.note = 'Medical career workflow; editable starting point';
      version.config.webSearch = false;
      version.config.maxOutputTokens = 4096;
      version.systemPrompt = `You support a medical graduate planning Germany as the primary clinical career route and UAE bridge work. ${route.instruction}\nUse only supplied profile facts, opportunity notes and earlier outputs. A URL alone is not evidence that you read it. Never claim live verification. Record source dates when supplied; otherwise mark them unknown. Keep the existing output schema. Eligibility unknown is different from ineligible. A fit score is an exploratory judgement, not an employment or licensing decision. Do not include private case identifiers, salary motivations or speculative deficits in outreach. Never send a message; produce a draft for review.\n\n` + (key === 'research'
        ? 'Extract the supplied target evidence into the requested schema. Set verified to false because this workflow does not independently verify sources. Put missing requirements, current vacancy status and source checks in gaps.'
        : version.systemPrompt);
      prompts.push(template);
      steps.push({ id: `step_${route.key}_${key}`, key, title, description: title, promptKey, service: template.stage === 'outreach' ? 'outreach' : template.stage, enabled: true, optional: false });
    }
    pipelines.push({ id: `ppl_medical_${route.key}_v1`, createdAt, updatedAt: createdAt, name: route.name, description: route.description, isBuiltIn: false, tags: ['medical', route.key], steps });
  }
  return { prompts, pipelines };
}
