export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'GROQ_API_KEY is not set on the server.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid JSON body.' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages } = body;
  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: { message: 'messages array is required.' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      stream: true,
      messages,
    }),
  });

  if (!groqResponse.ok) {
    const err = await groqResponse.json().catch(() => ({}));
    return new Response(JSON.stringify(err), {
      status: groqResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pipe Groq's SSE stream directly to the client
  return new Response(groqResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
};
