// Contract templates configuration
// Each template defines a GitHub repo where the WASM is located at builds/main-stripped.wasm

export const CONTRACT_TEMPLATES = [
  {
    id: 'okinoko-dao',
    label: 'Okinoko DAO',
    description: 'Decentralized autonomous organization contract',
    repo: 'tibfox/okinoko_dao',
    branch: 'main',
    wasmPath: 'builds/main-striped.wasm', // NOTE: Add WASM to repo - currently gitignored
    tag: 'dao',
  },
  {
    id: 'vsc-function-calls',
    label: 'VSC Function Calls',
    description: 'Example contract demonstrating VSC SDK function calls',
    repo: 'tibfox/vsc-function-calls',
    branch: 'main',
    wasmPath: 'builds/main-striped.wasm', // Note: typo in original filename (striped vs stripped)
    tag: null, // untagged - appears in global list only
  },
]

// Helper to get raw GitHub URL for a template
export function getTemplateWasmUrl(template) {
  return `https://raw.githubusercontent.com/${template.repo}/${template.branch}/${template.wasmPath}`
}

// Filter templates by tag (null = show all, 'dao' = show only dao-tagged)
export function filterTemplatesByTag(templates, tag) {
  if (!tag) {
    // No filter - return all templates
    return templates
  }
  // Return templates matching the tag
  return templates.filter(t => t.tag === tag)
}
