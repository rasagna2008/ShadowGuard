import { useState, useEffect, useRef, useCallback } from "react";

const SECRET_SEQUENCE = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight"];

const DEFAULT_PHISHING_PATTERNS = [
  { id: "p1", label: "URL shorteners (bit.ly, tinyurl)", regex: /bit\.ly|tinyurl/i },
  { id: "p2", label: "Free prize scams", regex: /free.*prize/i },
  { id: "p3", label: "Account verify phishing", regex: /verify.*account/i },
  { id: "p4", label: "Urgent action demand", regex: /urgent.*action/i },
  { id: "p5", label: "Password expired trick", regex: /password.*expired/i },
  { id: "p6", label: "Click here now lure", regex: /click.*here.*now/i },
  { id: "p7", label: "Suspicious TLD (.xyz)", regex: /\.xyz/i },
  { id: "p8", label: "Suspicious TLD (.tk)", regex: /\.tk/i },
  { id: "p9", label: "Fake secure login", regex: /login.*secure.*[0-9]/i },
];

const DEFAULT_SOCIAL_PATTERNS = [
  { id: "s1", label: "Act now urgency", regex: /act now/i },
  { id: "s2", label: "Limited time pressure", regex: /limited time/i },
  { id: "s3", label: "You've won scam", regex: /you('ve| have) won/i },
  { id: "s4", label: "Send money request", regex: /send money/i },
  { id: "s5", label: "Wire transfer request", regex: /wire transfer/i },
  { id: "s6", label: "Gift card scam", regex: /gift card/i },
  { id: "s7", label: "Help request manipulation", regex: /i need your help/i },
  { id: "s8", label: "Secrecy demand", regex: /keep this secret|don't tell/i },
  { id: "s9", label: "Trust manipulation", regex: /trust me/i },
];

function analyzeThreat(text, phishingPatterns, socialPatterns, blocklist) {
  let score = 0, flags = [], matchedPatterns = [];
  const blocked = blocklist.find(b => text.toLowerCase().includes(b.value.toLowerCase()));
  if (blocked) return { score: 100, flags: [`🚫 BLOCKED: matches "${blocked.value}"`], matchedPatterns: [blocked.id], blocklisted: true };
  phishingPatterns.filter(p => !p.disabled).forEach(p => {
    if (p.regex.test(text)) { score += 25; flags.push("Phishing: " + p.label); matchedPatterns.push(p.id); }
  });
  socialPatterns.filter(p => !p.disabled).forEach(p => {
    if (p.regex.test(text)) { score += 20; flags.push("Social engineering: " + p.label); matchedPatterns.push(p.id); }
  });
  if (/[A-Z]{5,}/.test(text)) { score += 10; flags.push("Urgency capitalization"); }
  if ((text.match(/!/g) || []).length > 2) { score += 10; flags.push("Excessive exclamation marks"); }
  if (/http[s]?:\/\//.test(text)) { score += 5; flags.push("Contains URL"); }
  return { score: Math.min(score, 100), flags: [...new Set(flags)], matchedPatterns, blocklisted: false };
}

function neutralizeText(text, phishingPatterns, socialPatterns, blocklist) {
  let result = text;
  [...phishingPatterns, ...socialPatterns].forEach(p => {
    result = result.replace(new RegExp(p.regex.source, "gi"), m => "█".repeat(m.length));
  });
  blocklist.forEach(b => {
    const escaped = b.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, "gi"), m => "█".repeat(m.length));
  });
  result = result.replace(/https?:\/\/[^\s]+/gi, "[URL BLOCKED]");
  return result;
}

function useTypingBehavior() {
  const timings = useRef([]);
  const lastKey = useRef(null);
  const record = useCallback((e) => {
    const now = Date.now();
    if (lastKey.current) timings.current.push(now - lastKey.current);
    if (timings.current.length > 20) timings.current.shift();
    lastKey.current = now;
  }, []);
  const getScore = useCallback(() => {
    if (timings.current.length < 3) return 95;
    const avg = timings.current.reduce((a, b) => a + b, 0) / timings.current.length;
    const variance = timings.current.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / timings.current.length;
    const stdDev = Math.sqrt(variance);
    if (avg < 30 || avg > 800) return 30;
    if (stdDev > 300) return 50;
    return Math.max(60, Math.min(100, 100 - stdDev / 5));
  }, []);
  return { record, getScore };
}

export default function ShadowGuard() {
  const [locked, setLocked] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [identityScore, setIdentityScore] = useState(95);
  const [threatResult, setThreatResult] = useState(null);
  const [neutralized, setNeutralized] = useState(null);
  const [inputText, setInputText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlResult, setUrlResult] = useState(null);
  const [secretInput, setSecretInput] = useState("");
  const [secretError, setSecretError] = useState(false);
  const [secretSuccess, setSecretSuccess] = useState(false);
  const [threats, setThreats] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [phishingPatterns, setPhishingPatterns] = useState(DEFAULT_PHISHING_PATTERNS);
  const [socialPatterns, setSocialPatterns] = useState(DEFAULT_SOCIAL_PATTERNS);
  const [blocklist, setBlocklist] = useState([
    { id: "b1", value: "free-money.xyz", type: "url", addedAt: new Date().toLocaleTimeString() },
    { id: "b2", value: "verify-paypal-now", type: "keyword", addedAt: new Date().toLocaleTimeString() },
  ]);
  const [newBlockEntry, setNewBlockEntry] = useState("");
  const [blockType, setBlockType] = useState("keyword");
  const [neutralizeAnim, setNeutralizeAnim] = useState(false);
  const { record, getScore } = useTypingBehavior();

  useEffect(() => {
    const iv = setInterval(() => {
      setIdentityScore(prev => {
        const drift = (Math.random() - 0.48) * 2;
        const next = Math.max(20, Math.min(100, prev * 0.85 + getScore() * 0.15 + drift));
        if (next < 60 && !locked) {
          setLocked(true); setShieldActive(true);
          addThreat("🔒 Auto-lock triggered — Identity confidence critical", "lock");
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(iv);
  }, [locked, getScore]);

  useEffect(() => {
    let seq = [];
    const handler = (e) => {
      seq = [...seq, e.key].slice(-SECRET_SEQUENCE.length);
      if (seq.join(",") === SECRET_SEQUENCE.join(",")) handleUnlock("sequence");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const typeColor = { ok: "#00ffaa", warn: "#ffcc00", danger: "#ff4444", lock: "#ff6644", block: "#aa66ff" };

  function addThreat(msg, type = "warn") {
    setThreats(prev => [{ id: Date.now(), msg, type, time: new Date().toLocaleTimeString(), neutralized: false }, ...prev].slice(0, 20));
  }

  function handleUnlock(method) {
    setLocked(false); setShieldActive(false); setSecretSuccess(true); setSecretError(false); setIdentityScore(95);
    addThreat(`✅ Unlocked via ${method === "sequence" ? "key sequence" : "passphrase"}`, "ok");
    setTimeout(() => setSecretSuccess(false), 3000);
  }

  function handleSecretSubmit() {
    const val = secretInput.trim().toLowerCase();
    if ((val === "shadowguard unlock" || val === "i am the owner") && getScore() > 45) {
      handleUnlock("passphrase"); setSecretInput("");
    } else {
      setSecretError(true);
      addThreat("⚠️ Failed unlock — behavioral mismatch", "warn");
      setTimeout(() => setSecretError(false), 2000);
    }
  }

  function handleAnalyze() {
    if (!inputText.trim()) return;
    const result = analyzeThreat(inputText, phishingPatterns, socialPatterns, blocklist);
    setThreatResult(result); setNeutralized(null);
    if (result.score >= 50) { addThreat(`🚨 High-risk content detected (${result.score}%)`, "danger"); setShieldActive(true); setTimeout(() => setShieldActive(false), 4000); }
  }

  function handleNeutralize() {
    if (!inputText.trim()) return;
    setNeutralized(neutralizeText(inputText, phishingPatterns, socialPatterns, blocklist));
    setNeutralizeAnim(true);
    addThreat("🧹 Threat neutralized — dangerous content redacted", "ok");
    setTimeout(() => setNeutralizeAnim(false), 800);
  }

  function handleBlockFromAnalysis() {
    if (!inputText.trim()) return;
    const phrase = inputText.trim().split(/\s+/).slice(0, 5).join(" ");
    addToBlocklist(phrase, "keyword");
    addThreat(`🚫 Blocked: "${phrase.slice(0, 40)}"`, "block");
    setThreatResult(prev => prev ? { ...prev, blocked: true } : prev);
  }

  function handleUrlCheck() {
    if (!urlInput.trim()) return;
    const result = analyzeThreat(urlInput, phishingPatterns, socialPatterns, blocklist);
    const hasPhishing = phishingPatterns.filter(p => !p.disabled).some(p => p.regex.test(urlInput));
    const final = { ...result, score: hasPhishing ? Math.max(result.score, 60) : result.score };
    setUrlResult(final);
    if (final.score > 40) addThreat(`🌐 Suspicious URL intercepted`, "danger");
  }

  function handleBlockUrl() {
    if (!urlInput.trim()) return;
    addToBlocklist(urlInput.trim(), "url");
    addThreat(`🚫 URL permanently blocked`, "block");
    setUrlResult(prev => prev ? { ...prev, blocked: true } : prev);
  }

  function addToBlocklist(value, type) {
    setBlocklist(prev => [{ id: "b" + Date.now(), value, type, addedAt: new Date().toLocaleTimeString() }, ...prev]);
  }

  function removeFromBlocklist(id) {
    setBlocklist(prev => prev.filter(b => b.id !== id));
    addThreat("🔓 Entry removed from blocklist", "ok");
  }

  const scoreColor = identityScore > 75 ? "#00ffaa" : identityScore > 50 ? "#ffcc00" : "#ff4444";
  const scoreLabel = identityScore > 75 ? "SECURE" : identityScore > 50 ? "CAUTION" : "THREAT";

  const Btn = ({ onClick, color, border, children, style = {} }) => (
    <button onClick={onClick} style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color, padding: "11px 20px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", letterSpacing: 1, transition: "all 0.2s", ...style }}>{children}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#030a14", fontFamily: "'Courier New', monospace", color: "#c8d8e8", overflow: locked ? "hidden" : "auto" }}>

      {shieldActive && !locked && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ textAlign: "center", animation: "pulse 1s infinite" }}>
            <div style={{ fontSize: 64 }}>🛡️</div>
            <div style={{ color: "#00ffaa", fontSize: 22, fontWeight: "bold", letterSpacing: 4 }}>PRIVACY SHIELD ACTIVE</div>
            <div style={{ color: "#888", marginTop: 8, fontSize: 13 }}>Screen protected · Threats neutralized</div>
          </div>
        </div>
      )}

      {locked && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "radial-gradient(ellipse at center,#0a0f1a 0%,#000 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", border: "3px solid #ff4444", boxShadow: "0 0 40px #ff444488,inset 0 0 40px #ff111122", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, animation: "spinSlow 4s linear infinite" }}>🔒</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#ff4444", fontSize: 28, fontWeight: "bold", letterSpacing: 6 }}>SESSION LOCKED</div>
            <div style={{ color: "#666", marginTop: 6, fontSize: 13 }}>Identity confidence critically low.</div>
          </div>
          <div style={{ background: "#0d1520", border: "1px solid #1e3a5f", borderRadius: 12, padding: "28px 36px", display: "flex", flexDirection: "column", gap: 14, width: 340 }}>
            <div style={{ color: "#4a9eff", fontSize: 12, letterSpacing: 3 }}>BEHAVIORAL PASSPHRASE</div>
            <input value={secretInput} onChange={e => { setSecretInput(e.target.value); record(e); }} onKeyDown={e => { record(e); if (e.key === "Enter") handleSecretSubmit(); }} type="password" placeholder="Type your secret phrase..."
              style={{ background: secretError ? "#1a0505" : "#060e1a", border: `1px solid ${secretError ? "#ff4444" : secretSuccess ? "#00ffaa" : "#1e3a5f"}`, borderRadius: 8, padding: "12px 16px", color: "#c8d8e8", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
            <button onClick={handleSecretSubmit} style={{ background: "linear-gradient(135deg,#1a4a7a,#0d2a4a)", border: "1px solid #2a6aaa", borderRadius: 8, color: "#4a9eff", padding: 12, cursor: "pointer", fontSize: 13, fontFamily: "inherit", letterSpacing: 2 }}>VERIFY IDENTITY</button>
            {secretError && <div style={{ color: "#ff4444", fontSize: 12, textAlign: "center" }}>⚠ Behavioral mismatch</div>}
            {secretSuccess && <div style={{ color: "#00ffaa", fontSize: 12, textAlign: "center" }}>✓ Identity confirmed</div>}
            <div style={{ color: "#333", fontSize: 11, textAlign: "center" }}>Hint: "shadowguard unlock" · or ↑↑↓↓←→</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0a1628 0%,#030a14 100%)", borderBottom: "1px solid #1e3a5f", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#4a9eff", letterSpacing: 3 }}>SHADOWGUARD</div>
            <div style={{ fontSize: 10, color: "#3a6a9f", letterSpacing: 2 }}>DETECT · NEUTRALIZE · BLOCK</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#3a6a9f", letterSpacing: 2 }}>IDENTITY</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: scoreColor }}>{Math.round(identityScore)}% <span style={{ fontSize: 10 }}>{scoreLabel}</span></div>
          </div>
          <button onClick={() => setShieldActive(s => !s)} style={{ background: shieldActive ? "#0a2a1a" : "#0a1628", border: `1px solid ${shieldActive ? "#00ffaa" : "#1e3a5f"}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: shieldActive ? "#00ffaa" : "#3a6a9f", fontSize: 11, fontFamily: "inherit" }}>{shieldActive ? "🟢 SHIELD" : "⚫ SHIELD"}</button>
          <button onClick={() => setLocked(true)} style={{ background: "#0a0f1a", border: "1px solid #ff444466", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#ff4444", fontSize: 11, fontFamily: "inherit" }}>🔒 LOCK</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e3a5f", background: "#060e1a", overflowX: "auto" }}>
        {[["dashboard","📊 DASHBOARD"],["threat-analyzer","🔍 ANALYZER"],["url-scanner","🌐 URL SCANNER"],["blocklist",`🚫 BLOCKLIST (${blocklist.length})`],["threat-log",`📋 LOG (${threats.length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#0a1628" : "transparent", border: "none", borderBottom: tab === t ? "2px solid #4a9eff" : "2px solid transparent", color: tab === t ? "#4a9eff" : "#3a6a9f", padding: "12px 18px", cursor: "pointer", fontSize: 10, fontFamily: "inherit", letterSpacing: 1, whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 24, gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3, marginBottom: 14 }}>REAL-TIME IDENTITY CONFIDENCE</div>
              <div style={{ height: 12, background: "#060e1a", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${identityScore}%`, background: `linear-gradient(90deg,${scoreColor}88,${scoreColor})`, borderRadius: 6, transition: "width 1s ease", boxShadow: `0 0 12px ${scoreColor}66` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "#ff4444" }}>0% CRITICAL</span>
                <span style={{ fontSize: 13, color: scoreColor, fontWeight: "bold" }}>{Math.round(identityScore)}% — {scoreLabel}</span>
                <span style={{ fontSize: 11, color: "#00ffaa" }}>100% SECURE</span>
              </div>
            </div>
            {[
              { icon: "🤖", label: "AI Threat Predictor", val: "ACTIVE", color: "#00ffaa" },
              { icon: "🧹", label: "Threat Neutralizer", val: "ARMED", color: "#4a9eff" },
              { icon: "🚫", label: "Blocklist Engine", val: `${blocklist.length} ENTRIES`, color: "#aa66ff" },
              { icon: "🌫️", label: "Privacy Shield", val: shieldActive ? "ENGAGED" : "STANDBY", color: shieldActive ? "#00ffaa" : "#ffcc00" },
            ].map(c => (
              <div key={c.label} style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 22, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 30 }}>{c.icon}</span>
                <div>
                  <div style={{ color: "#7a9abf", fontSize: 11, letterSpacing: 2 }}>{c.label}</div>
                  <div style={{ color: c.color, fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginTop: 4 }}>● {c.val}</div>
                </div>
              </div>
            ))}
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 22, gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3, marginBottom: 10 }}>LATEST EVENTS</div>
              {threats.length === 0 ? <div style={{ color: "#2a4a6f", fontSize: 13 }}>No threats detected. System clear.</div>
                : threats.slice(0, 4).map(t => (
                  <div key={t.id} style={{ padding: "7px 12px", borderLeft: `2px solid ${typeColor[t.type] || "#1e3a5f"}`, marginBottom: 7, fontSize: 12, color: "#7a9abf", opacity: t.neutralized ? 0.4 : 1 }}>
                    <span style={{ color: "#3a6a9f", marginRight: 8 }}>[{t.time}]</span>{t.msg}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* THREAT ANALYZER */}
        {tab === "threat-analyzer" && (
          <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 28 }}>
            <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3, marginBottom: 6 }}>🔍 AI THREAT ANALYZER</div>
            <div style={{ fontSize: 12, color: "#2a5a8f", marginBottom: 14 }}>Paste any suspicious message, email, or text. Then analyze, neutralize, or block it.</div>
            <textarea value={inputText} onChange={e => { setInputText(e.target.value); record(e); }} onKeyDown={record} placeholder="Paste suspicious content here..." rows={6}
              style={{ width: "100%", background: "#060e1a", border: "1px solid #1e3a5f", borderRadius: 8, padding: 16, color: "#c8d8e8", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <Btn onClick={handleAnalyze} color="#4a9eff" border="#2a6aaa">🔍 ANALYZE</Btn>
              <Btn onClick={handleNeutralize} color="#00ffaa" border="#00ffaa55">🧹 NEUTRALIZE</Btn>
              {threatResult && threatResult.score > 30 && !threatResult.blocked && (
                <Btn onClick={handleBlockFromAnalysis} color="#aa66ff" border="#aa66ff55">🚫 BLOCK THREAT</Btn>
              )}
              {inputText && <Btn onClick={() => { setInputText(""); setThreatResult(null); setNeutralized(null); }} color="#ff6644" border="#ff664433">✕ CLEAR</Btn>}
            </div>

            {threatResult && (
              <div style={{ marginTop: 20, padding: 20, background: threatResult.score > 60 ? "#1a0505" : threatResult.score > 30 ? "#1a1405" : "#051a0a", border: `1px solid ${threatResult.score > 60 ? "#ff4444" : threatResult.score > 30 ? "#ffcc00" : "#00ffaa"}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: "bold", color: threatResult.score > 60 ? "#ff4444" : threatResult.score > 30 ? "#ffcc00" : "#00ffaa" }}>{threatResult.score}% THREAT SCORE</div>
                    <div style={{ fontSize: 12, color: "#7a9abf", marginTop: 4 }}>
                      {threatResult.score > 60 ? "⛔ HIGH RISK — Do NOT engage with this content"
                        : threatResult.score > 30 ? "⚠️ MODERATE RISK — Proceed with caution"
                        : "✅ LOW RISK — Content appears safe"}
                    </div>
                  </div>
                  {threatResult.blocked && <span style={{ color: "#aa66ff", fontSize: 11, border: "1px solid #aa66ff44", borderRadius: 6, padding: "4px 10px" }}>🚫 BLOCKED</span>}
                </div>
                {threatResult.flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#ff8844", marginTop: 5 }}>▸ {f}</div>)}
              </div>
            )}

            {neutralized && (
              <div style={{ marginTop: 16, padding: 20, background: "#051510", border: "1px solid #00ffaa44", borderRadius: 8, animation: neutralizeAnim ? "flashGreen 0.6s" : "none" }}>
                <div style={{ fontSize: 11, color: "#00ffaa", letterSpacing: 2, marginBottom: 10 }}>🧹 NEUTRALIZED — SAFE VERSION</div>
                <div style={{ fontSize: 13, color: "#7a9abf", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>{neutralized}</div>
                <div style={{ marginTop: 10, fontSize: 11, color: "#2a6a4f" }}>All dangerous patterns redacted with ████. URLs removed.</div>
              </div>
            )}
          </div>
        )}

        {/* URL SCANNER */}
        {tab === "url-scanner" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3, marginBottom: 14 }}>🌐 PHISHING URL INTERCEPTOR</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUrlCheck()} placeholder="https://suspicious-link.xyz/login?verify=now"
                  style={{ flex: 1, minWidth: 200, background: "#060e1a", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 16px", color: "#c8d8e8", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <Btn onClick={handleUrlCheck} color="#4a9eff" border="#2a6aaa">🔍 SCAN</Btn>
                <Btn onClick={handleBlockUrl} color="#aa66ff" border="#aa66ff55">🚫 BLOCK URL</Btn>
              </div>

              {urlResult && (
                <div style={{ marginTop: 18, padding: 20, background: urlResult.score > 40 ? "#1a0505" : "#051a0a", border: `1px solid ${urlResult.score > 40 ? "#ff4444" : "#00ffaa"}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: urlResult.score > 40 ? "#ff4444" : "#00ffaa" }}>
                      {urlResult.blocklisted ? "🚫 IN BLOCKLIST" : urlResult.score > 40 ? "🚫 PHISHING DETECTED" : "✅ URL APPEARS SAFE"}
                    </div>
                    {urlResult.blocked && <span style={{ color: "#aa66ff", fontSize: 11, border: "1px solid #aa66ff44", borderRadius: 6, padding: "4px 10px" }}>ADDED TO BLOCKLIST</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#7a9abf", marginTop: 6 }}>Threat score: {urlResult.score}%</div>
                  {urlResult.flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#ff8844", marginTop: 4 }}>▸ {f}</div>)}
                </div>
              )}
            </div>

            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3, marginBottom: 12 }}>DETECTION PATTERNS ({phishingPatterns.filter(p => !p.disabled).length}/{phishingPatterns.length} active)</div>
              {phishingPatterns.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: p.disabled ? "#1a2a3f" : "#3a6a9f" }}>▸ {p.label}</div>
                  <button onClick={() => setPhishingPatterns(prev => prev.map(x => x.id === p.id ? { ...x, disabled: !x.disabled } : x))}
                    style={{ background: "transparent", border: `1px solid ${p.disabled ? "#1e3a5f" : "#ff444444"}`, borderRadius: 4, color: p.disabled ? "#2a4a6f" : "#ff6644", padding: "3px 10px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>
                    {p.disabled ? "ENABLE" : "DISABLE"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOCKLIST */}
        {tab === "blocklist" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3, marginBottom: 6 }}>🚫 PERMANENT THREAT BLOCKLIST</div>
              <div style={{ fontSize: 12, color: "#2a5a8f", marginBottom: 18 }}>Blocked entries score 100% instantly. Any matching content is flagged and neutralized automatically.</div>

              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <input value={newBlockEntry} onChange={e => setNewBlockEntry(e.target.value)} onKeyDown={e => e.key === "Enter" && (() => { if (newBlockEntry.trim()) { addToBlocklist(newBlockEntry.trim(), blockType); addThreat(`🚫 Blocked: "${newBlockEntry.trim().slice(0,40)}"`, "block"); setNewBlockEntry(""); } })()} placeholder="URL, keyword, or phrase to permanently block..."
                  style={{ flex: 1, minWidth: 200, background: "#060e1a", border: "1px solid #1e3a5f", borderRadius: 8, padding: "11px 16px", color: "#c8d8e8", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <select value={blockType} onChange={e => setBlockType(e.target.value)}
                  style={{ background: "#060e1a", border: "1px solid #1e3a5f", borderRadius: 8, padding: "11px 12px", color: "#7a9abf", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  <option value="keyword">KEYWORD</option>
                  <option value="url">URL</option>
                  <option value="pattern">PATTERN</option>
                </select>
                <Btn onClick={() => { if (newBlockEntry.trim()) { addToBlocklist(newBlockEntry.trim(), blockType); addThreat(`🚫 Blocked: "${newBlockEntry.trim().slice(0,40)}"`, "block"); setNewBlockEntry(""); } }} color="#aa66ff" border="#aa66ff88">+ ADD BLOCK</Btn>
              </div>

              {blocklist.length === 0
                ? <div style={{ color: "#2a4a6f", textAlign: "center", padding: 40, fontSize: 13 }}>Blocklist is empty.</div>
                : blocklist.map(b => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#060e1a", borderLeft: "3px solid #aa66ff", borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "#aa66ff", border: "1px solid #aa66ff44", borderRadius: 4, padding: "2px 7px" }}>{b.type.toUpperCase()}</span>
                        <span style={{ fontSize: 13, color: "#c8d8e8" }}>{b.value}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#3a6a9f" }}>Blocked at {b.addedAt}</div>
                    </div>
                    <button onClick={() => removeFromBlocklist(b.id)} style={{ background: "transparent", border: "1px solid #ff444433", borderRadius: 6, color: "#ff6644", padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>✕ REMOVE</button>
                  </div>
                ))}
            </div>

            <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 22, display: "flex", gap: 32 }}>
              {[["Total Blocked", blocklist.length, "#aa66ff"], ["URLs", blocklist.filter(b => b.type === "url").length, "#ff6644"], ["Keywords", blocklist.filter(b => b.type === "keyword").length, "#ffcc00"], ["Patterns", blocklist.filter(b => b.type === "pattern").length, "#4a9eff"]].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: "#3a6a9f", letterSpacing: 2 }}>{l}</div>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: c, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* THREAT LOG */}
        {tab === "threat-log" && (
          <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#3a6a9f", letterSpacing: 3 }}>📋 THREAT EVENT LOG ({threats.length})</div>
              <button onClick={() => setThreats([])} style={{ background: "transparent", border: "1px solid #1e3a5f", borderRadius: 6, color: "#3a6a9f", padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>CLEAR ALL</button>
            </div>
            {threats.length === 0
              ? <div style={{ color: "#2a4a6f", fontSize: 13, textAlign: "center", padding: 40 }}>No events recorded. System is clear.</div>
              : threats.map(t => (
                <div key={t.id} style={{ padding: "11px 16px", borderLeft: `3px solid ${typeColor[t.type] || "#1e3a5f"}`, borderBottom: "1px solid #0e2040", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: t.neutralized ? 0.4 : 1 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#3a6a9f" }}>{t.time}</div>
                    <div style={{ fontSize: 13, color: "#7a9abf", marginTop: 2 }}>{t.msg}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginLeft: 16, flexShrink: 0 }}>
                    {!t.neutralized && t.type === "danger" && (
                      <button onClick={() => setThreats(prev => prev.map(x => x.id === t.id ? { ...x, neutralized: true } : x))}
                        style={{ background: "transparent", border: "1px solid #00ffaa33", borderRadius: 6, color: "#00ffaa", padding: "4px 10px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>🧹 NEUTRALIZE</button>
                    )}
                    {t.neutralized && <span style={{ fontSize: 11, color: "#00ffaa" }}>✓ neutralized</span>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes flashGreen{0%{box-shadow:0 0 0 #00ffaa}50%{box-shadow:0 0 30px #00ffaa88}100%{box-shadow:0 0 0 #00ffaa}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#030a14}
        ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
      `}</style>
    </div>
  );
}