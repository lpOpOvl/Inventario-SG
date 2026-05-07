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
      let result;
      if (username) {
        result = await env.DB.prepare(`
          SELECT t.*, p.username as player_name
          FROM transactions t
          JOIN players p ON t.player_id = p.id
          WHERE p.username = ?
          ORDER BY t.created_at DESC LIMIT 500
        `).bind(username).all();
      } else {
        result = await env.DB.prepare(`
          SELECT t.*, p.username as player_name
          FROM transactions t
          JOIN players p ON t.player_id = p.id
          ORDER BY t.created_at DESC LIMIT 1000
        `).all();
      }
      return Response.json({ transactions: result.results }, { headers });
    }

    if (method === "POST") {
      const { username, item_name, quantity, unit, quality, location, quantity_before, quantity_after, type, to_player, notes } = await request.json();
      if (!username || !item_name) return Response.json({ error: "campos em falta" }, { status: 400, headers });
      const player = await env.DB.prepare("SELECT id FROM players WHERE username = ?").bind(username).first();
      if (!player) return Response.json({ error: "Jogador nao encontrado" }, { status: 404, headers });
      await env.DB.prepare(`
        INSERT INTO transactions (player_id, item_name, quantity, unit, quality, location, quantity_before, quantity_after, type, to_player, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(player.id, item_name, quantity, unit||'SCU', quality??null, location||'', quantity_before??null, quantity_after??null, type||'craft', to_player||null, notes||null).run();
      return Response.json({ success: true }, { status: 201, headers });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
