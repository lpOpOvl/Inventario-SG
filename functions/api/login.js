async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return Response.json({ error: "método não suportado" }, { status: 405, headers });

  try {
    const { username, password } = await request.json();
    if (!username || !password) return Response.json({ error: "Preenche todos os campos." }, { status: 400, headers });

    const player = await env.DB.prepare("SELECT id, username, password, created_at FROM players WHERE username = ?").bind(username).first();
    if (!player) return Response.json({ error: "Username não encontrado." }, { status: 401, headers });

    const hashed = await hashPassword(password);
    if (player.password !== hashed) return Response.json({ error: "Password incorreta." }, { status: 401, headers });

    try {
      const ua = (request.headers.get('User-Agent') || '').slice(0, 300);
      await env.DB.prepare("INSERT INTO activity_logs (username, action, user_agent) VALUES (?, 'login', ?)").bind(username, ua).run();
    } catch {}
    return Response.json({ success: true, player: { id: player.id, username: player.username, created_at: player.created_at } }, { headers });
  } catch (err) {
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
