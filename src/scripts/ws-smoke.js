// Smoke test for language detection over the ConversationRelay WebSocket protocol.
//
// Stands in for Twilio: connects to /ws, sends a setup message with the custom parameters
// the TwiML would have supplied, sends a prompt, and prints the frames the server sends
// back. Checks that a switch language message arrives before any speech.
//
// Start the server first (node server.js), then:
//   node scripts/ws-smoke.js
//   node scripts/ws-smoke.js multi "Kya aap Hindi mein baat kar sakte hain?"
//
// Needs OPENAI_API_KEY in the server's environment — it makes real model calls.

import WebSocket from "ws";

const URL = process.env.WS_URL || "ws://127.0.0.1:3000/ws";

const CASES = [
  {
    name: "manual mode, caller asks for Hindi",
    languageMode: "manual",
    startLanguage: "en-US",
    voicePrompt: "Kya aap Hindi mein baat kar sakte hain?",
    expectLanguage: "hi-IN",
  },
  {
    name: "manual mode, caller asks for German",
    languageMode: "manual",
    startLanguage: "en-US",
    voicePrompt: "Can you speak in German, please?",
    expectLanguage: "de-DE",
  },
  {
    name: "manual mode, caller names only the language",
    languageMode: "manual",
    startLanguage: "en-US",
    voicePrompt: " German, please.",
    expectLanguage: "de-DE",
  },
  {
    name: "manual mode, caller stays in English",
    languageMode: "manual",
    startLanguage: "en-US",
    voicePrompt: "Hi, can you tell me the status of my flight?",
    expectLanguage: null,
  },
  {
    name: "multi mode, app must not switch language itself",
    languageMode: "multi",
    startLanguage: "multi",
    voicePrompt: "Kya aap Hindi mein baat kar sakte hain?",
    expectLanguage: null,
  },
];

// Runs one case and resolves with the frames received, in order.
function runCase({ languageMode, startLanguage, voicePrompt }) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(URL);
    const frames = [];
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("timed out after 30s waiting for the final text frame"));
    }, 30000);

    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "setup",
          sessionId: "VX00000000000000000000000000000000",
          callSid: `CA${Date.now()}`,
          from: "+18005550100",
          to: "+18005550101",
          direction: "inbound",
          callStatus: "IN-PROGRESS",
          customParameters: { languageMode, startLanguage },
        }),
      );
      socket.send(JSON.stringify({ type: "prompt", voicePrompt, lang: startLanguage, last: true }));
    });

    socket.on("message", (data) => {
      const frame = JSON.parse(data);
      frames.push(frame);
      if (frame.type === "text" && frame.last) {
        clearTimeout(timer);
        socket.close();
        resolve(frames);
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

let failures = 0;

for (const testCase of CASES) {
  process.stdout.write(`\n${testCase.name}\n`);

  let frames;
  try {
    frames = await runCase(testCase);
  } catch (error) {
    console.error(`  FAIL  ${error.message}`);
    failures += 1;
    continue;
  }

  const languageFrameIndex = frames.findIndex((f) => f.type === "language");
  const firstSpokenIndex = frames.findIndex((f) => f.type === "text" && f.token);
  const languageFrame = languageFrameIndex === -1 ? null : frames[languageFrameIndex];
  const spoken = frames
    .filter((f) => f.type === "text")
    .map((f) => f.token)
    .join("");

  console.log(`  language frame: ${languageFrame ? JSON.stringify(languageFrame) : "none"}`);
  console.log(`  reply: ${spoken}`);

  if (testCase.expectLanguage === null) {
    if (languageFrame) {
      console.error(`  FAIL  expected no language switch, got ${languageFrame.ttsLanguage}`);
      failures += 1;
      continue;
    }
    console.log("  PASS  no language switch, as expected");
    continue;
  }

  if (!languageFrame) {
    console.error(`  FAIL  expected a switch to ${testCase.expectLanguage}, got none`);
    failures += 1;
    continue;
  }

  if (
    languageFrame.ttsLanguage !== testCase.expectLanguage ||
    languageFrame.transcriptionLanguage !== testCase.expectLanguage
  ) {
    console.error(
      `  FAIL  expected ${testCase.expectLanguage} for tts and transcription, got ` +
        `${languageFrame.ttsLanguage} and ${languageFrame.transcriptionLanguage}`,
    );
    failures += 1;
    continue;
  }

  // The switch has to precede the speech it applies to, or the reply is spoken in the
  // language the caller just moved away from.
  if (firstSpokenIndex !== -1 && languageFrameIndex > firstSpokenIndex) {
    console.error("  FAIL  language frame arrived after speech had already started");
    failures += 1;
    continue;
  }

  console.log(`  PASS  switched to ${testCase.expectLanguage} before speaking`);
}

console.log(`\n${failures === 0 ? "All cases passed" : `${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
