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

    var models = [
      'mistralai/mistral-7b-instruct:free',
      'google/gemma-3-12b-it:free',
      'google/gemma-3-4b-it:free',
      'google/gemma-3-1b-it:free',
      'qwen/qwen3-8b:free',
      'qwen/qwen3-4b:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'meta-llama/llama-3.2-1b-instruct:free',
      'deepseek/deepseek-r1-distill-qwen-14b:free',
      'microsoft/phi-3-mini-128k-instruct:free'
    ];

    var results = [];
    for (var mi = 0; mi < models.length; mi++) {
      try {
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
        console.log('Model:', models[mi], '| HTTP:', response.status, '| error:', data.error ? JSON.stringify(data.error).substring(0,100) : 'none');
        results.push(models[mi] + ':' + response.status);

        if (response.status === 429 || (data.error && (data.error.code === 429 || data.error.code === 'rate_limit'))) {
          continue;
        }

        if (data.error) {
          continue;
        }

        var text = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          text = data.choices[0].message.content || '';
        }

        if (text && text.trim()) {
          console.log('SUCCESS with model:', models[mi]);
          return res.status(200).json({
            content: [{ type: 'text', text: text }]
          });
        }
      } catch(e) {
        console.log('Model', models[mi], 'threw:', e.message);
        continue;
      }
    }

    console.log('All models failed. Results:', results.join(', '));
    return res.status(200).json({
      content: [{ type: 'text', text: 'Todos os modelos gratuitos estão sobrecarregados no momento. Tente novamente em 1 minuto. (Resultados: ' + results.join(', ') + ')' }]
    });

  } catch (err) {
    console.error('Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
