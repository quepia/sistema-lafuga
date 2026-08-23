/**
 * Normaliza texto para comparaciones de búsqueda en el cliente.
 *
 * Mantener estos criterios alineados con public.normalizar_busqueda() en
 * Postgres evita resultados distintos entre filtros locales y remotos.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function searchTextIncludes(value: string | null | undefined, query: string): boolean {
  if (!value) return false

  const normalizedValue = normalizeSearchText(value)
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean)

  return tokens.length > 0 && tokens.every((token) => normalizedValue.includes(token))
}
