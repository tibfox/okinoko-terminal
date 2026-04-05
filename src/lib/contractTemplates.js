import CONTRACT_TEMPLATES from '../data/contracts/github-templates.json'

export { CONTRACT_TEMPLATES }

export function filterTemplatesByTag(templates, tag) {
  if (!tag) return templates
  return templates.filter(t => t.tag === tag)
}
