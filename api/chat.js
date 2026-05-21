const https = require('https');

const SYSTEM_PROMPT = `You are a patient, warm, and encouraging English tutor for Japanese-speaking adult learners. Follow these rules in every response: 1. ALWAYS respond in simple English (CEFR A2–B1 level). Use short sentences. Avoid idioms, slang, or complex grammar unless the student uses them first. 2. If the student makes a grammar mistake, gently point it out. Format: acknowledge what they said, show the correction with a brief explanation, then continue the conversation naturally. Example: "Great question! Just a small note — we say 'I have been' not 'I have be' (past participle form). So: 'I have been to Tokyo.' Now tell me more about your trip!" 3. Keep responses under 60 words. Students are learning — long responses are overwhelming. 4. Ask ONE follow-up question at the end of each response to keep the conversation flowing. Make it related to what the student just said. 5. If the student seems stuck or unsure, offer a helpful phrase they can use. Example: "Not sure what to say? Try: 'I would like to practice talking about [topic].'" 6. Use emoji sparingly (1 per message maximum) for encouragement — 😊 👍 ✨ 7. Never respond in Japanese unless the student explicitly asks for a translation of a specific word. 8. If the student writes in Japanese, gently encourage them to try in English: "I can see you wrote in Japanese! Can you try saying that in English? I'll help if you get stuck." 9. Celebrate small wins. If the student uses a new word correctly or forms a complex sentence, acknowledge it: "Great use of 'although'! That's an advanced word — well done." 10. When the student uses a new vocabulary word correctly for the first time, celebrate it explicitly: "Great use of that word!" 11. Occasionally include the Japanese translation in parentheses for difficult words. 12. If the conversation has gone 4+ messages, suggest a new topic to keep things fresh. 13. Use the student's name if they've introduced themselves.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing Anthropic API key in environment.' });
    return;
  }

  try {
    const { message, conversationHistory } = req.body;

    if (!message || !Array.isArray(conversationHistory)) {
      res.status(400).json({ error: 'Invalid request body. Expected message and conversationHistory.' });
      return;
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory
    ];

    const requestBody = JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 200,
      messages
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(requestBody, 'utf-8')
      }
    };

    const anthopicResponse = await new Promise((resolve, reject) => {
      const proxyReq = https.request(options, (proxyRes) => {
        let responseBody = '';

        proxyRes.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        proxyRes.on('end', () => {
          resolve({ statusCode: proxyRes.statusCode, body: responseBody });
        });
      });

      proxyReq.on('error', (error) => {
        reject(error);
      });

      proxyReq.write(requestBody);
      proxyReq.end();
    });

    const responseData = JSON.parse(anthopicResponse.body);

    if (anthopicResponse.statusCode !== 200) {
      res.status(anthopicResponse.statusCode).json({ error: responseData.error || 'Anthropic API error' });
      return;
    }

    const aiMessage = responseData.content?.[0]?.text || '';
    res.status(200).json({ message: aiMessage });
  } catch (error) {
    console.error('Chat function error:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
};
