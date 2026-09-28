# Setting up the demo code

- Install Node.js latest LTS
- Then, in the `final/` directory (current dir):
- Run `npm install`
- `cp .env.example .env` and update values. You will need:
    - Twilio Account SID
    - Create a Twilio API Key and provide the API Key SID and Client Secret
    - Create an OpenAI API key
- Start the server: `node server.js`
- For local run:
    - Setup `ngrok` to forward to port `3000`
    - Setup dev-phone
- Get a Twilio phone number and configure the phone number's incoming voice webhook to go to: `https:<domain-or-nrok-domain>/twiml`

# Language handling

The demo shows two ways of handling a multi-lingual caller, one per TwiML endpoint. Point
the phone number's incoming voice webhook at whichever one you want to demo.

| Endpoint | Language switching | How |
| --- | --- | --- |
| `/twiml` | Automatic | `language="multi"` on `<ConversationRelay>`. Deepgram detects the spoken language, ElevenLabs speaks it back. The app does nothing. |
| `/twiml-alt` | Manual | The app detects the caller's language and sends a switch language message over the WebSocket. |

Each endpoint tells the WebSocket server which mode it is in via `<Parameter name="languageMode">`,
which arrives in the `setup` message as `customParameters`. Manual detection only runs in
`manual` mode — running it under `multi` would fight ConversationRelay's own detection.

## Manual detection

`detectCallerLanguage` in `services/llm.js` reads the `prompt` message's `voicePrompt` and
`lang` and returns a language code to switch to, or `null` to stay put. It handles both a
caller explicitly asking ("can you talk in Hindi", "Kya aap Hindi mein baat kar sakte
hain?") and a caller simply switching — including romanized transcripts, which is what you
get when the transcriber is running in a different language than the one being spoken.

On a switch the server sends:

```json
{ "type": "language", "ttsLanguage": "hi-IN", "transcriptionLanguage": "hi-IN" }
```

Two things make this work on a live call:

- **It runs concurrently with the LLM turn.** The detection call takes roughly 1 second on
  its own — about the same as the main turn's time to first token — so running the two in
  parallel adds no measurable latency to the reply. Every small model tested (`gpt-5-nano`,
  `gpt-4.1-nano`, `gpt-4o-mini`) lands near 1 second; the API round-trip dominates, so
  changing model does not make this meaningfully faster.
- **The switch is sent before any speech.** ConversationRelay applies a language message to
  future TTS and STT, so a switch sent after the first token would leave the current reply
  spoken in the old language. The first text token awaits the detection result.

Detection failures are logged and ignored — the call continues in its current language.

## Supported languages

`SUPPORTED_LANGUAGES` in `services/llm.js` is the allow-list, and a detected code outside it
is discarded. It must stay in sync with the `<Language>` children on the `/twiml-alt`
`<ConversationRelay>` noun: switching to a language that was not declared there makes
ConversationRelay raise an error and end the call.

Currently: `en-US`, `en-IN`, `en-GB`, `hi-IN`, `zh`, `ja-JP`, `bn-IN`, `ta-IN`, `te-IN`,
`kn-IN`, `cmn-CN`.

# Testing language detection

`scripts/ws-smoke.js` stands in for Twilio: it connects to `/ws`, sends the `setup` and
`prompt` messages ConversationRelay would send, and checks that a switch language message
arrives before any speech. It makes real model calls, so the server needs a valid
`OPENAI_API_KEY`.

```
node server.js          # in one terminal
node scripts/ws-smoke.js
```

It covers a caller asking for Hindi (expects a switch to `hi-IN`), a caller staying in
English (expects no switch), and `multi` mode (expects the app not to switch at all).