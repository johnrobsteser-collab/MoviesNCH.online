/**
 * Cloudflare Pages Function: GET /api/subscription/oracle-nch
 * Live dynamic pricing oracle for MoviesNCH
 */
export async function onRequestGet() {
  let nchPriceUsdt = 0.05;
  const targetUsd = 20.00;
  const recipientWallet = "0xEE01785715BA89AB87e41b9D5379Ee30A1eF3736";

  const priceSources = [
    { url: 'https://cexhybrid.io/api/v1/ticker/NCH_USDT', parser: (d) => parseFloat(d.lastPrice || d.price) },
    { url: 'https://cexhybrid.io/api/market-prices', parser: (d) => parseFloat(d?.prices?.NCH?.usd) },
    { url: 'https://cheeseblockchain.com/dex/api/market-prices', parser: (d) => parseFloat(d?.prices?.NCH?.usd) },
    { url: 'https://nchlogin.com/api/price/nch-quote?packageUsdt=20&walletAddress=0x0000000000000000000000000000000000000000', parser: (d) => parseFloat(d?.quote?.nchPriceUsdt) }
  ];

  for (const src of priceSources) {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Cloudflare-Worker-MoviesNCH' },
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const p = src.parser(data);
        if (p && p > 0) {
          nchPriceUsdt = p;
          break;
        }
      }
    } catch (e) {}
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
