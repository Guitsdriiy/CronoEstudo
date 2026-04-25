module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not set' });

  try {
    var body = req.body;

    // Log para debug
    console.log('Messages count:', body.messages ? body.messages.length : 0);

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: body.system || '',
        messages: body.messages || []
      })
    });

    var text = await response.text();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic response:', text.substring(0, 200));

    try {
      var data = JSON.parse(text);
      return res.status(200).json(data);
    } catch(e) {
      return res.status(500).json({ error: 'Invalid JSON from Anthropic', raw: text.substring(0, 300) });
    }

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
};
