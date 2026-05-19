export function getFollowUpDisplayCopy(questionId: string, fallbackPrompt: string) {
  const copy: Record<string, { title: string; helper: string }> = {
    evdb_label_closeup: {
      title: "Upload a clearer EVDB close-up",
      helper: "Make MCB/RCCB ratings, RCCB type, and pole count readable.",
    },
    charger_identity_closeup: {
      title: "Upload the charger label clearly",
      helper: "Include serial number and brand/model if visible.",
    },
    photo_request: {
      title: "Upload a photo to continue",
      helper: "Show the charger, EVDB, or isolator involved.",
    },
    clear_theme2_photo: {
      title: "Retake the photo more clearly",
      helper: "Use good lighting and include the relevant component.",
    },
    charger_app_screenshot: {
      title: "Add the app error screenshot",
      helper: "This helps confirm red-light or blinking-red cases when available.",
    },
    red_light_flash_count: {
      title: "How many times does the red light flash?",
      helper: "Choose a count or select not sure.",
    },
    isolator_switch_state: {
      title: "Confirm the isolator switch position",
      helper: "Upload a clearer photo and optionally choose ON/OFF.",
    },
  };

  if (copy[questionId]) return copy[questionId];

  const match = fallbackPrompt.match(/^(.*?[.?!])\s+(.*)$/);
  if (match) return { title: match[1], helper: match[2] };
  return {
    title: fallbackPrompt,
    helper: "Please provide the clearest evidence available.",
  };
}
