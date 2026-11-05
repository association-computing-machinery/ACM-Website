import { useState, useRef, useEffect, type FormEvent } from 'react';
import { post } from '../lib/api';
import type { User } from '../auth/AuthContext';

type Step = 'email' | 'otp' | 'password';

export default function AuthCodeForm({ initialEmail, onLogin: _onLogin, onBack }: {
  flow: 'forgot'; initialEmail: string; onLogin: (user: User) => void; onBack: () => void;
}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [confirmPwVisible, setConfirmPwVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Every deferred callback is tracked so it cannot fire (or clear a newer
  // message) after this form has gone away.
  const timersRef = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timersRef.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; }, []);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await post('/auth/forgot-password', { email });
      setCode(['', '', '', '', '', '']);
      setStep('otp');
      later(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send code.'); }
    finally { setBusy(false); }
  };

  // ── OTP box handlers ──────────────────────────────────────────────────────
  const handleDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code]; next[i] = digit; setCode(next);
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputsRef.current[i - 1]?.focus();
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

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const token = code.join('');
    if (token.length < 6) { setError('Enter the 6-digit code.'); return; }
    setBusy(true); setError('');
    try {
      // Verify the token without resetting — use a dedicated verify-token endpoint
      await post('/auth/verify-reset-token', { email, token });
      setVerifiedToken(token);
      setStep('password');
    } catch (err) { setError(err instanceof Error ? err.message : 'Invalid or expired code.'); }
    finally { setBusy(false); }
  };

  // ── Step 3: set new password ──────────────────────────────────────────────
  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[a-zA-Z]/.test(pw)) { setError('Password must contain at least one letter.'); return; }
    if (!/[0-9]/.test(pw)) { setError('Password must contain at least one number.'); return; }
    if (pw.length > 128) { setError('Password must be 128 characters or fewer.'); return; }
    if (pw !== confirmPw) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await post('/auth/reset-password', { email, token: verifiedToken, password: pw });
      setSuccess('Password updated! You can now sign in.');
      later(() => onBack(), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not reset password.'); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setError('');
    try {
      await post('/auth/forgot-password', { email });
      setCode(['', '', '', '', '', '']);
      setSuccess('New code sent!');
      later(() => setSuccess(''), 3000);
      // Focus after the disabled state clears, otherwise focus() is a no-op.
      later(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not resend code.'); }
    finally { setBusy(false); }
  };

  // ── Renders ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* STEP 1 — Email */}
      {step === 'email' && (
        <>
          <div className="card-header">
            <h1>Reset password</h1>
            <p>Enter your email and we'll send you a verification code.</p>
          </div>
          {error && <p className="form-message" role="alert">{error}</p>}
          <form onSubmit={sendOtp}>
            <div className="form-group">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-email">Work Email *</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M510.678 112.275c-2.308-11.626-7.463-22.265-14.662-31.054-1.518-1.915-3.104-3.63-4.823-5.345-12.755-12.818-30.657-20.814-50.214-20.814H71.021c-19.557 0-37.395 7.996-50.21 20.814-1.715 1.715-3.301 3.43-4.823 5.345C8.785 90.009 3.63 100.649 1.386 112.275.464 116.762 0 121.399 0 126.087V385.92c0 9.968 2.114 19.55 5.884 28.203 3.497 8.26 8.653 15.734 14.926 22.001 1.59 1.586 3.169 3.044 4.892 4.494 12.286 10.175 28.145 16.32 45.319 16.32h369.958c17.18 0 33.108-6.145 45.323-16.384 1.718-1.386 3.305-2.844 4.891-4.43 6.27-6.267 11.425-13.741 14.994-22.001v-.064c3.769-8.653 5.812-18.171 5.812-28.138V126.087c0-4.688-.457-9.325-1.322-13.812ZM46.509 101.571c6.345-6.338 14.866-10.175 24.512-10.175h369.958c9.646 0 18.242 3.837 24.512 10.175 1.122 1.129 2.179 2.387 3.112 3.637L274.696 274.203c-5.348 4.687-11.954 7.002-18.696 7.002-6.674 0-13.276-2.315-18.695-7.002L43.472 105.136c.858-1.25 1.915-2.436 3.037-3.565ZM36.334 385.92V142.735L176.658 265.15 36.405 387.435c-.071-.464-.071-.986-.071-1.515Zm404.645 34.677H71.021c-6.281 0-12.158-1.651-17.174-4.552l147.978-128.959 13.815 12.018c11.561 10.046 26.028 15.134 40.36 15.134 14.406 0 28.872-5.088 40.432-15.134l13.808-12.018 147.92 128.959c-5.023 2.901-10.9 4.552-17.181 4.552Zm34.687-34.677c0 .529 0 1.051-.068 1.515L335.346 265.221 475.666 142.8v243.12Z" /></svg>
                  </span>
                  <input id="reset-email" type="email" aria-label="Work Email" placeholder="jane@company.com" autoComplete="email"
                    required spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
            </div>
            <button className="btn-submit" disabled={busy}>{busy ? 'Sending…' : 'Send Code'}</button>
          </form>
          <p className="card-footer-text">
            <button type="button" disabled={busy} onClick={onBack}>Back to sign in</button>
          </p>
        </>
      )}

      {/* STEP 2 — OTP boxes */}
      {step === 'otp' && (
        <>
          <div className="card-header">
            <h1>Enter the code</h1>
            <p>We sent a 6-digit code to</p>
            <p className="otp-email">{email}</p>
          </div>
          {error && <p className="form-message" role="alert">{error}</p>}
          {success && <p className="form-message otp-resent" role="status">{success}</p>}
          <form onSubmit={verifyOtp} className="otp-form">
            <div className="otp-inputs" onPaste={handlePaste}>
              {code.map((d, i) => (
                <input key={i}
                  ref={el => { inputsRef.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`otp-box ${d ? 'otp-box--filled' : ''}`}
                  aria-label={`Digit ${i + 1}`}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  autoFocus={i === 0}
                  disabled={busy}
                />
              ))}
            </div>
            <button className="btn-submit" disabled={busy || code.join('').length < 6}>
              {busy ? 'Verifying…' : 'Verify Code'}
            </button>
          </form>
          <p className="card-footer-text">
            Didn't receive a code?{' '}
            <button type="button" disabled={busy} onClick={() => void resend()}>Resend</button>
          </p>
          <p className="card-footer-text">
            Wrong address?{' '}
            <button type="button" disabled={busy} onClick={() => { setStep('email'); setError(''); setSuccess(''); }}>Use a different email</button>
          </p>
          <p className="card-footer-text">
            <button type="button" disabled={busy} onClick={onBack}>Back to sign in</button>
          </p>
        </>
      )}

      {/* STEP 3 — New password */}
      {step === 'password' && (
        <>
          <div className="card-header">
            <h1>New password</h1>
            <p>Set a new password for your account.</p>
          </div>
          {error && <p className="form-message" role="alert">{error}</p>}
          {success && <p className="form-message otp-resent" role="status">{success}</p>}
          <form onSubmit={resetPassword}>
            <div className="form-group">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-new-pw">New Password *</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M15.6807 14.5869C19.1708 14.5869 22 11.7692 22 8.29344C22 4.81767 19.1708 2 15.6807 2C12.1907 2 9.3615 4.81767 9.3615 8.29344C9.3615 9.90338 10.0963 11.0743 10.0963 11.0743L2.45441 18.6849C2.1115 19.0264 1.63143 19.9143 2.45441 20.7339L3.33616 21.6121C3.67905 21.9048 4.54119 22.3146 5.2466 21.6121L6.27531 20.5876C7.30403 21.6121 8.4797 21.0267 8.92058 20.4412C9.65538 19.4167 8.77362 18.3922 8.77362 18.3922L9.06754 18.0995C10.4783 19.5045 11.7128 18.6849 12.1537 18.0995C12.8885 17.075 12.1537 16.0505 12.1537 16.0505C11.8598 15.465 11.272 15.465 12.0067 14.7333L12.8885 13.8551C13.5939 14.4405 15.0439 14.5869 15.6807 14.5869Z" /><path d="M17.8853 8.29353C17.8853 9.50601 16.8984 10.4889 15.681 10.4889C14.4635 10.4889 13.4766 9.50601 13.4766 8.29353C13.4766 7.08105 14.4635 6.09814 15.681 6.09814C16.8984 6.09814 17.8853 7.08105 17.8853 8.29353Z" /></svg>
                  </span>
                  <input id="reset-new-pw" type={pwVisible ? 'text' : 'password'} aria-label="New password"
                    placeholder="At least 8 characters" autoComplete="new-password" maxLength={128}
                    value={pw} onChange={e => setPw(e.target.value)} required />
                  <button type="button" className={`toggle-pw ${pwVisible ? 'is-visible' : ''}`} onClick={() => setPwVisible(!pwVisible)}
                    aria-label={pwVisible ? 'Hide password' : 'Show password'}>
                    {pwVisible ? (
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
                <label className="auth-label" htmlFor="reset-confirm-pw">Confirm New Password *</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M9.75684 1.98286C9.76631 2.39697 9.43829 2.74034 9.02418 2.74981C6.20248 2.81432 4.87348 3.09895 3.99627 3.97617C3.42588 4.54656 3.09862 5.31824 2.92655 6.59801C2.75159 7.89936 2.75 9.60936 2.75 11.99C2.75 14.3705 2.75159 16.0805 2.92655 17.3819C3.09862 18.6617 3.42588 19.4333 3.99627 20.0037C4.56666 20.5741 5.33834 20.9014 6.61811 21.0735C7.91946 21.2484 9.62946 21.25 12.0101 21.25C14.3906 21.25 16.1006 21.2484 17.402 21.0735C18.6818 20.9014 19.4534 20.5741 20.0238 20.0037C20.9011 19.1265 21.1857 17.7975 21.2502 14.9758C21.2597 14.5617 21.603 14.2337 22.0171 14.2432C22.4312 14.2526 22.7593 14.596 22.7498 15.0101C22.6866 17.7765 22.4374 19.7115 21.0845 21.0644C20.1889 21.9599 19.048 22.3657 17.6019 22.5601C16.189 22.75 14.3782 22.75 12.0674 22.75H11.9527C9.64191 22.75 7.8311 22.75 6.41824 22.5601C4.97214 22.3655 3.83115 21.9599 2.93561 21.0644C2.04006 20.1689 1.63435 19.0279 1.43993 17.5818C1.24998 16.1689 1.24999 14.3581 1.25 12.0473V11.9326C1.24999 9.62181 1.24998 7.811 1.43993 6.39814C1.63435 4.95204 2.04006 3.81105 2.93561 2.91551C4.2885 1.56262 6.22347 1.31345 8.98989 1.2502C9.404 1.24073 9.74737 1.56875 9.75684 1.98286ZM17.2606 2.75C15.0544 2.75 13.2711 4.53036 13.2711 6.72008C13.2711 7.21172 13.3839 7.64295 13.4996 7.95426C13.557 8.10864 13.6137 8.22949 13.6541 8.30858C13.6742 8.348 13.6901 8.37665 13.6997 8.39349L13.7091 8.40964C13.8944 8.70485 13.8506 9.08899 13.6037 9.33493L7.87005 15.0451C7.85527 15.0598 7.82684 15.0936 7.80049 15.1408C7.77466 15.1872 7.75916 15.2314 7.75308 15.2686C7.74754 15.3025 7.74952 15.3303 7.75842 15.358C7.76713 15.3852 7.79159 15.4409 7.87005 15.519L8.50421 16.1506C8.52318 16.1647 8.55267 16.184 8.59 16.2022C8.63879 16.2261 8.68606 16.2411 8.72624 16.2471C8.76432 16.2527 8.78981 16.2495 8.80787 16.2441C8.82312 16.2395 8.85657 16.2266 8.9057 16.1777L9.67724 15.4093C9.96988 15.1178 10.4431 15.1196 10.7357 15.4093C10.8507 15.5237 10.9464 15.5714 11.0148 15.5922C11.0838 15.6133 11.1522 15.6155 11.2227 15.602C11.379 15.5721 11.5211 15.4687 11.5865 15.386C11.677 15.2553 11.6741 15.1418 11.6308 15.0124C11.6067 14.9407 11.5721 14.876 11.5419 14.8284C11.5274 14.8055 11.5155 14.7892 11.5091 14.7808C11.5074 14.7785 11.5054 14.7759 11.5054 14.7759C11.2557 14.478 11.2748 14.0378 11.551 13.7627L11.7714 13.5432C12.0641 13.2518 12.5373 13.2539 12.8299 13.5432C13.2139 13.9256 13.4684 13.9208 13.591 13.8976C13.7642 13.8647 13.9255 13.7402 14.011 13.6301C14.1236 13.4689 14.1249 13.3249 14.0925 13.1925C14.0751 13.1191 14.0481 13.0565 14.0253 13.0119C14.0142 12.9903 14.0054 12.9759 14.0009 12.9683L13.9999 12.9668L13.9714 12.927L13.945 12.8744C13.9353 12.8555 13.9203 12.8325 13.8718 12.779C13.8702 12.7772 13.8672 12.7741 13.863 12.7697C13.826 12.7307 13.6958 12.5938 13.6159 12.4504C13.4791 12.2052 13.4412 11.9068 13.5599 11.602C13.6513 11.3672 13.82 11.1737 13.9758 11.0185L14.6371 10.3599C14.9112 10.087 15.3478 10.067 15.6454 10.3142C15.765 10.4135 16.0204 10.5205 16.3848 10.596C16.7271 10.6668 17.067 10.6902 17.2606 10.6902C19.4668 10.6902 21.25 8.9098 21.25 6.72008C21.25 4.53036 19.4668 2.75 17.2606 2.75Z" /><path d="M17.2606 5.82354C16.7588 5.82354 16.3573 6.22783 16.3573 6.72008C16.3573 7.21233 16.7588 7.61662 17.2606 7.61662C17.7623 7.61662 18.1639 7.21233 18.1639 6.72008C18.1639 6.22783 17.7623 5.82354 17.2606 5.82354Z" /></svg>
                  </span>
                  <input id="reset-confirm-pw" type={confirmPwVisible ? 'text' : 'password'} aria-label="Confirm password"
                    placeholder="••••••••" autoComplete="new-password" maxLength={128}
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
                  <button type="button" className={`toggle-pw ${confirmPwVisible ? 'is-visible' : ''}`} onClick={() => setConfirmPwVisible(!confirmPwVisible)}
                    aria-label={confirmPwVisible ? 'Hide password' : 'Show password'}>
                    {confirmPwVisible ? (
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
            <button className="btn-submit" disabled={busy}>{busy ? 'Updating…' : 'Update Password'}</button>
          </form>
          <p className="card-footer-text">
            <button type="button" disabled={busy} onClick={() => { setStep('otp'); setError(''); }}>Back to code entry</button>
          </p>
        </>
      )}
    </>
  );
}
