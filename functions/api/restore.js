/**
 * Cloudflare Pages Function: POST /api/restore
 * Restores MoviesNCH VIP subscriptions for a candidate email across any device.
 * Enforces 6-digit Security PIN authentication to prevent unauthorized email freeloading.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const email = (body.email || '').toLowerCase().trim();
        const pin = (body.pin || body.securityPin || '').toString().trim();

        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ success: false, valid: false, error: 'Valid subscriber email is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        let record = null;

        // Query KV namespace
        const kv = env && (env.MOVIESNCH_STORAGE || env.SUBSCRIBERS);
        if (kv) {
            const raw = await kv.get(`sub:${email}`);
            if (raw) {
                try {
                    record = JSON.parse(raw);
                } catch (e) {
                    console.error('Failed to parse KV record for', email, e);
                }
            }
        }

        if (!record || !record.subscription) {
            return new Response(JSON.stringify({
                success: false,
                valid: false,
                notFound: true,
                error: 'No active VIP subscription found for this email. Please verify spelling or subscribe.'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Security PIN Check
        if (record.securityPin) {
            if (!pin || pin !== record.securityPin.trim()) {
                return new Response(JSON.stringify({
                    success: false,
                    valid: false,
                    unauthorized: true,
                    error: `Invalid Security PIN for ${email}. Please enter the 6-digit Security PIN issued when you activated.`
                }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        const now = Date.now();
        const sub = record.subscription;
        const isExpired = sub.expiresAtMs ? sub.expiresAtMs < now : new Date(sub.expiresAt).getTime() < now;

        if (isExpired) {
            return new Response(JSON.stringify({
                success: false,
                valid: false,
                expired: true,
                error: 'Your VIP subscription has expired. Please renew your pass to continue streaming.'
            }), {
                status: 410,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            valid: true,
            message: '🎉 VIP subscription restored successfully!',
            subscription: sub,
            securityPin: record.securityPin
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
