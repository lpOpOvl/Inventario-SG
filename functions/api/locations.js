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
        "SELECT * FROM locations ORDER BY system ASC, name ASC"
      ).all();
      return Response.json({ locations: results }, { headers });
    }

    if (method === "POST") {
      const { name, system, type } = await request.json();
      if (!name) return Response.json({ error: "nome obrigatorio" }, { status: 400, headers });
      const exists = await env.DB.prepare("SELECT id FROM locations WHERE name = ?").bind(name).first();
      if (exists) return Response.json({ error: "Localização já existe" }, { status: 409, headers });
      await env.DB.prepare("INSERT INTO locations (name, system, type) VALUES (?, ?, ?)")
        .bind(name, system || 'Outro', type || 'Outro').run();
      return Response.json({ success: true }, { status: 201, headers });
    }

    if (method === "PUT") {
      const { id, name, system, type } = await request.json();
      if (!id || !name) return Response.json({ error: "id e nome obrigatorios" }, { status: 400, headers });
      const exists = await env.DB.prepare("SELECT id FROM locations WHERE name = ? AND id != ?").bind(name, id).first();
      if (exists) return Response.json({ error: "Já existe uma localização com esse nome" }, { status: 409, headers });
      await env.DB.prepare("UPDATE locations SET name = ?, system = ?, type = ? WHERE id = ?")
        .bind(name, system || 'Outro', type || 'Outro', id).run();
      return Response.json({ success: true }, { headers });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400, headers });
      await env.DB.prepare("DELETE FROM locations WHERE id = ?").bind(id).run();
      return Response.json({ success: true }, { headers });
    }

    return Response.json({ error: "metodo nao suportado" }, { status: 405, headers });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "erro interno: " + err.message }, { status: 500, headers });
  }
}
