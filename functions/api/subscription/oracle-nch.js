/**
 * Cloudflare Pages Function: GET /api/subscription/oracle-nch
 */
export async function onRequestGet() {
  let nchPriceUsdt = 0.05;
  const targetUsd = 20.00;
  const recipientWallet = "0xEE01785715BA89AB87e41b9D5379Ee30A1eF3736";

  try {
    const res = await fetch('https://cexhybrid.io/api/v1/ticker/NCH_USDT', {
      headers: { 'User-Agent': 'Cloudflare-Worker' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.lastPrice) {
        nchPriceUsdt = parseFloat(data.lastPrice);
      }
    }
  } catch (e) {
    nchPriceUsdt = 0.05;
  }

  const requiredNch = Math.round((targetUsd / nchPriceUsdt) * 100) / 100;

  return new Response(JSON.stringify({
    success: true,
    nchPriceUsdt,
    targetUsd,
    requiredNch,
    source: "CEXhybrid.io (Live Oracle)",
    cexhybridUrl: "https://cexhybrid.io",
    buyNchUrl: "https://cexhybrid.io",
    recipientWallet,
    rateLockedSeconds: 900
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
