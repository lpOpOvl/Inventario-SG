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
    if (method === "GET") {
      const username = url.searchParams.get("username");
      if (!username) return Response.json({ error: "username obrigatorio" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ items: [] }, { headers });
      const { results } = await env.DB.prepare(
        "SELECT * FROM crafted_items WHERE player_id = ? ORDER BY crafted_at DESC"
      ).bind(player.id).all();
      return Response.json({ items: results }, { headers });
    }

    if (method === "POST") {
      const b = await request.json();
      const { username, item_name, category, qualities, stats, base_stats } = b;
      if (!username || !item_name) return Response.json({ error: "campos em falta" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ error: "Jogador nao encontrado" }, { status: 404, headers });
      await env.DB.prepare(
        "INSERT INTO crafted_items (player_id, item_name, category, qualities, stats, base_stats) VALUES (?,?,?,?,?,?)"
      ).bind(
        player.id, item_name.trim(), category || '',
        JSON.stringify(qualities || {}),
        JSON.stringify(stats || {}),
        JSON.stringify(base_stats || {})
      ).run();
      return Response.json({ success: true }, { status: 201, headers });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("DELETE FROM crafted_items WHERE id = ?").bind(id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
