// backend/src/utils/textUtils.js

/**
 * Normaliza nomes próprios para capitalização adequada em português.
 * Mantém preposições usuais em minúsculo.
 */
export function normalizeName(fullName) {
  if (!fullName || typeof fullName !== 'string') return fullName;
  const preps = ['da', 'de', 'do', 'das', 'dos', 'e'];
  return fullName
    .trim()
    .split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase();
      if (preps.includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Normaliza rótulos organizacionais (ex.: departamento/unidade).
 * - Pega apenas a parte ANTES do primeiro " - "
 * - Aplica a mesma normalização de nomes (mantendo preposições minúsculas)
 * Ex.: "GERENCIA DE TI - PC (LC 741/2019)" -> "Gerencia de Ti"
 */
export function normalizeOrg(text) {
  if (!text || typeof text !== 'string') return text;
  const beforeDash = text.split('-')[0].trim(); // tudo antes de " - "
  return normalizeName(beforeDash);
}

/**
 * Normaliza e-mails: trim + lowercase.
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return email;
  return email.trim().toLowerCase();
}

/**
 * Normaliza cargos:
 * - mantém apenas a parte ANTES do primeiro " - "
 * - aplica normalização de nome (preposições minúsculas)
 * Ex.: "DELEGADO DE POLICIA - 4A ENTRANCIA" -> "Delegado de Policia"
 */
export function normalizeCargo(text) {
  if (!text || typeof text !== 'string') return text;
  const beforeDash = text.split('-')[0].trim();
  return normalizeName(beforeDash);
}
