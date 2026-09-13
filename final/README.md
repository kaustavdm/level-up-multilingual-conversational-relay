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