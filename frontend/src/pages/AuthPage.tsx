import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type User } from '../auth/AuthContext';
import { post } from '../lib/api';
import AuthCodeForm from '../components/AuthCodeForm';
import { useSite } from '../context/SiteContext';

const UNIVERSITIES = [
  'Information Technology University (ITU)',
  'Quaid-i-Azam University (QAU)',
  'National University of Sciences & Technology (NUST)',
  'Lahore University of Management Sciences (LUMS)',
  'Pakistan Institute of Engineering & Applied Sciences (PIEAS)',
  'University of the Punjab (PU)',
  'COMSATS University Islamabad (CUI)',
  'Aga Khan University (AKU)',
  'University of Engineering & Technology Lahore (UET Lahore)',
  'University of Agriculture Faisalabad (UAF)',
  'Ghulam Ishaq Khan Institute (GIKI)',
  'FAST National University of Computer & Emerging Sciences (FAST-NUCES)',
  'NED University of Engineering & Technology (NED)',
  'Government College University Lahore (GCU Lahore)',
  'University of Karachi (UoK)',
  'University of Peshawar (UoP)',
  'Bahauddin Zakariya University (BZU)',
  'Institute of Space Technology (IST)',
  'Institute of Business Administration Karachi (IBA Karachi)',
  'Air University (AU)',
  'University of Engineering & Technology Taxila (UET Taxila)',
  'Government College University Faisalabad (GCUF)',
  'University of Lahore (UoL)',
  'University of Veterinary and Animal Sciences (UVAS)',
  'University of Management and Technology (UMT)',
  'Bahria University (BU)',
  'National University of Modern Languages (NUML)',
  'Riphah International University (RIU)',
  'University of Sargodha (UoS)',
  'Habib University (HU)',
  'University of Engineering & Technology Peshawar (UET Peshawar)',
  'IBA Sukkur (IBA Sukkur)',
  'National Textile University (NTU)',
  'University of Central Punjab (UCP)',
  'Kinnaird College for Women University (KCWU)',
  'Lahore College for Women University (LCWU)',
  'Forman Christian College University (FCCU)',
  'University of Gujrat (UoG)',
  'University of Haripur (UoH)',
  'International Islamic University Islamabad (IIUI)',
  'Capital University of Science and Technology (CUST)',
  'University of Malakand (UoM)',
  'University of Swat (UoSwat)',
  'University of Sindh (USINDH)',
  'Mehran University of Engineering & Technology (MUET)',
  'National University of Technology (NUTECH)',
  'Superior University (SU)',
  'Fatima Jinnah Women University (FJWU)',
  'University of Education Lahore (UE)',
  'University of Balochistan (UoB)',
  'Dow University of Health Sciences (DUHS)',
  'Khyber Medical University (KMU)',
  'King Edward Medical University (KEMU)',
  'Fatima Jinnah Medical University (FJMU)',
  'University of Health Sciences Lahore (UHS)',
  'Rawalpindi Medical University (RMU)',
  'Shaheed Zulfiqar Ali Bhutto Medical University (SZABMU)',
  'Liaquat University of Medical & Health Sciences (LUMHS)',
  'Bolan University of Medical & Health Sciences (BUMHS)',
  'University of Azad Jammu and Kashmir (UAJK)',
  'Karakoram International University (KIU)',
  'University of Baltistan (UoBA)',
  'Mirpur University of Science and Technology (MUST)',
  'University of Kotli AJK (UoKotli)',
  'University of Poonch Rawalakot (UPR)',
  'University of Swabi (UoSwabi)',
  'Abdul Wali Khan University Mardan (AWKUM)',
  'Hazara University (HU Mansehra)',
  'Gomal University (GU)',
  'Kohat University of Science & Technology (KUST)',
  'University of Chitral (UoC)',
  'Shaheed Benazir Bhutto Women University Peshawar (SBBWUP)',
  'University of Turbat (UoT)',
  'Sardar Bahadur Khan Women\'s University (SBKWU)',
  'Lasbela University of Agriculture Water and Marine Sciences (LUAWMS)',
  'Balochistan University of IT Engineering & Management Sciences (BUITEMS)',
  'University of Larkana (UoLarkana)',
  'Shah Abdul Latif University (SALU)',
  'Sukkur IBA University (SIBAУ)',
  'Benazir Bhutto Shaheed University Lyari (BBSUL)',
  'Dawood University of Engineering & Technology (DUET)',
  'Federal Urdu University of Arts Science & Technology (FUUAST)',
  'Institute of Business Management (IoBM)',
  'Sir Syed University of Engineering & Technology (SSUET)',
  'Hamdard University (HamdardU)',
  'Ziauddin University (ZU)',
  'Indus University (IU)',
  'Karachi Institute of Economics & Technology (KIET)',
  'Jinnah University for Women (JUW)',
  'Greenwich University Pakistan (GUP)',
  'Beaconhouse National University (BNU)',
  'Allama Iqbal Open University (AIOU)',
  'Virtual University of Pakistan (VU)'
];

function fuzzyScore(query: string, target: string) {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 1;

  const qWords = q.split(/\s+/);
  const tWords = t.split(/[\s()&,/]+/);
  const allTokensMatch = qWords.every(qw =>
    tWords.some(tw => tw.startsWith(qw) || tw.includes(qw))
  );
  if (allTokensMatch) return 0.9;

  function bigrams(str: string) { const b = new Set(); for (let i = 0; i < str.length - 1; i++) b.add(str.slice(i, i + 2)); return b; }
  const qBi = bigrams(q);
  const tBi = bigrams(t);
  let inter = 0;
  qBi.forEach(b => { if (tBi.has(b)) inter++; });
  const bigramSim = (2 * inter) / (qBi.size + tBi.size + 0.001);
  if (bigramSim > 0.25) return bigramSim;

  let matched = 0;
  const tChars = t.split('');
  for (const c of q) {
    const idx = tChars.indexOf(c);
    if (idx !== -1) { matched++; tChars.splice(idx, 1); }
  }
  const coverage = matched / q.length;
  if (coverage > 0.7) return coverage * 0.6;

  return 0;
}

// ── OTP Verification View ──────────────────────────────────────────────────
function OtpView({ email, notice, onLogin, onBack }: { email: string; notice?: string; onLogin: (u: User) => void; onBack: () => void }) {
  const { settings: { logoUrl, societyName } } = useSite();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setCode(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.join('');
    if (token.length < 6) { setError('Enter the 6-digit code.'); return; }
    setBusy(true); setError('');
    try {
      const result = await post<{ user: User }>('/auth/verify', { email, token });
      onLogin(result.user);
    } catch (err) { setError(err instanceof Error ? err.message : 'Invalid code. Try again.'); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setError(''); setResent(false);
    try {
      await post('/auth/resend', { email });
      setResent(true); setCode(['', '', '', '', '', '']);
      // Focus after the disabled state clears, otherwise focus() is a no-op.
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not resend code.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="card otp-card">
      <div className="card-logo"><img src={logoUrl} alt={societyName} /></div>
      <div className="card-header">
        <h1>Verify your email</h1>
        <p>We sent a 6-digit code to</p>
        <p className="otp-email">{email}</p>
      </div>
      {notice && <p className="form-message otp-resent" role="status">{notice}</p>}
      {error && <p className="form-message" role="alert">{error}</p>}
      {resent && <p className="form-message otp-resent" role="status">If this address is still awaiting verification, a new code is on its way.</p>}
      {notice ? (
        <button type="button" className="btn-submit" onClick={onBack}>Back to sign in</button>
      ) : (
        <>
          <form onSubmit={submit} className="otp-form">
            <div className="otp-inputs" onPaste={handlePaste}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`otp-box ${d ? 'otp-box--filled' : ''}`}
                  aria-label={`Digit ${i + 1}`}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  autoFocus={i === 0}
                  disabled={busy}
                />
              ))}
            </div>
            <button type="submit" className="btn-submit" disabled={busy || code.join('').length < 6}>
              {busy ? 'Verifying…' : 'Verify Email'}
            </button>
          </form>
          <p className="card-footer-text">
            Didn't receive a code?{' '}
            <button type="button" disabled={busy} onClick={() => void resend()}>Resend code</button>
          </p>
          <p className="card-footer-text">
            Already have an account?{' '}
            <button type="button" disabled={busy} onClick={onBack}>Sign in instead</button>
          </p>
        </>
      )}
    </div>
  );
}

// Shown in the university field but never stored: "no affiliation" must be
// saved as an empty string, not as this UI label.
const NO_UNI_LABEL = "— No University Affiliation —";

export default function AuthPage() {
  const [view, setView] = useState<"login" | "signup" | "otp">("login");
  const [flow, setFlow] = useState<'forgot' | null>(null);
  const [otpEmail, setOtpEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuth();
  const { settings: { logoUrl, societyName } } = useSite();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/member', { replace: true });
      }
    }
  }, [user, navigate]);
  const signedIn = (user: User) => { setUser(user); };
  const submit = async (event: FormEvent<HTMLFormElement>, signup: boolean) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(''); setBusy(true);
    try {
      if (signup) {
        const termsChecked = (form.querySelector('input[name="terms"]') as HTMLInputElement)?.checked;
        if (!termsChecked) { setError('You must accept the Terms of Service and Privacy Policy.'); setBusy(false); return; }
        const pw = String(data.get('password') ?? '');
        if (pw.length < 8) { setError('Password must be at least 8 characters.'); setBusy(false); return; }
        if (!/[a-zA-Z]/.test(pw)) { setError('Password must contain at least one letter.'); setBusy(false); return; }
        if (!/[0-9]/.test(pw)) { setError('Password must contain at least one number.'); setBusy(false); return; }
        if (data.get('password') !== data.get('confirmPassword')) throw new Error('Passwords do not match.');
        const emailVal = String(data.get('email') ?? '');
        await post('/auth/signup', {
          email: emailVal, password: data.get('password'), fullName: data.get('fullName'),
          university: showOtherUniInput ? data.get('otherUniversity') : (uniQuery === NO_UNI_LABEL ? '' : uniQuery),
          phone: String(data.get('phone') ?? '').replace(/\s+/g, ''), termsAccepted: true
        });
        form.reset(); setUniQuery(''); setShowOtherUniInput(false);
        setOtpEmail(emailVal); setView('otp');
      } else {
        const result = await post<{ user: User }>('/auth/login', { email: data.get('email'), password: data.get('password') });
        form.reset(); signedIn(result.user);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to continue. Please try again.'); }
    finally { setBusy(false); }
  };
  const [loginPwVisible, setLoginPwVisible] = useState(false);
  const [signupPwVisible, setSignupPwVisible] = useState(false);
  const [signupPw2Visible, setSignupPw2Visible] = useState(false);

  const [uniQuery, setUniQuery] = useState("");
  const [isUniDropdownOpen, setIsUniDropdownOpen] = useState(false);
  const [showOtherUniInput, setShowOtherUniInput] = useState(false);
  const uniWrapRef = useRef<HTMLDivElement>(null);
  // Index of the keyboard-highlighted option: 0 = "no university",
  // 1..n = filtered universities, n+1 = "Other".
  const [uniActive, setUniActive] = useState(-1);

  useEffect(() => {
    document.body.classList.toggle('show-signup', view === 'signup');
    document.body.classList.toggle('show-otp', view === 'otp');
    document.body.classList.add('auth-page-active');
    return () => {
      document.body.classList.remove('show-signup');
      document.body.classList.remove('show-otp');
      document.body.classList.remove('auth-page-active');
    };
  }, [view]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uniWrapRef.current && !uniWrapRef.current.contains(e.target as Node)) {
        setIsUniDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const scoredUnis = UNIVERSITIES
    .map(u => ({ u, score: fuzzyScore(uniQuery === 'Other' ? '' : uniQuery, u) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const displayUnis = (!uniQuery || uniQuery === 'Other')
    ? UNIVERSITIES
    : scoredUnis.filter(({ score }) => score > 0.18).map(({ u }) => u);

  const selectUni = (val: string, isOther: boolean) => {
    if (isOther) {
      setUniQuery('Other');
      setShowOtherUniInput(true);
    } else {
      setUniQuery(val);
      setShowOtherUniInput(false);
    }
    setUniActive(-1);
    setIsUniDropdownOpen(false);
  };

  return (
    <main className="auth-page">
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>
      <div className="glow glow-3"></div>

      <div className="deco-grid" style={{ top: "24px", left: "24px" }}></div>
      <div className="deco-grid" style={{ bottom: "24px", right: "24px" }}></div>

      <div className="deco-dots" style={{ top: "110px", right: "90px" }}>
        <span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div className="deco-dots" style={{ bottom: "120px", left: "80px" }}>
        <span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span>
      </div>

      <Link to="/" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
        Home
      </Link>

      {/* LOGIN VIEW */}
      <div className="view" id="view-login" aria-hidden={view !== 'login'} ref={element => element?.toggleAttribute('inert', view !== 'login')}>
        <div className={`card ${flow ? 'forgot-card' : ''}`}>
          <div className="card-logo">
            <img src={logoUrl} alt={societyName} />
          </div>

          {flow ? <AuthCodeForm key={flow} flow={flow} initialEmail="" onLogin={signedIn} onBack={() => { setFlow(null); setError(''); }} /> : <>
            <div className="card-header">
              <h1>Welcome back</h1>
              <p>Enter your credentials to access your account</p>
            </div>

            {error && <p className="form-message" role="alert">{error}</p>}
            <form onSubmit={e => void submit(e, false)}>
              <div className="form-group">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="login-email">Email *</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M510.678 112.275c-2.308-11.626-7.463-22.265-14.662-31.054-1.518-1.915-3.104-3.63-4.823-5.345-12.755-12.818-30.657-20.814-50.214-20.814H71.021c-19.557 0-37.395 7.996-50.21 20.814-1.715 1.715-3.301 3.43-4.823 5.345C8.785 90.009 3.63 100.649 1.386 112.275.464 116.762 0 121.399 0 126.087V385.92c0 9.968 2.114 19.55 5.884 28.203 3.497 8.26 8.653 15.734 14.926 22.001 1.59 1.586 3.169 3.044 4.892 4.494 12.286 10.175 28.145 16.32 45.319 16.32h369.958c17.18 0 33.108-6.145 45.323-16.384 1.718-1.386 3.305-2.844 4.891-4.43 6.27-6.267 11.425-13.741 14.994-22.001v-.064c3.769-8.653 5.812-18.171 5.812-28.138V126.087c0-4.688-.457-9.325-1.322-13.812ZM46.509 101.571c6.345-6.338 14.866-10.175 24.512-10.175h369.958c9.646 0 18.242 3.837 24.512 10.175 1.122 1.129 2.179 2.387 3.112 3.637L274.696 274.203c-5.348 4.687-11.954 7.002-18.696 7.002-6.674 0-13.276-2.315-18.695-7.002L43.472 105.136c.858-1.25 1.915-2.436 3.037-3.565ZM36.334 385.92V142.735L176.658 265.15 36.405 387.435c-.071-.464-.071-.986-.071-1.515Zm404.645 34.677H71.021c-6.281 0-12.158-1.651-17.174-4.552l147.978-128.959 13.815 12.018c11.561 10.046 26.028 15.134 40.36 15.134 14.406 0 28.872-5.088 40.432-15.134l13.808-12.018 147.92 128.959c-5.023 2.901-10.9 4.552-17.181 4.552Zm34.687-34.677c0 .529 0 1.051-.068 1.515L335.346 265.221 475.666 142.8v243.12Z" /></svg>
                    </span>
                    <input id="login-email" name="email" type="email" aria-label="Work Email" placeholder="jane@company.com" autoComplete="email" maxLength={254} required spellCheck={false} />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="login-password">Password *</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M15.6807 14.5869C19.1708 14.5869 22 11.7692 22 8.29344C22 4.81767 19.1708 2 15.6807 2C12.1907 2 9.3615 4.81767 9.3615 8.29344C9.3615 9.90338 10.0963 11.0743 10.0963 11.0743L2.45441 18.6849C2.1115 19.0264 1.63143 19.9143 2.45441 20.7339L3.33616 21.6121C3.67905 21.9048 4.54119 22.3146 5.2466 21.6121L6.27531 20.5876C7.30403 21.6121 8.4797 21.0267 8.92058 20.4412C9.65538 19.4167 8.77362 18.3922 8.77362 18.3922L9.06754 18.0995C10.4783 19.5045 11.7128 18.6849 12.1537 18.0995C12.8885 17.075 12.1537 16.0505 12.1537 16.0505C11.8598 15.465 11.272 15.465 12.0067 14.7333L12.8885 13.8551C13.5939 14.4405 15.0439 14.5869 15.6807 14.5869Z" /><path d="M17.8853 8.29353C17.8853 9.50601 16.8984 10.4889 15.681 10.4889C14.4635 10.4889 13.4766 9.50601 13.4766 8.29353C13.4766 7.08105 14.4635 6.09814 15.681 6.09814C16.8984 6.09814 17.8853 7.08105 17.8853 8.29353Z" /></svg>
                    </span>
                    <input id="login-password" name="password" type={loginPwVisible ? "text" : "password"} aria-label="Password" placeholder="••••••••" autoComplete="current-password" maxLength={128} required />
                    <button type="button" className={`toggle-pw ${loginPwVisible ? 'is-visible' : ''}`} onClick={() => setLoginPwVisible(!loginPwVisible)} aria-label={loginPwVisible ? "Hide password" : "Show password"} aria-pressed={loginPwVisible}>
                      {loginPwVisible ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0013.42 13.42" />
                          <path d="M9.88 5.08A10.94 10.94 0 0112 5c6.5 0 11 7 11 7a17.28 17.28 0 01-5.18 6.38M5.05 5.05A17.38 17.38 0 001 12s3.5 7 11 7a11.62 11.62 0 005.04-1.18" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="forgot-row">
                <button type="button" className="text-action" disabled={busy} onClick={() => { setError(''); setFlow('forgot'); }}>Forgot password?</button>
              </div>

              <button type="submit" className="btn-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
            </form>

            <p className="card-footer-text">
              Don't have an account? <button type="button" disabled={busy} onClick={() => { setView('signup'); setError(''); }}>Sign up</button>
            </p>
          </>}
        </div>
      </div>

      {/* SIGNUP VIEW */}
      <div className="view" id="view-signup" aria-hidden={view !== 'signup'} ref={element => element?.toggleAttribute('inert', view !== 'signup')}>
        <div className="card-wide">
          <div className="card-logo">
            <img src={logoUrl} alt={societyName} />
          </div>

          <div className="card-header">
            <h1>Join ACM</h1>
            <p>Create your account and become part of the community</p>
          </div>

          {error && view === 'signup' && <p className="form-message" role="alert">{error}</p>}
          <form onSubmit={e => void submit(e, true)}>
            <div className="form-group">
              <div className="form-row">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-name">Full Name *</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="6" r="4" /><path d="M19.9975 18C20 17.8358 20 17.669 20 17.5C20 15.0147 16.4183 13 12 13C7.58172 13 4 15.0147 4 17.5C4 19.9853 4 22 12 22C14.231 22 15.8398 21.8433 17 21.5634" /></svg>
                    </span>
                    <input id="signup-name" name="fullName" type="text" aria-label="Full name" placeholder="Jane Smith" autoComplete="name" maxLength={160} required spellCheck={false} />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-university">University *</label>
                  <div className={`uni-wrap ${isUniDropdownOpen ? 'open' : ''}`} ref={uniWrapRef}>
                    <div className="input-wrap">
                      <span className="input-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 11H4.6C4.03995 11 3.75992 11 3.54601 11.109C3.35785 11.2049 3.20487 11.3578 3.10899 11.546C3 11.7599 3 12.0399 3 12.6V21M16.5 11H19.4C19.9601 11 20.2401 11 20.454 11.109C20.6422 11.2049 20.7951 11.3578 20.891 11.546C21 11.7599 21 12.0399 21 12.6V21M16.5 21V6.2C16.5 5.0799 16.5 4.51984 16.282 4.09202C16.0903 3.71569 15.7843 3.40973 15.408 3.21799C14.9802 3 14.4201 3 13.3 3H10.7C9.57989 3 9.01984 3 8.59202 3.21799C8.21569 3.40973 7.90973 3.71569 7.71799 4.09202C7.5 4.51984 7.5 5.07989 7.5 6.2V21M22 21H2M11 7H13M11 11H13M11 15H13" /></svg>
                      </span>
                      <input
                        id="signup-university"
                        type="text"
                        aria-label="Select university" placeholder="Select..."
                        autoComplete="off"
                        spellCheck={false}
                        value={uniQuery}
                        onChange={e => {
                          setUniQuery(e.target.value);
                          setUniActive(-1);
                          if (e.target.value !== 'Other') setShowOtherUniInput(false);
                        }}
                        onFocus={() => setIsUniDropdownOpen(true)}
                        onKeyDown={e => {
                          const count = displayUnis.length + 2; // "none" + universities + "Other"
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            setIsUniDropdownOpen(true);
                            setUniActive(cur => {
                              if (cur < 0) return e.key === 'ArrowDown' ? 0 : count - 1;
                              const next = e.key === 'ArrowDown' ? cur + 1 : cur - 1;
                              return next < 0 ? count - 1 : next >= count ? 0 : next;
                            });
                          } else if (e.key === 'Escape') {
                            setIsUniDropdownOpen(false);
                          } else if (e.key === 'Enter' && isUniDropdownOpen && uniActive >= 0) {
                            // Select instead of submitting the signup form.
                            e.preventDefault();
                            if (uniActive === 0) selectUni(NO_UNI_LABEL, false);
                            else if (uniActive === count - 1) selectUni('other', true);
                            else selectUni(displayUnis[uniActive - 1], false);
                          }
                        }}
                        role="combobox"
                        aria-expanded={isUniDropdownOpen}
                        aria-controls="signup-university-listbox"
                        aria-autocomplete="list"
                        required
                      />
                      <span className="uni-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                      </span>
                    </div>
                    <div className="uni-dropdown" id="signup-university-listbox" role="listbox" aria-label="Universities">
                      <div
                        role="option"
                        aria-selected={uniActive === 0}
                        className={`uni-option special ${uniActive === 0 ? 'uni-option--active' : ''}`}
                        onMouseEnter={() => setUniActive(0)}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectUni(NO_UNI_LABEL, false)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.61995 8.49C5.58995-.169998 18.42-.159997 20.38 8.5c1.15 5.08-2.01 9.38-4.78 12.04-2.01 1.94-5.19 1.94-7.21005 0C5.62995 17.88 2.46995 13.57 3.61995 8.49Z" /><path d="m14 12.96-3.96-3.96m3.92.04L10 13" /></svg> I don't belong to any university
                      </div>

                      {displayUnis.length === 0 && uniQuery !== '' && (
                        <div className="uni-no-results">No close match found — choose "Other" to enter manually</div>
                      )}

                      {displayUnis.map((u, i) => (
                        <div
                          key={u}
                          role="option"
                          aria-selected={uniActive === i + 1}
                          className={`uni-option ${uniActive === i + 1 ? 'uni-option--active' : ''}`}
                          onMouseEnter={() => setUniActive(i + 1)}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => selectUni(u, false)}
                        >{u}</div>
                      ))}

                      <div
                        role="option"
                        aria-selected={uniActive === displayUnis.length + 1}
                        className={`uni-option ${uniActive === displayUnis.length + 1 ? 'uni-option--active' : ''}`}
                        onMouseEnter={() => setUniActive(displayUnis.length + 1)}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectUni('other', true)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "13px", height: "13px", flexShrink: 0, color: "var(--blue)" }} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> Other
                      </div>
                    </div>

                    {showOtherUniInput && (
                      <div className="auth-field" style={{ marginTop: "10px" }}>
                        <label className="auth-label" htmlFor="signup-other-uni">University Name *</label>
                        <div className="input-wrap">
                          <span className="input-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" /></svg>
                          </span>
                          <input id="signup-other-uni" name="otherUniversity" type="text" aria-label="Enter your university name" placeholder="e.g. Stanford University" maxLength={200} required={showOtherUniInput} spellCheck={false} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-email">Email *</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M510.678 112.275c-2.308-11.626-7.463-22.265-14.662-31.054-1.518-1.915-3.104-3.63-4.823-5.345-12.755-12.818-30.657-20.814-50.214-20.814H71.021c-19.557 0-37.395 7.996-50.21 20.814-1.715 1.715-3.301 3.43-4.823 5.345C8.785 90.009 3.63 100.649 1.386 112.275.464 116.762 0 121.399 0 126.087V385.92c0 9.968 2.114 19.55 5.884 28.203 3.497 8.26 8.653 15.734 14.926 22.001 1.59 1.586 3.169 3.044 4.892 4.494 12.286 10.175 28.145 16.32 45.319 16.32h369.958c17.18 0 33.108-6.145 45.323-16.384 1.718-1.386 3.305-2.844 4.891-4.43 6.27-6.267 11.425-13.741 14.994-22.001v-.064c3.769-8.653 5.812-18.171 5.812-28.138V126.087c0-4.688-.457-9.325-1.322-13.812ZM46.509 101.571c6.345-6.338 14.866-10.175 24.512-10.175h369.958c9.646 0 18.242 3.837 24.512 10.175 1.122 1.129 2.179 2.387 3.112 3.637L274.696 274.203c-5.348 4.687-11.954 7.002-18.696 7.002-6.674 0-13.276-2.315-18.695-7.002L43.472 105.136c.858-1.25 1.915-2.436 3.037-3.565ZM36.334 385.92V142.735L176.658 265.15 36.405 387.435c-.071-.464-.071-.986-.071-1.515Zm404.645 34.677H71.021c-6.281 0-12.158-1.651-17.174-4.552l147.978-128.959 13.815 12.018c11.561 10.046 26.028 15.134 40.36 15.134 14.406 0 28.872-5.088 40.432-15.134l13.808-12.018 147.92 128.959c-5.023 2.901-10.9 4.552-17.181 4.552Zm34.687-34.677c0 .529 0 1.051-.068 1.515L335.346 265.221 475.666 142.8v243.12Z" /></svg>
                    </span>
                    <input id="signup-email" name="email" type="email" aria-label="Work Email" placeholder="jane@company.com" autoComplete="email" maxLength={254} required spellCheck={false} />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-phone">Phone Number</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M14 2C14 2 16.2 2.2 19 5C21.8 7.8 22 10 22 10" /><path d="M14.207 5.53564C14.207 5.53564 15.197 5.81849 16.6819 7.30341C18.1668 8.78834 18.4497 9.77829 18.4497 9.77829" /><path d="M4.00655 7.93309C3.93421 9.84122 4.41713 13.0817 7.6677 16.3323C8.45191 17.1165 9.23553 17.7396 10 18.2327M5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4558 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C15.2529 20.0241 14.1963 19.9541 13 19.6111" /></svg>
                    </span>
                    <input id="signup-phone" name="phone" type="tel" aria-label="Phone number" placeholder="+92 300 1234567" autoComplete="tel" maxLength={40} onChange={e => { e.target.value = e.target.value.replace(/\s+/g, ''); }} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-password">Password *</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M15.6807 14.5869C19.1708 14.5869 22 11.7692 22 8.29344C22 4.81767 19.1708 2 15.6807 2C12.1907 2 9.3615 4.81767 9.3615 8.29344C9.3615 9.90338 10.0963 11.0743 10.0963 11.0743L2.45441 18.6849C2.1115 19.0264 1.63143 19.9143 2.45441 20.7339L3.33616 21.6121C3.67905 21.9048 4.54119 22.3146 5.2466 21.6121L6.27531 20.5876C7.30403 21.6121 8.4797 21.0267 8.92058 20.4412C9.65538 19.4167 8.77362 18.3922 8.77362 18.3922L9.06754 18.0995C10.4783 19.5045 11.7128 18.6849 12.1537 18.0995C12.8885 17.075 12.1537 16.0505 12.1537 16.0505C11.8598 15.465 11.272 15.465 12.0067 14.7333L12.8885 13.8551C13.5939 14.4405 15.0439 14.5869 15.6807 14.5869Z" /><path d="M17.8853 8.29353C17.8853 9.50601 16.8984 10.4889 15.681 10.4889C14.4635 10.4889 13.4766 9.50601 13.4766 8.29353C13.4766 7.08105 14.4635 6.09814 15.681 6.09814C16.8984 6.09814 17.8853 7.08105 17.8853 8.29353Z" /></svg>
                    </span>
                    <input id="signup-password" name="password" type={signupPwVisible ? "text" : "password"} aria-label="Create password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} maxLength={128} required />
                    <button type="button" className={`toggle-pw ${signupPwVisible ? 'is-visible' : ''}`} onClick={() => setSignupPwVisible(!signupPwVisible)} aria-label={signupPwVisible ? "Hide password" : "Show password"} aria-pressed={signupPwVisible}>
                      {signupPwVisible ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0013.42 13.42" />
                          <path d="M9.88 5.08A10.94 10.94 0 0112 5c6.5 0 11 7 11 7a17.28 17.28 0 01-5.18 6.38M5.05 5.05A17.38 17.38 0 001 12s3.5 7 11 7a11.62 11.62 0 005.04-1.18" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-confirmPassword">Confirm Password *</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M9.75684 1.98286C9.76631 2.39697 9.43829 2.74034 9.02418 2.74981C6.20248 2.81432 4.87348 3.09895 3.99627 3.97617C3.42588 4.54656 3.09862 5.31824 2.92655 6.59801C2.75159 7.89936 2.75 9.60936 2.75 11.99C2.75 14.3705 2.75159 16.0805 2.92655 17.3819C3.09862 18.6617 3.42588 19.4333 3.99627 20.0037C4.56666 20.5741 5.33834 20.9014 6.61811 21.0735C7.91946 21.2484 9.62946 21.25 12.0101 21.25C14.3906 21.25 16.1006 21.2484 17.402 21.0735C18.6818 20.9014 19.4534 20.5741 20.0238 20.0037C20.9011 19.1265 21.1857 17.7975 21.2502 14.9758C21.2597 14.5617 21.603 14.2337 22.0171 14.2432C22.4312 14.2526 22.7593 14.596 22.7498 15.0101C22.6866 17.7765 22.4374 19.7115 21.0845 21.0644C20.1889 21.9599 19.048 22.3657 17.6019 22.5601C16.189 22.75 14.3782 22.75 12.0674 22.75H11.9527C9.64191 22.75 7.8311 22.75 6.41824 22.5601C4.97214 22.3655 3.83115 21.9599 2.93561 21.0644C2.04006 20.1689 1.63435 19.0279 1.43993 17.5818C1.24998 16.1689 1.24999 14.3581 1.25 12.0473V11.9326C1.24999 9.62181 1.24998 7.811 1.43993 6.39814C1.63435 4.95204 2.04006 3.81105 2.93561 2.91551C4.2885 1.56262 6.22347 1.31345 8.98989 1.2502C9.404 1.24073 9.74737 1.56875 9.75684 1.98286ZM17.2606 2.75C15.0544 2.75 13.2711 4.53036 13.2711 6.72008C13.2711 7.21172 13.3839 7.64295 13.4996 7.95426C13.557 8.10864 13.6137 8.22949 13.6541 8.30858C13.6742 8.348 13.6901 8.37665 13.6997 8.39349L13.7091 8.40964C13.8944 8.70485 13.8506 9.08899 13.6037 9.33493L7.87005 15.0451C7.85527 15.0598 7.82684 15.0936 7.80049 15.1408C7.77466 15.1871 7.75916 15.2314 7.75308 15.2686C7.74754 15.3025 7.74952 15.3303 7.75842 15.358C7.76713 15.3852 7.79159 15.4409 7.87005 15.519L8.50421 16.1506C8.52318 16.1647 8.55267 16.184 8.59 16.2022C8.63879 16.2261 8.68606 16.2411 8.72624 16.2471C8.76432 16.2527 8.78981 16.2495 8.80787 16.2441C8.82312 16.2395 8.85657 16.2266 8.9057 16.1777L9.67724 15.4093C9.96988 15.1178 10.4431 15.1196 10.7357 15.4093C10.8507 15.5237 10.9464 15.5714 11.0148 15.5922C11.0838 15.6133 11.1522 15.6155 11.2227 15.602C11.379 15.5721 11.5211 15.4687 11.5865 15.386C11.677 15.2553 11.6741 15.1418 11.6308 15.0124C11.6067 14.9407 11.5721 14.876 11.5419 14.8284C11.5274 14.8055 11.5155 14.7892 11.5091 14.7808C11.5074 14.7785 11.5054 14.7759 11.5054 14.7759C11.2557 14.478 11.2748 14.0378 11.551 13.7627L11.7714 13.5432C12.0641 13.2518 12.5373 13.2518 12.8299 13.5432C13.2139 13.9256 13.4684 13.9208 13.591 13.8976C13.7642 13.8647 13.9255 13.7402 14.011 13.6301C14.1236 13.4689 14.1249 13.3249 14.0925 13.1925C14.0751 13.1191 14.0481 13.0565 14.0253 13.0119C14.0142 12.9903 14.0054 12.9759 14.0009 12.9683L13.9999 12.9668L13.9714 12.927L13.945 12.8744C13.9353 12.8555 13.9203 12.8325 13.8718 12.779C13.8702 12.7772 13.8672 12.7741 13.863 12.7697C13.826 12.7307 13.6958 12.5938 13.6159 12.4504C13.4791 12.2052 13.4412 11.9068 13.5599 11.602C13.6513 11.3672 13.82 11.1737 13.9758 11.0185L14.6371 10.3599C14.9112 10.087 15.3478 10.0672 15.6454 10.3142C15.765 10.4135 16.0204 10.5205 16.3848 10.596C16.7271 10.6668 17.067 10.6902 17.2606 10.6902C19.4668 10.6902 21.25 8.9098 21.25 6.72008C21.25 4.53036 19.4668 2.75 17.2606 2.75ZM13.1486 15.3763C13.1174 15.6615 13.0159 15.9669 12.7999 16.268L12.7948 16.2751L12.7895 16.2821C12.5219 16.6375 12.061 16.9687 11.5049 17.0752C11.1118 17.1505 10.6913 17.1088 10.2913 16.9147L9.96419 17.2405C9.51185 17.691 8.97167 17.7996 8.50691 17.7309C8.07947 17.667 7.727 17.4603 7.51517 17.2795C7.50052 17.267 7.48647 17.254 7.47288 17.2405L6.81156 16.5819C6.32963 16.1019 6.18913 15.5381 6.27272 15.0266C6.34864 14.5622 6.598 14.195 6.81156 13.9823L12.1628 8.65293C12.14 8.59793 12.1168 8.53926 12.0937 8.47711C11.9339 8.04748 11.7711 7.4359 11.7711 6.72008C11.7711 3.69615 14.2317 1.25 17.2606 1.25C20.2894 1.25 22.75 3.69615 22.75 6.72008C22.75 9.74401 20.2894 12.1902 17.2606 12.1902C16.9765 12.1902 16.5339 12.1586 16.0807 12.0648C15.84 12.015 15.5614 11.9408 15.2909 11.8258L15.1456 11.9705C15.1844 12.0246 15.224 12.0862 15.2615 12.1554C15.2657 12.1619 15.2702 12.1689 15.2748 12.1764C15.2984 12.2144 15.3283 12.2655 15.3603 12.328C15.4235 12.4514 15.4998 12.6282 15.5514 12.8437C15.657 13.2855 15.6581 13.9075 15.2247 14.5117L15.2196 14.5188L15.2144 14.5258C14.9678 14.8532 14.5039 15.2511 13.8705 15.3713C13.6344 15.4161 13.392 15.4191 13.1486 15.3763ZM17.2606 5.82354C16.7588 5.82354 16.3573 6.22783 16.3573 6.72008C16.3573 7.21233 16.7588 7.61662 17.2606 7.61662C17.7623 7.61662 18.1639 7.21233 18.1639 6.72008C18.1639 6.22783 17.7623 5.82354 17.2606 5.82354ZM14.8573 6.72008C14.8573 5.39362 15.9362 4.32354 17.2606 4.32354C18.585 4.32354 19.6639 5.39362 19.6639 6.72008C19.6639 8.04654 18.585 9.11662 17.2606 9.11662C15.9362 9.11662 14.8573 8.04654 14.8573 6.72008Z" /></svg>
                    </span>
                    <input id="signup-confirmPassword" name="confirmPassword" type={signupPw2Visible ? "text" : "password"} aria-label="Confirm password" placeholder="••••••••" autoComplete="new-password" minLength={8} maxLength={128} required />
                    <button type="button" className={`toggle-pw ${signupPw2Visible ? 'is-visible' : ''}`} onClick={() => setSignupPw2Visible(!signupPw2Visible)} aria-label={signupPw2Visible ? "Hide password" : "Show password"} aria-pressed={signupPw2Visible}>
                      {signupPw2Visible ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0013.42 13.42" />
                          <path d="M9.88 5.08A10.94 10.94 0 0112 5c6.5 0 11 7 11 7a17.28 17.28 0 01-5.18 6.38M5.05 5.05A17.38 17.38 0 001 12s3.5 7 11 7a11.62 11.62 0 005.04-1.18" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="terms-row">
              <input name="terms" type="checkbox" id="terms" />
              <label htmlFor="terms">I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link> of ACM ITU Student Chapter</label>
            </div>

            <button type="submit" className="btn-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
          </form>

          <p className="card-footer-text">
            Already have an account? <button type="button" disabled={busy} onClick={() => { setView('login'); setError(''); }}>Sign in</button>
          </p>
        </div>
      </div>

      {/* OTP VERIFICATION VIEW */}
      <div className="view" id="view-otp" aria-hidden={view !== 'otp'} ref={element => element?.toggleAttribute('inert', view !== 'otp')}>
        <OtpView email={otpEmail} notice={error} onLogin={signedIn} onBack={() => { setView('login'); setError(''); }} />
      </div>
    </main>
  );
}
