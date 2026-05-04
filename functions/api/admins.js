export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (method === "OPTIONS") return new Response(null, { headers });

  try {
    // GET — list all admins
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT username FROM players WHERE is_admin = 1 ORDER BY username"
      ).all();
      return Response.json({ admins: results.map(r => r.username) }, { headers });
    }

    // POST — grant admin to username
    if (method === "POST") {
      const { username } = await request.json();
      if (!username) return Response.json({ error: "username obrigatorio" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ error: "Utilizador nao encontrado" }, { status: 404, headers });
      await env.DB.prepare("UPDATE players SET is_admin = 1 WHERE username = ?").bind(username).run();
      return Response.json({ success: true }, { headers });
    }

    // DELETE — revoke admin from username
    if (method === "DELETE") {
      const username = url.searchParams.get("username");
      if (!username) return Response.json({ error: "username obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("UPDATE players SET is_admin = 0 WHERE username = ?").bind(username).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
