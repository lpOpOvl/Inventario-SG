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
      const { results } = await env.DB.prepare(
        "SELECT * FROM objectives ORDER BY priority ASC"
      ).all();
      return Response.json({ objectives: results }, { headers });
    }

    if (method === "POST") {
      const { item, note, target_qty, event_name, category } = await request.json();
      if (!item) return Response.json({ error: "item obrigatorio" }, { status: 400, headers });
      const cat = category || 'Mineração';
      // Verificar duplicado apenas dentro da mesma categoria
      const exists = await env.DB.prepare(
        "SELECT id FROM objectives WHERE item = ? AND category = ?"
      ).bind(item, cat).first();
      if (exists) return Response.json({ error: `"${item}" já existe na categoria "${cat}"` }, { status: 409, headers });
      const max = await env.DB.prepare("SELECT MAX(priority) as mp FROM objectives").first();
      const priority = (max?.mp ?? -1) + 1;
      await env.DB.prepare("INSERT INTO objectives (item, note, priority, target_qty, event_name, category) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(item, note || '', priority, target_qty ?? null, event_name || '', cat).run();
      return Response.json({ success: true }, { status: 201, headers });
    }

    if (method === "PUT") {
      const body = await request.json();
      if (body.order) {
        for (let i = 0; i < body.order.length; i++) {
          await env.DB.prepare("UPDATE objectives SET priority = ? WHERE id = ?")
            .bind(i, body.order[i]).run();
        }
        return Response.json({ success: true }, { headers });
      }
      if (body.id !== undefined) {
        await env.DB.prepare("UPDATE objectives SET note = ?, target_qty = ?, event_name = ?, category = ? WHERE id = ?")
          .bind(body.note || '', body.target_qty ?? null, body.event_name || '', body.category || 'Mineração', body.id).run();
        return Response.json({ success: true }, { headers });
      }
      return Response.json({ error: "parametros invalidos" }, { status: 400, headers });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("DELETE FROM objectives WHERE id = ?").bind(id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
