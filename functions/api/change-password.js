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
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return Response.json({ error: "método não suportado" }, { status: 405, headers });

  try {
    const { username, currentPassword, newPassword } = await request.json();
    if (!username || !currentPassword || !newPassword) return Response.json({ error: "Campos em falta." }, { status: 400, headers });
    if (newPassword.length < 4) return Response.json({ error: "A nova password deve ter pelo menos 4 caracteres." }, { status: 400, headers });

    const player = await env.DB.prepare("SELECT id, password FROM players WHERE username = ?").bind(username).first();
    if (!player) return Response.json({ error: "Utilizador não encontrado." }, { status: 404, headers });

    const hashedCurrent = await hashPassword(currentPassword);
    if (player.password !== hashedCurrent) return Response.json({ error: "Password atual incorreta." }, { status: 401, headers });

    const hashedNew = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE players SET password = ? WHERE username = ?").bind(hashedNew, username).run();
    return Response.json({ success: true }, { headers });
  } catch (err) {
    return Response.json({ error: "Erro interno: " + err.message }, { status: 500, headers });
  }
}
