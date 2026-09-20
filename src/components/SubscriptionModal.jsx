import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Coins,
  Check,
  ExternalLink,
  QrCode,
  Building2,
  RefreshCw,
  AlertCircle,
  Crown,
  Zap,
  Lock,
  Wallet,
  RotateCcw,
  Download,
  Copy,
  ArrowRight
} from 'lucide-react';

export default function SubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  currentKycUser,
  currentSubscription,
  onKycVerified,
  onSubscriptionActivated,
  initialPlan = 'NCH_2YR',
  promptReason = 'Unlock unrestricted 1080p/4K streaming, zero-popup cinema, and built-in torrent downloads.'
}) {
  // Tabs: 'nch' | 'card' | 'bpi' | 'usdt' | 'restore'
  const [activeTab, setActiveTab] = useState('nch');
  const [bpiOption, setBpiOption] = useState('qr'); // 'qr' | 'manual'
  const [step, setStep] = useState('payment'); // 'payment' | 'success'

  // Input states
  const [emailInput, setEmailInput] = useState(currentKycUser?.identifier || '');
  const [nchTxHash, setNchTxHash] = useState('');
  const [usdtTxHash, setUsdtTxHash] = useState('');
  const [bpiRef, setBpiRef] = useState('');
  const [bpiChannel, setBpiChannel] = useState('BPI');
  const [restoreEmail, setRestoreEmail] = useState('');
  const [restorePin, setRestorePin] = useState('');

  // Status & Feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [activatedSub, setActivatedSub] = useState(null);
  const [issuedPin, setIssuedPin] = useState('');

  // Dynamic Oracles
  const [nchOracle, setNchOracle] = useState({
    requiredNch: 400,
    nchPriceUsdt: 0.05,
    buyNchUrl: 'https://cexhybrid.io',
    recipientWallet: '0xEE01785715BA89AB87e41b9D5379Ee30A1eF3736'
  });
  const [fiatDetails, setFiatDetails] = useState({
    usdAmount: 13.56,
    phpAmount: 789.20,
    exchangeRate: 58.20,
    bpiAccount: '8129127016',
    bankName: 'Bank of the Philippine Islands (BPI)',
    accountName: 'Reviewer / RO•••T H TE••E',
    accountType: 'Savings Account'
  });

  // Fetch oracles on modal open & reset transient state
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsProcessing(false);
      setStep('payment');
      if (initialPlan === 'USDT_1YR') setActiveTab('usdt');
      else if (initialPlan === 'FIAT_1YR') setActiveTab('bpi');
      else setActiveTab('nch');

      if (currentKycUser?.identifier && !emailInput) {
        setEmailInput(currentKycUser.identifier);
      }

      fetchOracles();
    }
  }, [isOpen, currentKycUser, initialPlan]);

  const fetchOracles = async () => {
    try {
      const [nchRes, fiatRes] = await Promise.all([
        fetch('/api/subscription/oracle-nch').then(r => r.json()).catch(() => null),
        fetch('/api/subscription/fiat-details').then(r => r.json()).catch(() => null)
      ]);
      if (nchRes && nchRes.success) setNchOracle(nchRes);
      if (fiatRes && fiatRes.success) setFiatDetails(fiatRes);
    } catch (err) {
      console.warn('Using default oracles', err);
    }
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const downloadBpiQr = () => {
    const a = document.createElement('a');
    a.href = '/bpi_qr.png';
    a.download = 'BPI_InstaPay_QR_MoviesNCH.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Submit Payment / Activation to /api/subscribe
  const handleSubmitPayment = async (channel) => {
    setErrorMessage('');
    const email = emailInput.trim().toLowerCase();

    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address for subscription recovery and cloud verification.');
      return;
    }

    let tier = 'FIAT_1YR';
    let method = channel;
    let refNo = '';

    if (channel === 'NCH') {
      tier = 'NCH_2YR';
      refNo = nchTxHash.trim();
      if (!refNo.startsWith('0x') || refNo.length < 40) {
        setErrorMessage('⚠️ Invalid NCH Transaction Hash. Must start with "0x" and be at least 42 characters long.');
        return;
      }
    } else if (channel === 'USDT') {
      tier = 'USDT_1YR';
      refNo = usdtTxHash.trim();
      if (!refNo.startsWith('0x') || refNo.length < 40) {
        setErrorMessage('⚠️ Invalid USDT Transaction Hash. Must start with "0x" and be at least 42 characters long.');
        return;
      }
    } else if (channel === 'BPI') {
      tier = 'FIAT_1YR';
      refNo = bpiRef.trim();
      if (refNo.length < 6) {
        setErrorMessage('⚠️ Invalid BPI Reference Number. Please enter the full BPI confirmation number or 12-digit InstaPay trace number.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          tier,
          method,
          refNo,
          channel: channel === 'BPI' ? bpiChannel : channel
        })
      });

      const data = await response.json();

      if (response.status === 409) {
        setErrorMessage(data.error || '❌ This transaction reference number or hash has already been registered to another account.');
        return;
      }

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '❌ Verification failed. Please check your transaction reference and try again.');
        return;
      }

      // Success!
      setActivatedSub(data.subscription);
      setIssuedPin(data.securityPin || '');
      setStep('success');

      try {
        localStorage.setItem('moviesnch_security_pin', data.securityPin || '');
        localStorage.setItem('moviesnch_subscriber_email', email);
      } catch (e) {}

      onSubscriptionActivated && onSubscriptionActivated(data.subscription);

    } catch (err) {
      setErrorMessage('❌ Network Error: Could not connect to verification server. Please check your internet connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore Subscription via /api/restore
  const handleRestorePass = async () => {
    setErrorMessage('');
    const email = restoreEmail.trim().toLowerCase();
    const pin = restorePin.trim();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter your registered subscriber email address.');
      return;
    }

    if (!pin || pin.length !== 6) {
      setErrorMessage('Please enter your 6-digit Subscriber Security PIN.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin })
      });

      const data = await response.json();

      if (response.status === 401) {
        setErrorMessage(data.error || '❌ Authentication Error: Invalid 6-digit Security PIN for this email.');
        return;
      }

      if (response.status === 404) {
        setErrorMessage(data.error || '❌ No active VIP subscription found for this email.');
        return;
      }

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '❌ Could not restore subscription. Please try again.');
        return;
      }

      // Success restore!
      setActivatedSub(data.subscription);
      setIssuedPin(data.securityPin || pin);
      setStep('success');

      try {
        localStorage.setItem('moviesnch_security_pin', data.securityPin || pin);
        localStorage.setItem('moviesnch_subscriber_email', email);
      } catch (e) {}

      onSubscriptionActivated && onSubscriptionActivated(data.subscription);

    } catch (err) {
      setErrorMessage('❌ Network Error: Could not connect to verification server. Please check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sub-modal-backdrop" onClick={onClose}>
      <div
        className="sub-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="sub-modal-header">
          <div className="header-badge-vip">
            <Crown size={16} style={{ color: '#fbbf24' }} />
            <span>MOVIESNCH.ONLINE VIP PASS</span>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Reason Banner */}
        <div className="sub-reason-banner">
          <Sparkles size={16} className="sparkle-icon" />
          <span>{promptReason}</span>
        </div>

        {step === 'payment' && (
          <div className="sub-step-content" style={{ padding: '1.2rem' }}>
            {/* Value Highlights */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.6rem',
              marginBottom: '1.2rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.8rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={14} /> 10,000+ Movies Worldwide
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={14} /> 1080p / 4K Ultra HD
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={14} /> Zero Ads & Zero Popups
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={14} /> Built-in Torrent Engine
              </div>
            </div>

            {/* 5-Payment Rail Navigation Tabs */}
            <div className="pay-rail-tabs" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.5rem',
              marginBottom: '1.2rem'
            }}>
              <button
                type="button"
                onClick={() => { setActiveTab('nch'); setErrorMessage(''); }}
                style={{
                  background: activeTab === 'nch' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTab === 'nch' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'nch' ? '#fff' : '#94a3b8',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Coins size={14} /> Pay in NCH
                </span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
                  2 YEARS VIP
                </span>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{nchOracle.requiredNch} NCH ($20 eq.)</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('card'); setErrorMessage(''); }}
                style={{
                  background: activeTab === 'card' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTab === 'card' ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'card' ? '#fff' : '#94a3b8',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={14} /> Credit / Debit
                </span>
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>${fiatDetails.usdAmount} USD</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Deposited to BPI</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('bpi'); setErrorMessage(''); }}
                style={{
                  background: activeTab === 'bpi' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTab === 'bpi' ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'bpi' ? '#fff' : '#94a3b8',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={14} /> BPI / QR Ph
                </span>
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>₱{fiatDetails.phpAmount} PHP</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Direct Bank / App</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('usdt'); setErrorMessage(''); }}
                style={{
                  background: activeTab === 'usdt' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTab === 'usdt' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'usdt' ? '#fff' : '#94a3b8',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Wallet size={14} /> USDT Crypto
                </span>
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>13.60 USDT</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>BEP20 (BSC)</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('restore'); setErrorMessage(''); }}
                style={{
                  background: activeTab === 'restore' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTab === 'restore' ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'restore' ? '#fff' : '#94a3b8',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCcw size={14} /> Restore Pass
                </span>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Cross-Device</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Enter Email + PIN</span>
              </button>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: NCH PAYMENT (2 YEARS VIP) */}
            {activeTab === 'nch' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '1.05rem', color: '#34d399', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={18} /> Pay with Native NCH Coin — 2 Full Years VIP (730 Days)
                  </h4>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                    🔥 BEST VALUE: $20 EQUIVALENT
                  </span>
                </div>

                {/* CEXhybrid Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.2))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                      Don't have NCH coins yet?
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                      Buy NCH instantly on CEXHybrid with USDT or Card.
                    </div>
                  </div>
                  <a
                    href="https://cexhybrid.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#10b981',
                      color: '#000',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Buy NCH on CEXHybrid.io</span>
                    <ExternalLink size={13} />
                  </a>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.8rem' }}>
                  Send <strong>{nchOracle.requiredNch} NCH</strong> from your Cheese Wallet or MetaMask to our designated MoviesNCH Treasury address:
                </div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '1rem'
                }}>
                  <code style={{ fontSize: '0.82rem', color: '#34d399', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace' }}>
                    {nchOracle.recipientWallet}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(nchOracle.recipientWallet, 'nchWallet')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {copiedField === 'nchWallet' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Subscriber Email (for cross-device backup & 2-year cloud sync)
                  </label>
                  <input
                    type="email"
                    placeholder="subscriber@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    NCH Transaction Hash (0x...)
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={nchTxHash}
                    onChange={(e) => setNchTxHash(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSubmitPayment('NCH')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Verifying with Cloudflare KV...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Activate 2-Year VIP Pass via NCH ({nchOracle.requiredNch} NCH / $20 eq.)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: CREDIT / DEBIT CARD */}
            {activeTab === 'card' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                textAlign: 'center'
              }}>
                <CreditCard size={42} style={{ color: '#f59e0b', margin: '0 auto 0.8rem' }} />
                <h4 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>
                  Pay with Credit / Debit Card ($13.56 USD ~ ₱{fiatDetails.phpAmount} PHP)
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '520px', margin: '0 auto 1.2rem', lineHeight: '1.5' }}>
                  Card settlements (Visa, Mastercard, JCB) are processed seamlessly via our <strong>BPI InstaPay QR Code</strong> or <strong>Direct Bank Transfer</strong>. Simply open your mobile banking app (BPI, Maya, GCash) with your linked debit or credit card to scan and complete the payment.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab('bpi')}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <QrCode size={18} />
                  <span>Proceed to BPI InstaPay QR / Card Settlement →</span>
                </button>
              </div>
            )}

            {/* TAB 3: BPI BANK SETTLEMENT (QR & MANUAL) */}
            {activeTab === 'bpi' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '1.05rem', color: '#f87171', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={18} /> BPI Bank Settlement (₱{fiatDetails.phpAmount} PHP / 1-Year VIP)
                  </h4>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                    INSTAPAY QR & DIRECT BANK
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  Choose how you would like to pay your <strong>₱{fiatDetails.phpAmount} PHP</strong> subscription fee. Select either the instant <strong>InstaPay QR Code</strong> or <strong>Manual Account Transfer</strong>:
                </p>

                {/* Dual Option Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setBpiOption('qr')}
                    style={{
                      background: bpiOption === 'qr' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: bpiOption === 'qr' ? '2px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <QrCode size={16} /> Option 1: Scan QR Code
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                      Scan with BPI, GCash, Maya, or any bank
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBpiOption('manual')}
                    style={{
                      background: bpiOption === 'manual' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: bpiOption === 'manual' ? '2px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={16} /> Option 2: Manual Account
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                      Copy account number & send transfer
                    </div>
                  </button>
                </div>

                {/* Option 1: QR Code View */}
                {bpiOption === 'qr' && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    marginBottom: '1.2rem'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <QrCode size={16} /> Official BPI InstaPay QR Code
                    </div>

                    <div style={{
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      maxWidth: '240px',
                      width: '100%',
                      marginBottom: '1rem'
                    }}>
                      <img
                        src="/bpi_qr.png"
                        alt="BPI InstaPay QR Code - MoviesNCH"
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.8rem' }}>
                      <button
                        type="button"
                        onClick={downloadBpiQr}
                        style={{
                          background: 'rgba(248, 113, 113, 0.2)',
                          border: '1px solid #f87171',
                          color: '#f87171',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Download size={13} /> Save / Download QR Code
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(fiatDetails.bpiAccount, 'bpiAccQr')}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#fff',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Copy size={13} /> {copiedField === 'bpiAccQr' ? 'Copied!' : `Copy Account (${fiatDetails.bpiAccount})`}
                      </button>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: '#94a3b8', maxWidth: '480px', lineHeight: '1.4' }}>
                      <strong style={{ color: '#cbd5e1' }}>Quick Instructions:</strong> Open your <strong>BPI App</strong>, <strong>GCash</strong>, <strong>Maya</strong>, or mobile banking app → choose <strong>Scan QR / Upload QR</strong> → scan or upload this image → confirm account <strong>Reviewer (RO•••T H TE••E)</strong> & transfer <strong>₱{fiatDetails.phpAmount}</strong>.
                    </div>
                  </div>
                )}

                {/* Option 2: Manual Account View */}
                {bpiOption === 'manual' && (
                  <div style={{
                    background: 'rgba(248, 113, 113, 0.08)',
                    border: '1px solid rgba(248, 113, 113, 0.25)',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '1.2rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '0.8rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Bank Name</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>{fiatDetails.bankName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Account Name</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>{fiatDetails.accountName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Account Type</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>{fiatDetails.accountType}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Exact Amount Due</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>₱{fiatDetails.phpAmount} PHP (${fiatDetails.usdAmount} USD)</div>
                      </div>
                    </div>

                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginTop: '0.6rem' }}>
                      Official BPI Account Number
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(248, 113, 113, 0.3)',
                      marginTop: '4px'
                    }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '1px', color: '#fff' }}>
                        {fiatDetails.bpiAccount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(fiatDetails.bpiAccount, 'bpiManualAcc')}
                        style={{
                          background: 'rgba(248, 113, 113, 0.2)',
                          border: '1px solid #f87171',
                          color: '#f87171',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {copiedField === 'bpiManualAcc' ? 'Copied!' : 'Copy Account Number'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.8rem 0 0 0' }}>
                      Supported channels: BPI Online / Mobile App transfer, InstaPay bank transfer from GCash, Maya, BDO, UnionBank, or over-the-counter BPI deposit.
                    </p>
                  </div>
                )}

                {/* Verification Form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Subscriber Email (for 1-year cloud sync & PIN backup)
                    </label>
                    <input
                      type="email"
                      placeholder="subscriber@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Sender Bank / Channel
                    </label>
                    <select
                      value={bpiChannel}
                      onChange={(e) => setBpiChannel(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    >
                      <option value="BPI">BPI Online / App</option>
                      <option value="GCash">GCash InstaPay</option>
                      <option value="Maya">Maya Bank Transfer</option>
                      <option value="BDO">BDO InstaPay</option>
                      <option value="UnionBank">UnionBank</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    BPI Deposit / InstaPay Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20260909-BPI-592813 or 12-digit InstaPay Trace #"
                    value={bpiRef}
                    onChange={(e) => setBpiRef(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSubmitPayment('BPI')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Verifying with Cloudflare KV...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Submit BPI Reference & Activate 1-Year VIP Pass (₱{fiatDetails.phpAmount})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 4: USDT CRYPTO (1 YEAR VIP) */}
            {activeTab === 'usdt' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <h4 style={{ fontSize: '1.05rem', color: '#38bdf8', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={18} /> Pay with USDT (BEP20 - BNB Smart Chain)
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  Send <strong>13.60 USDT</strong> on <strong>Binance Smart Chain (BEP20)</strong> to our designated receiving address:
                </p>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>
                      Official USDT BEP20 Receiving Address (BSC):
                    </span>
                    <code style={{ fontSize: '0.82rem', color: '#38bdf8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {nchOracle.recipientWallet}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(nchOracle.recipientWallet, 'usdtWallet')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {copiedField === 'usdtWallet' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Subscriber Email
                  </label>
                  <input
                    type="email"
                    placeholder="subscriber@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    USDT Transaction Hash / TXID (from BscScan or Wallet)
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={usdtTxHash}
                    onChange={(e) => setUsdtTxHash(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSubmitPayment('USDT')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Verifying with Cloudflare KV...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Verify USDT Payment & Activate 1-Year VIP Pass (13.60 USDT)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 5: RESTORE VIP PASS (CROSS-DEVICE CLOUD SYNC) */}
            {activeTab === 'restore' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.25)', textAlign: 'center' }}>
                <RotateCcw size={40} style={{ color: '#c084fc', margin: '0 auto 0.8rem' }} />
                <h4 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.4rem' }}>
                  Restore Your MoviesNCH VIP Pass
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '480px', margin: '0 auto 1.2rem', lineHeight: '1.4' }}>
                  Already have an active VIP subscription on another device? Enter your registered subscriber email and 6-digit Security PIN to instantly restore access.
                </p>

                <div style={{ maxWidth: '420px', margin: '0 auto 1.2rem', textAlign: 'left' }}>
                  <div style={{ marginBottom: '0.8rem' }}>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Subscriber Email
                    </label>
                    <input
                      type="email"
                      placeholder="subscriber@example.com"
                      value={restoreEmail}
                      onChange={(e) => setRestoreEmail(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      6-Digit Subscriber Security PIN
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 592813"
                      value={restorePin}
                      onChange={(e) => setRestorePin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '1.1rem',
                        fontFamily: 'monospace',
                        letterSpacing: '3px',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRestorePass}
                  style={{
                    background: 'linear-gradient(135deg, #9333ea, #a855f7)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Verifying with Cloudflare KV...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Verify PIN & Restore VIP Pass</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: SUCCESS & SECURITY PIN DISPLAY */}
        {step === 'success' && (
          <div className="sub-success-content" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div className="success-celebration-badge" style={{ margin: '0 auto 1rem' }}>
              <Sparkles size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.4rem' }}>
              🎉 MoviesNCH VIP Pass Active!
            </h2>
            <p className="success-subtext" style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '520px', margin: '0 auto 1.2rem' }}>
              Your VIP access is now unlocked and secured in Cloudflare KV persistent storage across all your devices.
            </p>

            <div className="subscription-card-badge" style={{ maxWidth: '480px', margin: '0 auto 1.2rem', textAlign: 'left' }}>
              <div className="badge-row">
                <span>Subscriber:</span>
                <strong>{activatedSub?.identifier || emailInput || 'Subscriber'}</strong>
              </div>
              <div className="badge-row">
                <span>Plan Duration:</span>
                <strong style={{ color: '#34d399' }}>
                  {activatedSub?.durationLabel || 'VIP Pass Active'}
                </strong>
              </div>
              <div className="badge-row">
                <span>Verified Reference:</span>
                <code style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{activatedSub?.txRef || 'CONFIRMED'}</code>
              </div>
              <div className="badge-row">
                <span>Status:</span>
                <span className="status-active-pill">ACTIVE & UNLOCKED</span>
              </div>
            </div>

            {/* Security PIN Prominent Display */}
            {issuedPin && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '2px solid #f59e0b',
                borderRadius: '10px',
                padding: '1rem',
                maxWidth: '480px',
                margin: '0 auto 1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Lock size={15} /> YOUR SUBSCRIBER SECURITY PIN
                </div>
                <div style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  letterSpacing: '4px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  margin: '8px 0'
                }}>
                  {issuedPin}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(issuedPin, 'issuedPin')}
                  style={{
                    background: 'rgba(245, 158, 11, 0.25)',
                    border: '1px solid #f59e0b',
                    color: '#fbbf24',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}
                >
                  {copiedField === 'issuedPin' ? 'PIN Copied!' : 'Copy Security PIN'}
                </button>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  ⚠️ <strong>Important:</strong> Write down or screenshot your 6-digit Security PIN. You will need your email and this PIN to restore VIP access on your other devices (laptop, tablet, phone).
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-start-streaming"
              onClick={() => {
                onSuccess && onSuccess();
                onClose();
              }}
            >
              <span>Start Streaming Movies Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
