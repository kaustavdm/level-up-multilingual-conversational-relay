# Multilingual voice agent on ConversationRelay

An Owl Airlines phone agent that handles a caller switching language mid-call. Two
language-switching strategies, one TwiML endpoint each.

## Setup

1. Install Node.js LTS, then `npm install`.
2. `cp .env.example .env` and fill in: Twilio Account SID, a Twilio API Key SID and
   secret, and an OpenAI API key. `MODEL` is optional (default `gpt-5-nano`).
3. `node server.js` — listens on `PORT`, default 3000.
4. Expose it: `ngrok http 3000`.
5. Point your Twilio number's incoming voice webhook at `https://<your-domain>/twiml`.

## Layout

| Path | What it does |
| --- | --- |
| `server.js` | Fastify setup, env validation, `/health` |
| `routes/twiml.js` | The two TwiML endpoints |
| `routes/websocket.js` | ConversationRelay protocol: `setup`, `prompt`, `interrupt` |
| `services/llm.js` | Agent turn, tools, and language detection |
| `services/languages.js` | The supported-language list |
| `services/airline-data.js` | Fake reservation data |
| `scripts/ws-smoke.js` | Smoke test |

## The two modes

| Endpoint | Switching | How |
| --- | --- | --- |
| `/twiml` | Manual | The app detects the language and sends a switch language message. |
| `/twiml-multi` | Automatic | `language="multi"`. Deepgram detects, ElevenLabs speaks it back. The app does nothing. |

Each endpoint passes its mode to the WebSocket server as `<Parameter name="languageMode">`,
which arrives in the `setup` message as `customParameters`. Manual detection runs only in
`manual` mode — under `multi` it would fight ConversationRelay's own detection.

## Manual detection

`detectCallerLanguage` in `services/llm.js` takes the caller's transcript and the active
language, and returns a code to switch to or `null`. On a switch the server sends:

```json
{ "type": "language", "ttsLanguage": "hi-IN", "transcriptionLanguage": "hi-IN" }
```

Two things make it work on a live call:

- **It runs concurrently with the agent turn.** Detection takes ~1s, about the same as the
  turn's time to first token, so in parallel it costs no measurable latency. Every small
  model tested (`gpt-5-nano`, `gpt-4.1-nano`, `gpt-4o-mini`) lands near 1s — the round-trip
  dominates, so a different model won't help.
- **The switch is sent before any speech.** A language message applies to future TTS and
  STT, so one sent after the first token leaves the current reply in the old language. The
  first text token awaits the detection result.

Detection failures are logged and ignored; the call stays in its current language.

Because the agent turn runs at the same time, its system prompt tells the model to call a
tool only when the answer needs that data — otherwise "can you speak German" triggers an
unprompted `get_reservation`.

**A caller who just starts speaking another language usually won't be heard.** The
transcriber runs in the active language only, so Google STT on `en-US` finds no final
transcript for Hindi speech and ConversationRelay sends no `prompt` at all. Detection can
only act on transcripts that arrive, so a manual-mode caller has to ask in something the
active transcriber can pick up ("Hindi, please"). For any language from the first word,
use `/twiml-multi`.

## Languages and providers

`services/languages.js` is the single source of truth: `/twiml` generates one `<Language>`
child per entry and the detector only accepts codes from that same list, so they cannot
drift apart. That matters because switching to a language that was not declared makes
ConversationRelay error and end the call.

Each entry has a `code`, a `name` (shown to the detector so "German" maps to `de-DE`), and
optionally `ttsProvider`, `voice`, `transcriptionProvider` and `speechModel`, which
override the parent `<ConversationRelay>`:

```js
{ code: "hi-IN", name: "Hindi" }   // inherits the parent's providers
{ code: "bn-IN", name: "Bengali", ttsProvider: "Google", voice: "bn-IN-Chirp3-HD-Charon",
  transcriptionProvider: "Deepgram", speechModel: "nova-3-general" }
```

Currently `en-US`, `en-IN`, `en-GB`, `de-DE`, `ja-JP`, `hi-IN`, `ta-IN`, `te-IN`, `ml-IN`,
`kn-IN`, `bn-IN`, `cmn-CN`.

### Choosing providers

ConversationRelay validates TTS and STT **separately**, each against that provider's own
inventory. So one language can need Google to speak and Deepgram to listen — which is
exactly what Bengali needs:

| | Bengali | Mandarin |
| --- | --- | --- |
| ElevenLabs TTS | not supported | supported |
| Google TTS | `bn-IN-Chirp3-HD-Charon` | `cmn-CN-Wavenet-A` |
| Google STT | rejected on every speech model | `chirp` models only, as `cmn-Hans-CN` |
| Deepgram STT | `nova-3-general` | `nova-3-general` |

ElevenLabs is the default TTS provider and has no Bengali — ConversationRelay can only
select its Flash and Turbo models, none of which cover it. Mandarin uses the same
Google + Deepgram pair for consistency, though ElevenLabs would work for its TTS.

Two naming traps: Twilio writes Mandarin as `cmn-CN` (`zh-CN` is not in its TTS inventory
at all), and names Deepgram's `nova-3` as `nova-3-general`.

Invalid combinations error as `provider/language/setting` —
`block_elevenlabs/bn-IN/WiaIVvI1gDL4vT4y7qUU` for a voice, `google/bn-IN/long` for a
speech model. Watching which segment changes between attempts tells you which half is
still wrong.

Inventories: [Twilio TTS voices](https://www.twilio.com/docs/voice/twiml/say/text-speech)
(Google, Amazon) · [Picking a voice](https://www.twilio.com/docs/voice/conversationrelay/voice-configuration)
(ElevenLabs, per-language defaults) · [Deepgram languages](https://developers.deepgram.com/docs/models-languages-overview)

## Testing

`scripts/ws-smoke.js` stands in for Twilio: it connects to `/ws`, sends the `setup` and
`prompt` messages ConversationRelay would send, and checks a switch language message
arrives before any speech. It makes real model calls, so the server needs a valid
`OPENAI_API_KEY`.

```sh
node server.js            # one terminal
node scripts/ws-smoke.js  # another
```

Cases: asking for Hindi (expects `hi-IN`), asking for German in a full sentence and by
name alone (expects `de-DE`), staying in English (no switch), and `multi` mode (the app
must not switch at all).

For a server on another port, set both: `PORT=3917 node server.js` and
`WS_URL=ws://127.0.0.1:3917/ws node scripts/ws-smoke.js`.
