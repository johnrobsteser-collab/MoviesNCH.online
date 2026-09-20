/**
 * Cloudflare Pages Function: POST /api/subscribe
 * Records and verifies MoviesNCH VIP subscriptions to Cloudflare KV (MOVIESNCH_STORAGE).
 * Features anti-replay reference deduplication, EVM/BPI format verification,
 * and automated 6-digit Security PIN issuance for cross-device VIP access.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const email = (body.email || body.identifier || '').toLowerCase().trim();
        const tier = (body.tier || 'FIAT_1YR').trim();
        const method = (body.method || body.paymentMethod || 'BPI').toUpperCase().trim();
        const cleanRef = (body.refNo || body.txRef || body.txHash || '').trim();
        const channel = body.channel || method;

        // 1. Email format check
        if (!email || !email.includes('@') || email.length < 5) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'A valid subscriber email address is required for activation and cloud recovery.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 2. Reference existence check
        if (!cleanRef || cleanRef.length < 5) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Please provide a valid transaction reference number, bank trace number, or blockchain transaction hash.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 3. Blacklist of generic / dummy reference strings
        const lowerRef = cleanRef.toLowerCase();
        const blacklist = [
            'test', 'paid', 'asdf', '12345', '123456', '12345678', 'none', 'null', 
            'undefined', 'ok', 'sample', 'fake', 'trial', 'ref', 'hash', 'payment', 
            'done', 'gcash', 'bpi', 'maya', 'usdt', 'nch'
        ];
        if (blacklist.includes(lowerRef) || /^(.)\1{4,}$/.test(lowerRef)) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Invalid reference number. Generic or test strings are rejected. Please provide your actual bank trace number or blockchain transaction hash.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 4. Method-specific format checks
        if (method === 'USDT' || method === 'NCH' || method.includes('CRYPTO')) {
            const isEvmHash = /^0x[a-fA-F0-9]{64}$/.test(cleanRef);
            const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(cleanRef);
            if (!isEvmHash && !isEvmAddress) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: `Invalid ${method} transaction format. Please provide a valid 66-character transaction hash (0x...) from your wallet or blockchain explorer.` 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        } else if (method === 'BPI' || method.includes('FIAT')) {
            if (cleanRef.length < 6 || cleanRef.length > 50) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Invalid BPI / InstaPay reference. Trace or reference numbers must be between 6 and 50 characters.' 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        // Calculate validity duration based on tier
        const now = Date.now();
        const durationDays = (tier === 'NCH_2YR') ? 730 : 365;
        const durationLabel = (tier === 'NCH_2YR') ? '2 Years VIP Pass' : '1 Year VIP Pass';
        const durationMonths = (tier === 'NCH_2YR') ? 24 : 12;
        const expiresAtMs = now + (durationDays * 24 * 60 * 60 * 1000);
        const expiresAt = new Date(expiresAtMs).toISOString();
        const activatedAt = new Date(now).toISOString();

        const subscription = {
            id: `sub_${now}_${Math.random().toString(36).substring(2, 7)}`,
            identifier: email,
            tier,
            durationLabel,
            durationMonths,
            durationDays,
            paymentMethod: method,
            channel,
            txRef: cleanRef,
            status: 'ACTIVE',
            startsAt: activatedAt,
            expiresAt,
            expiresAtMs,
            recipientWallet: '0xEE01785715BA89AB87e41b9D5379Ee30A1eF3736',
            bpiAccount: '8129127016',
            bankName: 'Bank of the Philippine Islands (BPI)',
            accountName: 'Reviewer / RO•••T H TE••E'
        };

        // Query Cloudflare KV namespace
        const kv = env && (env.MOVIESNCH_STORAGE || env.SUBSCRIBERS);
        let subscriberRecord = {
            email,
            securityPin: '',
            subscription,
            createdAt: activatedAt,
            updatedAt: activatedAt
        };

        if (kv) {
            // 5. Anti-Replay & Deduplication Check: Prevent reuse of same reference number by another email
            const refRegistryKey = `ref:${lowerRef}`;
            const existingRefOwner = await kv.get(refRegistryKey);
            if (existingRefOwner && existingRefOwner.toLowerCase() !== email) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'This transaction reference number or hash has already been registered to another account. Each payment receipt can only be activated once.' 
                }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

            // Retrieve existing subscriber record if any
            const raw = await kv.get(`sub:${email}`);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    subscriberRecord = parsed;
                } catch (e) {
                    console.error('Error parsing existing subscriber record:', e);
                }
            }

            // 6. Security PIN Generation / Retention
            if (!subscriberRecord.securityPin) {
                subscriberRecord.securityPin = Math.floor(100000 + Math.random() * 900000).toString();
            }

            subscriberRecord.subscription = subscription;
            subscriberRecord.updatedAt = activatedAt;

            const ttlSeconds = durationDays * 24 * 60 * 60;

            // Save subscriber record
            await kv.put(`sub:${email}`, JSON.stringify(subscriberRecord), {
                expirationTtl: Math.max(86400, ttlSeconds)
            });

            // Register reference number to prevent replay
            await kv.put(refRegistryKey, email, {
                expirationTtl: Math.max(86400, ttlSeconds)
            });
        } else {
            // Fallback PIN if KV not bound locally
            if (!subscriberRecord.securityPin) {
                subscriberRecord.securityPin = Math.floor(100000 + Math.random() * 900000).toString();
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `🎉 ${durationLabel} activated successfully!`,
            securityPin: subscriberRecord.securityPin,
            subscription
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
