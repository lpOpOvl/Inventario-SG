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
    const { username, password, invite_code } = await request.json();

    const validCode = env.INVITE_CODE;
    if (!invite_code || invite_code.trim() !== validCode) {
      return Response.json({ error: "Código de convite inválido." }, { status: 403, headers });
    }

    if (!username) return Response.json({ error: "Username obrigatório." }, { status: 400, headers });
    if (!password || password.length < 4) return Response.json({ error: "Password deve ter pelo menos 4 caracteres." }, { status: 400, headers });

    const exists = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
    if (exists) return Response.json({ error: "Este username já existe. Escolhe outro." }, { status: 409, headers });

    const hashed = await hashPassword(password);
    await env.DB.prepare("INSERT INTO players (username, password) VALUES (?, ?)").bind(username.trim(), hashed).run();
    const player = await env.DB.prepare("SELECT id, username, created_at FROM players WHERE username = ?").bind(username.trim()).first();
    return Response.json({ success: true, player }, { status: 201, headers });
  } catch (err) {
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
