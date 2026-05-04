export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (method === "OPTIONS") return new Response(null, { headers });

  try {
    if (method === "GET") {
      const { results: users } = await env.DB.prepare(
        "SELECT id, username, created_at FROM players ORDER BY username"
      ).all();
      return Response.json({ users }, { headers });
    }

    if (method === "DELETE") {
      const username = url.searchParams.get("username");
      if (!username) return Response.json({ error: "username obrigatorio" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ error: "Utilizador nao encontrado" }, { status: 404, headers });
      // Remove all items first, then the player
      await env.DB.prepare("DELETE FROM items WHERE player_id = ?").bind(player.id).run();
      await env.DB.prepare("DELETE FROM players WHERE id = ?").bind(player.id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
