// In-Memory Database for local development
const otpStore = new Map();
const verifiedUsers = new Map();
const subscriptions = new Map();
const usedTxRefs = new Map(); // Anti-replay registry for refs

export const BPI_CONFIG = {
  bankName: "Bank of the Philippine Islands (BPI)",
  accountNumber: "8129127016",
  accountName: "Reviewer / RO•••T H TE••E",
  accountType: "Savings Account",
  fiatPriceUsd: 13.56,
  usdToPhpRate: 58.20
};

export const CRYPTO_CONFIG = {
  recipientWallet: "0xEE01785715BA89AB87e41b9D5379Ee30A1eF3736",
  nchTier: {
    targetNch: 400,
    usdEquivalent: 20.00,
    cexhybridUrl: "https://cexhybrid.io",
    buyNchUrl: "https://cexhybrid.io"
  },
  usdtTier: {
    fixedUsdt: 13.60,
    chain: "BSC (BEP-20)",
    usdEquivalent: 13.60
  }
};

/**
 * Generate 6-digit OTP code for subscriber
 */
export function generateOtp(identifier, channel = 'email') {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Identifier is required' };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  otpStore.set(cleanId, {
    code,
    expiresAt,
    channel,
    attempts: 0
  });

  return {
    success: true,
    message: `Verification code successfully sent via ${channel.toUpperCase()}`,
    channel,
    expiresInSeconds: 600,
    code: process.env.NODE_ENV !== 'production' ? code : undefined
  };
}

/**
 * Verify OTP Code
 */
export function verifyOtp(identifier, inputCode) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const isMasterCode = process.env.ENABLE_TEST_OTP === 'true' && (inputCode || '').trim() === '888888';

  if (isMasterCode) {
    const verifiedUser = {
      identifier: cleanId,
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString()
    };
    verifiedUsers.set(cleanId, verifiedUser);
    return {
      success: true,
      message: 'Identity verified successfully',
      user: verifiedUser
    };
  }

  const record = otpStore.get(cleanId);
  if (!record) {
    return { success: false, error: 'No verification code found. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanId);
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(cleanId);
    return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (record.code !== (inputCode || '').trim()) {
    record.attempts += 1;
    return { success: false, error: `Invalid code. ${5 - record.attempts} attempts remaining.` };
  }

  otpStore.delete(cleanId);

  const verifiedUser = {
    identifier: cleanId,
    channel: record.channel,
    status: 'VERIFIED',
    verifiedAt: new Date().toISOString()
  };
  verifiedUsers.set(cleanId, verifiedUser);

  return {
    success: true,
    message: 'Identity successfully verified',
    user: verifiedUser
  };
}

/**
 * Get Dynamic Live Oracle for NCH Coin
 */
export async function getNchPriceOracle() {
  let nchPriceUsdt = 0.05;
  let source = "CEXhybrid.io (Live Oracle)";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://cexhybrid.io/api/v1/ticker/NCH_USDT', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.lastPrice) {
        nchPriceUsdt = parseFloat(data.lastPrice);
      }
    }
  } catch {
    nchPriceUsdt = 0.05;
  }

  const requiredNch = Math.round((CRYPTO_CONFIG.nchTier.usdEquivalent / nchPriceUsdt) * 100) / 100;

  return {
    success: true,
    nchPriceUsdt,
    targetUsd: CRYPTO_CONFIG.nchTier.usdEquivalent,
    requiredNch,
    source,
    cexhybridUrl: CRYPTO_CONFIG.nchTier.cexhybridUrl,
    buyNchUrl: CRYPTO_CONFIG.nchTier.buyNchUrl,
    recipientWallet: CRYPTO_CONFIG.recipientWallet,
    rateLockedSeconds: 900
  };
}

/**
 * Get Real-time Fiat FX Rate (USD -> PHP) and BPI payout details
 */
export async function getFiatConversion() {
  let rate = BPI_CONFIG.usdToPhpRate;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.PHP) {
        rate = parseFloat(data.rates.PHP);
      }
    }
  } catch {
    rate = 58.20;
  }

  const phpAmount = parseFloat((BPI_CONFIG.fiatPriceUsd * rate).toFixed(2));

  return {
    success: true,
    usdAmount: BPI_CONFIG.fiatPriceUsd,
    exchangeRate: rate,
    phpAmount,
    bpiAccount: BPI_CONFIG.accountNumber,
    bankName: BPI_CONFIG.bankName,
    accountName: BPI_CONFIG.accountName,
    accountType: BPI_CONFIG.accountType,
    currency: "PHP"
  };
}

/**
 * Activate subscription for user with strict format and anti-replay verification
 */
export function activateSubscription({ identifier, email, tier = 'FIAT_1YR', paymentMethod = 'BPI', method, txRef, refNo, txHash }) {
  const cleanId = (email || identifier || '').trim().toLowerCase();
  const cleanMethod = (method || paymentMethod || 'BPI').toUpperCase().trim();
  const cleanRef = (refNo || txRef || txHash || '').trim();

  if (!cleanId || !cleanId.includes('@')) {
    return { success: false, error: 'A valid subscriber email address is required.' };
  }

  if (!cleanRef || cleanRef.length < 5) {
    return { success: false, error: 'Please provide a valid transaction reference or hash.' };
  }

  // Blacklist
  const lowerRef = cleanRef.toLowerCase();
  const blacklist = [
    'test', 'paid', 'asdf', '12345', '123456', '12345678', 'none', 'null', 
    'undefined', 'ok', 'sample', 'fake', 'trial', 'ref', 'hash', 'payment', 
    'done', 'gcash', 'bpi', 'maya', 'usdt', 'nch'
  ];
  if (blacklist.includes(lowerRef) || /^(.)\1{4,}$/.test(lowerRef)) {
    return { 
      success: false, 
      error: 'Invalid reference number. Generic or test strings are rejected. Please enter your actual reference.' 
    };
  }

  // Format checks (Supports MetaMask 0x..., Cheese Explorer 00000..., and Native tx-... IDs)
  if (cleanMethod === 'USDT' || cleanMethod === 'NCH' || cleanMethod.includes('CRYPTO')) {
    const isEvmHash = /^0x[a-fA-F0-9]{40,66}$/i.test(cleanRef);
    const isRawHexHash = /^[a-fA-F0-9]{40,66}$/i.test(cleanRef); // Catches 00000... explorer hashes
    const isNativeTxId = /^tx[-_a-zA-Z0-9]{6,100}$/i.test(cleanRef); // Catches tx-... native transaction IDs

    if (!isEvmHash && !isRawHexHash && !isNativeTxId) {
      return { 
        success: false, 
        error: `Invalid ${cleanMethod} transaction format. Must be a valid transaction hash (0x... or 00000... from explorer), native transaction ID (tx-...), or sender wallet address.` 
      };
    }
  } else if (cleanMethod === 'BPI' || cleanMethod.includes('FIAT')) {
    if (cleanRef.length < 6 || cleanRef.length > 50) {
      return { 
        success: false, 
        error: 'Invalid BPI / InstaPay reference. Trace or reference numbers must be between 6 and 50 characters.' 
      };
    }
  }

  // Anti-replay check
  const existingOwner = usedTxRefs.get(lowerRef);
  if (existingOwner && existingOwner !== cleanId) {
    return { 
      success: false, 
      error: 'This transaction reference has already been activated by another account. Each reference can only be used once.' 
    };
  }

  const now = new Date();
  const durationMonths = (tier === 'NCH_2YR') ? 24 : 12;
  const durationDays = (tier === 'NCH_2YR') ? 730 : 365;
  const durationLabel = (tier === 'NCH_2YR') ? "2 Years VIP Pass" : "1 Year VIP Pass";

  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Generate 6-digit PIN
  const existingSub = subscriptions.get(cleanId);
  const securityPin = existingSub?.securityPin || Math.floor(100000 + Math.random() * 900000).toString();

  const sub = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    identifier: cleanId,
    tier,
    durationLabel,
    durationMonths,
    durationDays,
    paymentMethod: cleanMethod,
    txRef: cleanRef,
    status: 'ACTIVE',
    startsAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    expiresAtMs: expiresAt.getTime(),
    recipientWallet: CRYPTO_CONFIG.recipientWallet,
    bpiAccount: BPI_CONFIG.accountNumber,
    bankName: BPI_CONFIG.bankName,
    accountName: BPI_CONFIG.accountName,
    securityPin
  };

  subscriptions.set(cleanId, sub);
  usedTxRefs.set(lowerRef, cleanId);

  return { success: true, subscription: sub, securityPin, message: `${durationLabel} activated successfully!` };
}

/**
 * Restore subscription by Email + 6-digit PIN
 */
export function restoreSubscription(email, pin) {
  const cleanId = (email || '').trim().toLowerCase();
  const cleanPin = (pin || '').trim();

  if (!cleanId || !cleanId.includes('@')) {
    return { success: false, error: 'Valid subscriber email is required.' };
  }

  const sub = subscriptions.get(cleanId);
  if (!sub) {
    return { success: false, notFound: true, error: 'No active VIP subscription found for this email.' };
  }

  if (sub.securityPin && sub.securityPin !== cleanPin) {
    return { success: false, unauthorized: true, error: 'Invalid 6-digit Security PIN for this account.' };
  }

  const now = Date.now();
  if (sub.expiresAtMs && sub.expiresAtMs < now) {
    return { success: false, expired: true, error: 'Your VIP subscription has expired.' };
  }

  return { success: true, subscription: sub, securityPin: sub.securityPin };
}

/**
 * Get active subscription status
 */
export function getSubscriptionStatus(identifier) {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) return { active: false };

  const sub = subscriptions.get(cleanId);
  if (!sub) return { active: false };

  const now = new Date();
  const isExpired = new Date(sub.expiresAt) < now;

  if (isExpired) {
    sub.status = 'EXPIRED';
    return { active: false, status: 'EXPIRED', subscription: sub };
  }

  return {
    active: true,
    status: 'ACTIVE',
    subscription: sub
  };
}
