/**
 * Coaching-note generator.
 *
 * Uses Firebase AI Logic + Gemini.
 * Falls back to a local draft if AI is unavailable.
 */

import { firebaseApp } from "./firebase";

/**
 * ---------------------------------------------------------
 * Local fallback
 * ---------------------------------------------------------
 */
function localDraft({
  playerName,
  sportName,
  skill,
  score,
  existingNote,
  evaluationType,
}) {
  const name =
    (playerName || "").trim() || "This player";

  const label =
    skill?.label || "this skill";

  const hint =
    (skill?.hint || "this skill").toLowerCase();

  const n = Number(score || 0);

  const scoreText = n.toFixed(1);

  let observation;
  let plan;

  if (n < 40) {
    observation =
      `${name}'s ${label} at ${scoreText} is an early-stage gap for ${
        sportName || "this sport"
      }.`;

    plan =
      `Start with isolated ${hint} reps, then add one live look per session.`;

  } else if (n < 55) {
    observation =
      `${name} is building ${label} (${scoreText}) but it is not yet consistent under pressure.`;

    plan =
      `Keep ${hint} as the daily focus and film one clip to review with the player.`;

  } else if (n < 70) {
    observation =
      `${name} shows usable ${label} at ${scoreText}; the next step is repeatability in ${
        evaluationType || "this evaluation"
      } settings.`;

    plan =
      `Raise tempo on ${hint} and ask the player to explain their decision after each rep.`;

  } else if (n < 85) {
    observation =
      `${label} is a relative strength for ${name} (${scoreText}) and can travel into games if the details stay sharp.`;

    plan =
      `Use competitive ${hint} reps and give the player a leadership cue for teammates.`;

  } else {
    observation =
      `${name} is performing ${label} at an advanced ${scoreText} level for ${
        sportName || "this sport"
      }.`;

    plan =
      `Protect the standard on ${hint} and add a harder constraint (time, space, or defender).`;
  }

  const refine = existingNote?.trim()
    ? ` Coach note to keep: ${existingNote.trim()}`
    : "";

  return `${observation} ${plan}${refine}`;
}

/**
 * ---------------------------------------------------------
 * Generate AI Coaching Feedback
 * ---------------------------------------------------------
 */
export async function makeAIAssistFeedback({
  playerName,
  sportName,
  skill,
  score,
  existingNote,
  evaluationType,
}) {
  /**
   * -------------------------------------------------------
   * Build prompt
   * -------------------------------------------------------
   */
  const prompt = [
    "You are an experienced youth sports coach writing a unique evaluation note.",

    "Write 2-4 sentences specific to this player, sport, skill, and score.",

    "Do not use generic filler that could apply to anyone.",

    "Explain what the player is doing well or what they need to improve.",

    "Give one practical coaching recommendation.",

    "Use constructive, professional and encouraging language.",

    "Do not include a title.",

    "Do not use bullet points.",

    "Do not include quotation marks.",

    `Sport: ${sportName || "unknown"}`,

    `Player: ${playerName || "the player"}`,

    `Evaluation type: ${evaluationType || "evaluation"}`,

    `Skill: ${skill?.label || "overall"}`,

    skill?.hint
      ? `Skill focus: ${skill.hint}`
      : "",

    `Score out of 100: ${Number(score || 0).toFixed(1)}`,

    existingNote
      ? `Coach's existing notes to refine: ${existingNote}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError = null;

  try {
    /**
     * -----------------------------------------------------
     * Firebase AI Logic
     * -----------------------------------------------------
     */
    const {
      getAI,
      getGenerativeModel,
      GoogleAIBackend,
    } = await import("firebase/ai");

    /**
     * IMPORTANT:
     *
     * App Check is already initialized in firebase.js.
     * Do NOT initialize App Check again here.
     */
    const ai = getAI(firebaseApp, {
      backend: new GoogleAIBackend(),

      /**
       * Use limited-use App Check tokens.
       */
      useLimitedUseAppCheckTokens: true,
    });

    /**
     * -----------------------------------------------------
     * Gemini model
     * -----------------------------------------------------
     */
    const model = getGenerativeModel(ai, {
      model: "gemini-3.7-flash",
    });

    /**
     * -----------------------------------------------------
     * Generate content
     * -----------------------------------------------------
     */
    const result =
      await model.generateContent(prompt);

    /**
     * -----------------------------------------------------
     * Extract response text
     * -----------------------------------------------------
     */
    const text =
      result?.response?.text?.()?.trim();

    /**
     * -----------------------------------------------------
     * Successful AI response
     * -----------------------------------------------------
     */
    if (text) {
      return {
        text,
        fromAI: true,
        reason: null,
      };
    }

    throw new Error(
      "Gemini returned an empty response."
    );

  } catch (error) {
    lastError = error;

    console.error(
      "Firebase Gemini AI Error:",
      error
    );
  }

  /**
   * ---------------------------------------------------------
   * Local fallback
   * ---------------------------------------------------------
   */
  const draft = localDraft({
    playerName,
    sportName,
    skill,
    score,
    existingNote,
    evaluationType,
  });

  const reason =
    lastError?.message ||
    lastError?.code ||
    "Gemini AI request failed.";

  return {
    text: draft,
    fromAI: false,
    reason,
  };
}