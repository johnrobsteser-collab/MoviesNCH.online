/**
 * MoviesNCH.online - Cloudflare Edge Persistent Storage API
 * Uses dedicated Workers KV namespace (MOVIESNCH_STORAGE)
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.MOVIESNCH_STORAGE) {
    return new Response(JSON.stringify({ success: false, error: "Persistent storage binding not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!key) {
    const list = await env.MOVIESNCH_STORAGE.list({ limit: 50 });
    return new Response(JSON.stringify({ success: true, keys: list.keys }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const value = await env.MOVIESNCH_STORAGE.get(key);
  if (value === null) {
    return new Response(JSON.stringify({ success: false, error: "Key not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const parsed = JSON.parse(value);
    return new Response(JSON.stringify({ success: true, key, data: parsed }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: true, key, data: value }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.MOVIESNCH_STORAGE) {
    return new Response(JSON.stringify({ success: false, error: "Persistent storage binding not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return new Response(JSON.stringify({ success: false, error: "Missing 'key' or 'value'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const valueToStore = typeof value === "string" ? value : JSON.stringify(value);
    await env.MOVIESNCH_STORAGE.put(key, valueToStore);

    return new Response(JSON.stringify({ success: true, message: `Persisted '${key}' to MoviesNCH storage`, key }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
