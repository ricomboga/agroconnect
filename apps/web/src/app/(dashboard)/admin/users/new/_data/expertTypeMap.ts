export const EXPERT_TYPE_TO_PROVIDER_TYPE: Record<string, string> = {
  vet_officer: 'vet',
  extension_officer: 'extension_officer',
  agronomist: 'agronomist',
  soil_lab: 'soil_lab',
}

export const PROVIDER_TYPE_TO_EXPERT_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(EXPERT_TYPE_TO_PROVIDER_TYPE).map(([expertType, providerType]) => [providerType, expertType]),
)
