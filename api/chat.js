module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    var body = req.body;
    var messages = Array.isArray(body.messages) ? body.messages : [];
    var systemPrompt = body.system || '';
    var contents = [];

    if (systemPrompt.trim()) {
      contents.push({ role: 'user', parts: [{ text: 'INSTRUÇÕES DO SISTEMA:\n' + systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Entendido. Seguirei todas as instruções.' }] });
    }

    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (!m || !m.role || !m.content || !m.content.trim()) continue;
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
    }

    if (contents.length === 0) return res.status(400).json({ error: 'No valid messages' });

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents, generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } })
    });

    var data = await response.json();
    console.log('Gemini status:', response.status, JSON.stringify(data).substring(0, 200));

    if (data.error) return res.status(200).json({ error: data.error });

    var text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      text = data.candidates[0].content.parts[0].text || '';
    }

    return res.status(200).json({ content: [{ type: 'text', text: text }] });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};