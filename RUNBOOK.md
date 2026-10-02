# Live demo runbook

Recording scripts for the Owl Airlines multilingual voice agent. Each script is one take:
call the number, say the caller lines in order, hang up.

Every demo states the TwiML endpoint it needs. Point the phone number's incoming voice
webhook at that endpoint before recording — demos 1 and 2 use `/twiml`, demo 3 uses
`/twiml-multi`.

| Demo | Endpoint | What it shows |
| --- | --- | --- |
| 1 | `/twiml` | Switching mid-conversation, after an English exchange |
| 2 | `/twiml` | Switching on the caller's first turn |
| 3 | `/twiml-multi` | ConversationRelay detecting the language itself, no hint |

In demos 1 and 2 the caller asks in English ("German, please") and the app switches. In
demo 3 the caller just speaks the language and never asks for anything.

**The bot's answers are always:** flight `OA123`, `SFO` to `JFK`, departing `09:30`, on
time. Seat `12C`. Confirmation `OWL100`. Bag loaded on the aircraft. Flight numbers and
codes are spelled out character by character in every language.

Caller lines are given verbatim, with romanisation where the script isn't Latin and an
English gloss in parentheses.

---

# German — de-DE

## Demo 1 — switch mid-conversation · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "What is my flight status?" → tool: `get_flight_status`
- **Bot:** _flight status, in English_
- **Caller:** "German, please"
- **Bot:** _switches to German_
- **Caller:** "Wie lautet meine Sitzplatznummer?"
  _(What is my seat number?)_ → tool: `check_seat`
- **Bot:** _seat 12C, in German_

## Demo 2 — switch on first turn · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "German, please"
- **Bot:** _switches to German_
- **Caller:** "Wie ist der Status meines Fluges?"
  _(What is my flight status?)_ → tool: `get_flight_status`
- **Bot:** _flight status, in German_

## Demo 3 — automatic detection · `/twiml-multi`

- **Bot:** _welcome greeting_
- **Caller:** "Wie ist der Status meines Fluges?"
  _(What is my flight status?)_ → tool: `get_flight_status`
- **Bot:** _flight status, in German_

---

# Spanish — es-ES

## Demo 1 — switch mid-conversation · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "What is my flight status?" → tool: `get_flight_status`
- **Bot:** _flight status, in English_
- **Caller:** "Spanish, please"
- **Bot:** _switches to Spanish_
- **Caller:** "¿Cuál es mi número de asiento?"
  _(What is my seat number?)_ → tool: `check_seat`
- **Bot:** _seat 12C, in Spanish_

## Demo 2 — switch on first turn · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "Spanish, please"
- **Bot:** _switches to Spanish_
- **Caller:** "¿Cuál es el estado de mi vuelo?"
  _(What is my flight status?)_ → tool: `get_flight_status`
- **Bot:** _flight status, in Spanish_

## Demo 3 — automatic detection · `/twiml-multi`

- **Bot:** _welcome greeting_
- **Caller:** "¿Cuál es el estado de mi vuelo?"
  _(What is my flight status?)_ → tool: `get_flight_status`
- **Bot:** _flight status, in Spanish_

---

# Japanese — ja-JP

## Demo 1 — switch mid-conversation · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "What is my flight status?" → tool: `get_flight_status`
- **Bot:** _flight status, in English_
- **Caller:** "Japanese, please"
- **Bot:** _switches to Japanese_
- **Caller:** "私の座席番号は何番ですか？"
  _Watashi no zaseki bangō wa nanban desu ka?_ — (What is my seat number?) → tool: `check_seat`
- **Bot:** _seat 12C, in Japanese_

## Demo 2 — switch on first turn · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "Japanese, please"
- **Bot:** _switches to Japanese_
- **Caller:** "私のフライトの状況を教えてください。"
  _Watashi no furaito no jōkyō o oshiete kudasai._ — (Please tell me my flight status.) → tool: `get_flight_status`
- **Bot:** _flight status, in Japanese_

## Demo 3 — automatic detection · `/twiml-multi`

- **Bot:** _welcome greeting_
- **Caller:** "私のフライトの状況を教えてください。"
  _Watashi no furaito no jōkyō o oshiete kudasai._ — (Please tell me my flight status.) → tool: `get_flight_status`
- **Bot:** _flight status, in Japanese_

---

# Bengali — bn-IN

Demos 1 and 2 only. Bengali has no demo 3: automatic detection needs ElevenLabs for TTS,
and ElevenLabs has no Bengali voice. In manual mode Bengali speaks through Google and
listens through Deepgram, which is why it works there.

## Demo 1 — switch mid-conversation · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "What is my flight status?" → tool: `get_flight_status`
- **Bot:** _flight status, in English_
- **Caller:** "Bengali, please"
- **Bot:** _switches to Bengali_
- **Caller:** "আমার সিট নম্বর কী?"
  _Aamaar seat nombor ki?_ — (What is my seat number?) → tool: `check_seat`
- **Bot:** _seat 12C, in Bengali_

## Demo 2 — switch on first turn · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "Bengali, please"
- **Bot:** _switches to Bengali_
- **Caller:** "আমার ফ্লাইটের অবস্থা কী?"
  _Aamaar flight-er obostha ki?_ — (What is my flight status?) → tool: `get_flight_status`
- **Bot:** _flight status, in Bengali_

---

# Mandarin Chinese — cmn-CN

Demos 1 and 2 only, for the same reason as Bengali: automatic detection would need an
ElevenLabs voice, while manual mode uses Google for speech and Deepgram for listening.

## Demo 1 — switch mid-conversation · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "What is my flight status?" → tool: `get_flight_status`
- **Bot:** _flight status, in English_
- **Caller:** "Mandarin, please"
- **Bot:** _switches to Mandarin_
- **Caller:** "我的座位号是多少？"
  _Wǒ de zuòwèi hào shì duōshǎo?_ — (What is my seat number?) → tool: `check_seat`
- **Bot:** _seat 12C, in Mandarin_

## Demo 2 — switch on first turn · `/twiml`

- **Bot:** _welcome greeting_
- **Caller:** "Mandarin, please"
- **Bot:** _switches to Mandarin_
- **Caller:** "我的航班状态如何？"
  _Wǒ de hángbān zhuàngtài rúhé?_ — (What is my flight status?) → tool: `get_flight_status`
- **Bot:** _flight status, in Mandarin_

---

# When a take goes wrong

**The bot replies in English after you asked to switch.** Detection returned nothing. Say
the language name on its own ("German, please") rather than burying it in a sentence. The
server log shows `No language switch detected` for that turn.

**Nothing happens after you switched language.** The most likely cause, and the one to
expect in demos 1 and 2: a switch changes the transcriber as well as the voice, so after
switching to German the call is listening for German only. If your follow-up is in
English, there may be no transcript at all and the app never sees the turn. Say the
follow-up in the target language, as scripted. Confirm by checking whether the log shows a
`Caller said` line for that turn — no line means no transcript arrived.

**It switched to the wrong variant** (`en-GB` instead of `en-US`, `es-US` instead of
`es-ES`). Both are declared and both work; name the variety if a take needs a specific one
("British English, please").

**The call drops right after connecting.** ConversationRelay rejected the TwiML. Check the
Twilio Console under Monitor → Logs for error 64101 and a `provider/language/setting`
message — that names which language and setting it refused.

**The bot looks something up you didn't ask for.** Shouldn't happen, but if a take shows a
`get_reservation` call after a bare language request, re-record; it's the model's
discretion, not a config problem.

**Watching the log while recording.** The server prints one line per turn: `Caller said`
with the transcript, `Caller language switch detected` with from and to, `Sending switch
language message`, then `LLM tool call` and the response. A clean demo 1 take shows a
switch line exactly once.
