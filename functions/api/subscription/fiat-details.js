/**
 * Cloudflare Pages Function: GET /api/subscription/fiat-details
 */
export async function onRequestGet() {
  const usdAmount = 13.56;
  let rate = 58.20;

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.PHP) {
        rate = parseFloat(data.rates.PHP);
      }
    }
  } catch (e) {
    rate = 58.20;
  }

  const phpAmount = parseFloat((usdAmount * rate).toFixed(2));

  return new Response(JSON.stringify({
    success: true,
    usdAmount,
    exchangeRate: rate,
    phpAmount,
    bpiAccount: "8129127016",
    bankName: "Bank of the Philippine Islands (BPI)",
    accountName: "Reviewer / RO•••T H TE••E",
    accountType: "Savings Account",
    currency: "PHP"
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
