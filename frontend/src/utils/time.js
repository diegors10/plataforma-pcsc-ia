// util/time.js

/**
 * Formata a diferença de tempo entre agora e a data informada em uma frase legível.
 *
 * Regras:
 * - Menos de 1 minuto: "Atualizado agora mesmo".
 * - 1 a 59 minutos: "X minutos atrás" (pluralização simples).
 * - 1 a 23 horas: "Xh atrás".
 * - 1 a 6 dias: "Xd atrás".
 * - Acima de 7 dias: data local (pt-BR).
 *
 * @param {string|Date} dateString Data ISO ou objeto Date a ser formatado.
 * @returns {string} Texto representando o tempo decorrido.
 */
export function formatTimeAgo(dateString) {
  const now = new Date();
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Atualizado agora mesmo';
  if (diffMinutes < 60) {
    const m = diffMinutes;
    return `${m} ${m === 1 ? 'minuto' : 'minutos'} atrás`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Converte uma lista de itens com campo de data em objetos com rótulo de tempo e data para ordenação.
 * Útil para feed de atividades, onde você precisa ordenar por data real mas exibir rótulo humano.
 *
 * @param {Array<Object>} list Lista de objetos contendo a propriedade `createdAt` (string ou Date).
 * @param {string} prop Nome da propriedade de data a ser utilizada (padrão: 'createdAt').
 * @returns {Array<Object>} Lista com campos extras: `_timeAgo` (string) e `_timeValue` (timestamp ms).
 */
export function withTimeMetadata(list, prop = 'createdAt') {
  return Array.isArray(list)
    ? list.map((item) => {
        const dateValue = item[prop] ? new Date(item[prop]) : new Date();
        return {
          ...item,
          _timeValue: dateValue.getTime(),
          _timeAgo: formatTimeAgo(dateValue),
        };
      })
    : [];
}