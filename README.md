# Multilingual Voice AI with Twilio Conversation Relay

This repo contains the code and demo content for Twilio Level Up webinar for Q4 2026. The topic is multilingual voice AI built with Twilio Conversation Relay.

---

## Webinar details

**Title:** "One Agent, Many Languages: Architecting Multi-Lingual Voice AI"

**Abstract:**

Your customers don't all speak the same language — so how do you build a single voice AI agent that greets a caller in one language, gracefully switches mid-call, and stays coherent throughout?

In this Level Up webinar, we'll build and unpack the architecture behind multi-lingual voice AI on Twilio ConversationRelay. We'll cover language detection strategies, choosing the right STT and TTS provider stack, handling mid-call language switching, and the prompt patterns that keep an LLM-driven agent grounded when the conversation crosses languages.

You'll leave knowing how to: 

- Detect caller language and switch in real time using Twilio ConversationRelay 
- Choose the right STT and TTS provider stack for your target languages
- Structure prompts and context so your agent stays coherent across language switches
- Design fallbacks for unsupported languages and uncertain detection

---

## Repository contents

This repo is split into two applications.

- [`./final/`](final/): The `final/` directory contains the full demo application. You can run it right away and test it by setting up the `final/.env` file based on [`final/.env.example`](final/.env.example).
- [`./build/`](build/): The `build/` directory contains the baseline application, minus the parts edited during live demo.
- [`RUNBOOK.md`](RUNBOOK.md): The `RUNBOOK.md` at the root of the repo contains live demo instructions, such that when following RUNBOOK.md end to end and applying the edits to `build/` you will end up with the equivalent application in `final/`.
