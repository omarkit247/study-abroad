export const GERMAN_SOURCES = [
  { name: 'Destatis hospital and rehabilitation directory', category: 'Hospitals', url: 'https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Krankenhauser/krankenhausverzeichnis.html', domain: 'destatis.de', detail: 'Hospital names, addresses, contact details and departments. Downloadable data can be reused with attribution; check the edition date.', access: 'Download / attribution' },
  { name: 'Deutsches Krankenhaus Verzeichnis', category: 'Hospitals', url: 'https://www.deutsches-krankenhaus-verzeichnis.de/app/suche', domain: 'deutsches-krankenhaus-verzeichnis.de', detail: 'Find hospitals and departments by location and services. Confirm staff names on the hospital’s own website.', access: 'Manual lookup; automated access not verified' },
  { name: 'DFG GEPRIS', category: 'Professors / research', url: 'https://gepris.dfg.de/', domain: 'gepris.dfg.de', detail: 'Identify funded projects, researchers and institutions. A funded project does not necessarily have an open position.', access: 'Manual lookup; automated access not verified' },
  { name: 'ÄKWL training authorisations', category: 'Specialty training', url: 'https://portal.aekwl.de/web/serviceportal/befugnissuche', domain: 'aekwl.de', detail: 'Check authorised trainers in Westfalen-Lippe. Verify specialty, permitted training duration and any conditions.', access: 'Manual lookup; automated access not verified' },
  { name: 'Ärztekammer Nordrhein training authorisations', category: 'Specialty training', url: 'https://www.aekno.de/presse/arztsuchen/weiterbildungsbefugte', domain: 'aekno.de', detail: 'Check authorised trainers in Nordrhein. Authorisation is separate from a current vacancy or your personal eligibility.', access: 'Manual lookup; automated access not verified' },
  { name: 'Ärztestellen / Deutsches Ärzteblatt', category: 'Jobs', url: 'https://aerztestellen.aerzteblatt.de/de/stellen', domain: 'aerztestellen.aerzteblatt.de', detail: 'Medical vacancies across specialties and seniority levels. Follow through to the employer’s original posting.', access: 'Manual lookup; automated access not verified' },
  { name: 'Bundesagentur für Arbeit Jobsuche', category: 'Jobs', url: 'https://www.arbeitsagentur.de/jobsuche/', domain: 'arbeitsagentur.de', detail: 'Search medical and research jobs. Automated collection is not enabled: the portal’s terms restrict robots and unintended API collection.', access: 'Manual only', terms: 'https://www.arbeitsagentur.de/nutzungsbedingungen' },
] as const;
export const GERMAN_SPECIALTY_TERMS: Record<string, string> = {
  Dermatology: 'Dermatologie Haut- und Geschlechtskrankheiten', Neurology: 'Neurologie', Ophthalmology: 'Augenheilkunde',
  Gastroenterology: 'Innere Medizin Gastroenterologie', 'Internal medicine': 'Innere Medizin',
  'Physical medicine and rehabilitation': 'Physikalische und Rehabilitative Medizin',
};
/** Only headed career-ops addition TSV is supported; never guess positional columns. */
export function parseCareerOpsTsv(text: string) {
  if (text.length > 1000000) throw new Error('Use a file smaller than 1 MB.');
  const lines = text.replace(/^\uFEFF/, '').replace(/[\r\n]+$/, '').split(/\r?\n/);
  const headers = lines.shift()!.split('\t').map(s => s.trim().toLowerCase());
  if (!['company', 'role', 'status', 'score'].every(k => headers.includes(k)) || new Set(headers).size !== headers.length) throw new Error('Expected a headed career-ops TSV with company, role, status and score columns.');
  if (lines.length > 500) throw new Error('Import up to 500 records at a time.');
  return lines.filter(l => l.trim()).map((line, index) => {
    const cells = line.split('\t');
    if (cells.length !== headers.length) throw new Error(`Row ${index + 2}: column count does not match the header.`);
    const row = Object.fromEntries(headers.map((h, i) => [h, cells[i].trim()]));
    if (!row.company || !row.role) throw new Error(`Row ${index + 2}: company and role are required.`);
    if (row.url) { let u: URL; try { u = new URL(row.url); } catch { throw new Error(`Row ${index + 2}: invalid source URL.`); } if (!['http:', 'https:'].includes(u.protocol)) throw new Error(`Row ${index + 2}: source must use http or https.`); }
    return {
      name: row.role, organization: row.company, kind: 'job', role: row.role,
      website: row.url || '', tags: ['career-ops'],
      notes: `Imported from career-ops. External status: ${row.status}; external score: ${row.score}. These are not verified medical eligibility findings.\n${row.notes || ''}\nSource date: ${row.date || 'unknown'}; location: ${row.location || 'not supplied'}`,
    };
  });
}
