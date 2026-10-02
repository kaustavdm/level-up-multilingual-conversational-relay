// Languages a manual-mode call can switch to. This list is the single source of truth:
// routes/twiml.js declares one <Language> child per entry on the manual-mode
// ConversationRelay noun, and detectCallerLanguage in services/llm.js only accepts codes
// from it. ConversationRelay errors and drops the call when sent a switch to a language
// that was not declared, so the TwiML and the detector must never disagree.
//
// Each entry has:
//   code  BCP-47 code, sent as both ttsLanguage and transcriptionLanguage on a switch.
//   name  Shown to the detection model next to the code so it can map a spoken request
//         ("can you speak German") to the right code. Not rendered into TwiML.
//   Any of LANGUAGE_TWIML_ATTRIBUTES, rendered onto that language's <Language> noun. They
//   override the matching attributes on the parent <ConversationRelay>; omit them to
//   inherit the parent's providers and the provider's default voice.
export const LANGUAGE_TWIML_ATTRIBUTES = [
  "transcriptionProvider",
  "speechModel",
  "ttsProvider",
  "voice",
];

export const LANGUAGES = [
  { code: "en-US", name: "English (United States)" },
  { code: "en-IN", name: "English (India)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "de-DE", name: "German" },
  { code: "ja-JP", name: "Japanese" },
  { code: "hi-IN", name: "Hindi" },
  { code: "ta-IN", name: "Tamil" },
  { code: "te-IN", name: "Telugu" },
  { code: "ml-IN", name: "Malayalam" },
  { code: "kn-IN", name: "Kannada" },
  // Bengali and Mandarin are the two languages that need every attribute spelled out,
  // because neither provider default covers them:
  //   TTS  ElevenLabs is the parent default, and its Flash v2.5 model (the only non-English
  //        model ConversationRelay can select) has no Bengali. Bengali needs Google. Google
  //        writes Mandarin as cmn-*, so cmn-CN rather than zh-CN.
  //   STT  Google's ConversationRelay integration rejects bn-IN on every speech model, so
  //        Bengali needs Deepgram, whose nova-3 covers it. nova-3-general is Twilio's name
  //        for that model.
  // Chirp3-HD is Google's generative tier, the most conversational of its voices.
  { code: "bn-IN", name: "Bengali", ttsProvider: "Google", voice: "bn-IN-Chirp3-HD-Charon", transcriptionProvider: "Deepgram", speechModel: "nova-3-general" },
  { code: "cmn-CN", name: "Mandarin Chinese", ttsProvider: "Google", voice: "cmn-CN-Wavenet-A", transcriptionProvider: "Deepgram", speechModel: "nova-3-general" },
];

export const SUPPORTED_LANGUAGES = LANGUAGES.map(({ code }) => code);
