export function defaultScores(skills, value = 50) {
  return Object.fromEntries((skills || []).map((skill) => [skill.id, value]));
}

function evaluationTime(evaluation) {
  const raw = evaluation?.date || evaluation?.updatedAt || evaluation?.createdAt;
  if (!raw) return 0;
  if (typeof raw.toDate === "function") return raw.toDate().getTime();
  if (typeof raw.seconds === "number") return raw.seconds * 1000;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortEvaluations(evaluations = []) {
  return [...evaluations].sort((a, b) => evaluationTime(b) - evaluationTime(a));
}

export function latestEvaluation(playerOrEvals) {
  const list = Array.isArray(playerOrEvals) ? playerOrEvals : playerOrEvals?.evaluations;
  return sortEvaluations(list)[0] || null;
}

export function defaultSkillNotes(skills) {
  return Object.fromEntries((skills || []).map((skill) => [skill.id, ""]));
}

export function averageFromScores(scores, skills) {
  if (!skills?.length) return 0;
  const total = skills.reduce((sum, skill) => sum + Number(scores?.[skill.id] || 0), 0);
  return total / skills.length;
}

export function averageScore(evaluations, skills) {
  if (!evaluations?.length || !skills?.length) return 0;
  const total = evaluations.reduce((sum, evaluation) => {
    if (evaluation.overallScore != null) return sum + Number(evaluation.overallScore);
    return sum + averageFromScores(evaluation.scores, skills);
  }, 0);
  return total / evaluations.length;
}

export function medianScore(values) {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
