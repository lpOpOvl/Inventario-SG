export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (method === "OPTIONS") return new Response(null, { headers });

  try {
    if (method === "GET") {
      const username = url.searchParams.get("username");
      const org = url.searchParams.get("org");
      const personal = url.searchParams.get("personal");

      if (org) {
        const { results: items } = await env.DB.prepare(`
          SELECT items.*, players.username as player_name
          FROM items
          JOIN players ON items.player_id = players.id
          WHERE (items.personal = 0 OR items.personal IS NULL)
          ORDER BY items.name, players.username
        `).all();
        return Response.json({ items }, { headers });
      }

      if (!username) return Response.json({ error: "username obrigatorio" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id, username, created_at FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ player: null, items: [] }, { headers });

      let items;
      if (personal === "1") {
        ({ results: items } = await env.DB.prepare(
          "SELECT * FROM items WHERE player_id = ? AND personal = 1 ORDER BY name"
        ).bind(player.id).all());
      } else {
        ({ results: items } = await env.DB.prepare(
          "SELECT * FROM items WHERE player_id = ? AND (personal = 0 OR personal IS NULL) ORDER BY name"
        ).bind(player.id).all());
      }
      return Response.json({ player, items }, { headers });
    }

    if (method === "POST") {
      const b = await request.json();
      const { username, name, quantity, quality, location, notes, personal } = b;
      if (!username || !name) return Response.json({ error: "campos em falta" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ error: "Jogador nao encontrado" }, { status: 404, headers });
      await env.DB.prepare("INSERT INTO items (player_id, name, category, quantity, quality, location, notes, personal) VALUES (?,?,?,?,?,?,?,?)")
        .bind(player.id, name.trim(), 'Commodities', parseFloat(quantity)||0.001, quality??null, (location||'').trim(), (notes||'').trim(), personal===1?1:0).run();
      return Response.json({ success: true }, { status: 201, headers });
    }

    if (method === "PUT") {
      const b = await request.json();
      const { id, name, quantity, quality, location, notes } = b;
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("UPDATE items SET name=?, quantity=?, quality=?, location=?, notes=? WHERE id=?")
        .bind(name.trim(), parseFloat(quantity)||0.001, quality??null, (location||'').trim(), (notes||'').trim(), id).run();
      return Response.json({ success: true }, { headers });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
