export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (method === "OPTIONS") return new Response(null, { headers });

  if (method === "POST") {
    try {
      const { username, action } = await request.json();
      if (!username || !['login','logout'].includes(action))
        return Response.json({ error: "invalid" }, { status: 400, headers });
      const ua = (request.headers.get('User-Agent') || '').slice(0, 300);
      await env.DB.prepare(
        "INSERT INTO activity_logs (username, action, user_agent) VALUES (?, ?, ?)"
      ).bind(username, action, ua).run();
      return Response.json({ success: true }, { headers });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers });
    }
  }

  if (method === "GET") {
    try {
      const { results: logs } = await env.DB.prepare(
        "SELECT id, username, action, timestamp, user_agent FROM activity_logs ORDER BY id DESC LIMIT 400"
      ).all();
      return Response.json({ logs }, { headers });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers });
    }
  }

  return Response.json({ error: "method not supported" }, { status: 405, headers });
}
