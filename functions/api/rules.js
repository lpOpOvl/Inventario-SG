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
        "SELECT * FROM rules ORDER BY priority ASC"
      ).all();
      return Response.json({ rules: results }, { headers });
    }

    if (method === "POST") {
      const { title, description, tag } = await request.json();
      if (!title) return Response.json({ error: "titulo obrigatorio" }, { status: 400, headers });
      const max = await env.DB.prepare("SELECT MAX(priority) as mp FROM rules").first();
      const priority = (max?.mp ?? -1) + 1;
      await env.DB.prepare(
        "INSERT INTO rules (title, description, tag, priority) VALUES (?, ?, ?, ?)"
      ).bind(title.trim(), description || '', tag || null, priority).run();
      return Response.json({ success: true }, { status: 201, headers });
    }

    if (method === "PUT") {
      const body = await request.json();
      // Reordenar
      if (body.order) {
        for (let i = 0; i < body.order.length; i++) {
          await env.DB.prepare("UPDATE rules SET priority = ? WHERE id = ?")
            .bind(i, body.order[i]).run();
        }
        return Response.json({ success: true }, { headers });
      }
      // Editar regra individual
      if (body.id !== undefined) {
        await env.DB.prepare(
          "UPDATE rules SET title = ?, description = ?, tag = ? WHERE id = ?"
        ).bind(body.title || '', body.description || '', body.tag || null, body.id).run();
        return Response.json({ success: true }, { headers });
      }
      return Response.json({ error: "parametros invalidos" }, { status: 400, headers });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("DELETE FROM rules WHERE id = ?").bind(id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
