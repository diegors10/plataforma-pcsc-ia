// util/time.js

import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

// Função de parsing robusta para datas. Aceita strings ISO e formato "YYYY-MM-DD HH:mm:ss[.SS]".
function parseDateSafe(input) {
  if (!input) return null;
  // Se já for Date, retorna sem processamento
  if (input instanceof Date) return input;
  // Se for um objeto genérico (por exemplo, payload completo), tenta extrair propriedade de data
  if (typeof input === 'object') {
    const candidateKeys = [
      'createdAt', 'created_at', 'criado_em',
      'updatedAt', 'updated_at', 'atualizado_em',
      'data', 'timestamp'
    ];
    for (const key of candidateKeys) {
      const val = input[key];
      if (val) {
        // recursivamente tenta analisar a data contida
        const nested = parseDateSafe(val);
        if (nested && !isNaN(nested.getTime())) return nested;
      }
    }
    // não encontrou nenhuma propriedade de data
    return null;
  }
  // trata como string (números ou strings ISO)
  let str = String(input).trim();
  // Se for apenas dígitos, interpreta como timestamp (ms ou s)
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    return new Date(num > 1e12 ? num : num * 1000);
  }
  // Se houver espaço entre data e hora (formato "yyyy-MM-dd HH:mm:ss"), tenta converter para ISO
  if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str) && !str.includes('T')) {
    let iso = str.replace(' ', 'T');
    // primeiro tenta parsear com fração se houver
    let d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
    // remove parte fracionária (após ponto) e tenta novamente
    const [noFrac] = iso.split('.');
    d = new Date(noFrac);
    if (!isNaN(d.getTime())) return d;
    // adiciona Z (UTC) e tenta
    d = new Date(noFrac + 'Z');
    if (!isNaN(d.getTime())) return d;
    // fallback
    return d;
  }
  // tenta parsear diretamente usando Date
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  // Fallback: tenta extrair manualmente componentes de data/hora
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    // Construir data no fuso local; mês é baseado em zero
    const manual = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0)
    );
    return manual;
  }
  return date;
}

/**
 * Formata a diferença de tempo entre agora e a data informada em uma frase legível.
 *
 * Regras:
 * - Menos de 1 minuto: "Atualizado agora mesmo".
 * - 1 a 59 minutos: "X minutos atrás" (pluralização simples).
 * - 1 a 23 horas: "Xh atrás".
 * - 1 a 6 dias: "Xd atrás".
 * - Acima de 7 dias: formato completo dd/MM/yyyy HH:mm.
 *
 * Caso a data seja inválida, retorna "Data inválida".
 *
 * @param {string|Date} dateString Data ISO ou objeto Date a ser formatado.
 * @returns {string} Texto representando o tempo decorrido.
 */
export function formatTimeAgo(dateString) {
  // Garante que temos um Date válido usando parseDateSafe
  const date = parseDateSafe(dateString);
  // Se a data é inválida ou não fornecida, evita exibir "Invalid Date" e retorna placeholder legível
  if (!date || isNaN(date.getTime())) {
    return 'Data desconhecida';
  }
  const now = new Date();

  const diffMinutes = differenceInMinutes(now, date);
  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) {
    const m = diffMinutes;
    return `${m} ${m === 1 ? 'minuto' : 'minutos'} atrás`;
  }
  const diffHours = differenceInHours(now, date);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = differenceInDays(now, date);
  if (diffDays < 7) return `${diffDays}d atrás`;
  // Para períodos mais longos, retorna data completa no formato dd/MM/yyyy HH:mm
  return format(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Formata uma data para o padrão dd/MM/yyyy HH:mm. Caso a entrada não seja
 * reconhecida como uma data válida, retorna "Data inválida".
 *
 * @param {string|Date} dateInput Data ISO ou objeto Date a ser formatado.
 * @returns {string} Data formatada ou mensagem de erro.
 */
export function formatDateTime(dateInput) {
  const date = parseDateSafe(dateInput);
  // Verifica se a data é válida usando getTime(); caso contrário retorna mensagem de erro legível.
  if (!date || isNaN(date.getTime())) return 'Data desconhecida';
  return format(date, 'dd/MM/yyyy HH:mm');
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
        // Usa parseDateSafe para tratar strings de datas em formatos variados
        const dateValue = item[prop] ? parseDateSafe(item[prop]) : new Date();
        return {
          ...item,
          _timeValue: dateValue.getTime(),
          _timeAgo: formatTimeAgo(dateValue),
        };
      })
    : [];
}