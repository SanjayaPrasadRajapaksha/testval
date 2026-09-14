import type { Evaluation, Skill } from "./types";

export function defaultScores(skills: Skill[], value = 50): Record<string, number> {
  return Object.fromEntries(skills.map((skill) => [skill.id, value]));
}

export function defaultSkillNotes(skills: Skill[]): Record<string, string> {
  return Object.fromEntries(skills.map((skill) => [skill.id, ""]));
}

export function averageFromScores(scores: Record<string, number> | undefined, skills: Skill[]): number {
  if (!skills.length) return 0;
  const total = skills.reduce((sum, skill) => sum + Number(scores?.[skill.id] || 0), 0);
  return total / skills.length;
}

export function averageScore(evaluations: Evaluation[] | undefined, skills: Skill[]): number {
  if (!evaluations?.length || !skills.length) return 0;
  const total = evaluations.reduce((sum, evaluation) => {
    if (evaluation.overallScore != null) return sum + Number(evaluation.overallScore);
    return sum + averageFromScores(evaluation.scores, skills);
  }, 0);
  return total / evaluations.length;
}

export function medianScore(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}
