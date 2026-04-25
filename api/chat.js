module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });

  try {
    var body = req.body;
    var messages = Array.isArray(body.messages) ? body.messages : [];
    var systemPrompt = body.system || '';

    var cleanMessages = [];
    if (systemPrompt.trim()) {
      cleanMessages.push({ role: 'system', content: systemPrompt.trim() });
    }
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m && m.role && m.content && m.content.trim()) {
        cleanMessages.push({ role: m.role, content: m.content.trim() });
      }
    }
    if (cleanMessages.length === 0) return res.status(400).json({ error: 'No messages' });

    // Try multiple free models in order until one works
    var models = [
      'mistralai/mistral-7b-instruct:free',
      'google/gemma-3-12b-it:free',
      'qwen/qwen3-8b:free',
      'meta-llama/llama-3.2-3b-instruct:free'
    ];

    var lastError = null;
    for (var mi = 0; mi < models.length; mi++) {
      var response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': 'https://crono-estudo.vercel.app',
          'X-Title': 'CronoEstudo'
        },
        body: JSON.stringify({
          model: models[mi],
          messages: cleanMessages,
          max_tokens: 1024
        })
      });

      var data = await response.json();
      console.log('Model:', models[mi], 'Status:', response.status);

      if (response.status === 429 || (data.error && data.error.code === 429)) {
        lastError = data.error;
        continue; // try next model
      }

      if (data.error) {
        console.log('Error:', JSON.stringify(data.error));
        lastError = data.error;
        continue;
      }

      var text = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        text = data.choices[0].message.content || '';
      }

      if (!text) { lastError = 'empty response'; continue; }

      return res.status(200).json({
        content: [{ type: 'text', text: text }]
      });
    }

    // All models failed
    return res.status(200).json({
      content: [{ type: 'text', text: 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.' }]
    });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
