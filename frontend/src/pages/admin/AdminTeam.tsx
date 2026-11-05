import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { api } from '../../lib/api';
import { uploadImage } from '../../lib/upload';
import { useEscapeKey } from '../../hooks/useEscapeKey';

function TeamEditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M20.5337 3.3916C20.2236 3.08142 19.9559 2.81378 19.7193 2.60738C19.4702 2.39007 19.2019 2.1918 18.876 2.05679C18.1409 1.75231 17.3149 1.75231 16.5799 2.05679C16.2539 2.1918 15.9856 2.39007 15.7365 2.60738C15.4999 2.81378 15.2323 3.08141 14.9221 3.39159L8.93751 9.37615C8.52251 9.79078 8.20882 10.1042 7.97173 10.477C7.77111 10.7924 7.61569 11.1344 7.51002 11.4929C7.38514 11.9167 7.35534 12.3591 7.31592 12.9444L7.1842 14.8876C7.17485 15.0247 7.16396 15.1845 7.16666 15.3246C7.16974 15.4838 7.18962 15.7203 7.30999 15.9677C7.45687 16.2697 7.70083 16.5137 8.00282 16.6606C8.25029 16.7809 8.48679 16.8008 8.64598 16.8039C8.78602 16.8066 8.94585 16.7957 9.08298 16.7863L11.0261 16.6546C11.6114 16.6152 12.0539 16.5854 12.4776 16.4605C12.8362 16.3549 13.1782 16.1994 13.4936 15.9988C13.8664 15.7617 14.1798 15.448 14.5944 15.033L20.579 9.04845C20.8891 8.73829 21.1568 8.47067 21.3632 8.23405C21.5805 7.98491 21.7788 7.71662 21.9138 7.39069C22.2182 6.65561 22.2182 5.82968 21.9138 5.09459C21.7788 4.76867 21.5805 4.50038 21.3632 4.25124C21.1568 4.01464 20.8892 3.74704 20.579 3.43691L20.5337 3.3916ZM18.1106 3.90455C18.1522 3.92179 18.2324 3.96437 18.4046 4.11458C18.5836 4.27072 18.803 4.48928 19.1421 4.82843C19.4813 5.16758 19.6998 5.3869 19.856 5.56591C20.0062 5.73813 20.0488 5.81835 20.066 5.85996C20.1675 6.10499 20.1675 6.3803 20.066 6.62533C20.0488 6.66694 20.0062 6.74716 19.856 6.91938C19.7482 7.04288 19.6108 7.18558 19.4245 7.37359L16.597 4.54602C16.785 4.35976 16.9277 4.22231 17.0512 4.11458C17.2234 3.96437 17.3036 3.92179 17.3452 3.90455C17.5903 3.80306 17.8656 3.80306 18.1106 3.90455ZM15.1823 5.9598L18.0107 8.78823L13.2465 13.5525C12.7366 14.0624 12.5842 14.207 12.4202 14.3112C12.2625 14.4116 12.0915 14.4893 11.9122 14.5421C11.7258 14.597 11.5167 14.6168 10.7973 14.6655L9.19649 14.7741L9.30502 13.1732C9.3538 12.4538 9.37351 12.2447 9.42845 12.0583C9.48128 11.879 9.55899 11.708 9.6593 11.5503C9.76359 11.3863 9.90816 11.234 10.418 10.7241L15.1823 5.9598Z" fill="#0F1729"/>
      <path d="M11.0055 2C9.61949 1.99999 8.51721 1.99999 7.62839 2.0738C6.71811 2.14939 5.94253 2.30755 5.23415 2.67552C4.1383 3.24478 3.24477 4.1383 2.67552 5.23416C2.30755 5.94253 2.14939 6.71811 2.0738 7.6284C1.99999 8.51721 1.99999 9.61949 2 11.0055V12.9945C1.99999 14.3805 1.99999 15.4828 2.0738 16.3716C2.14939 17.2819 2.30755 18.0575 2.67552 18.7659C3.24477 19.8617 4.1383 20.7552 5.23415 21.3245C5.94253 21.6925 6.71811 21.8506 7.62839 21.9262C8.5172 22 9.61946 22 11.0054 22H13.0438C14.4068 22 15.4909 22 16.3654 21.9286C17.261 21.8554 18.0247 21.7023 18.7239 21.346C19.8529 20.7708 20.7708 19.8529 21.346 18.7239C21.7023 18.0247 21.8554 17.261 21.9286 16.3654C22 15.4909 22 14.4069 22 13.0439V13C22 12.4477 21.5523 12 21 12C20.4477 12 20 12.4477 20 13C20 14.4166 19.9992 15.419 19.9352 16.2026C19.8721 16.9745 19.7527 17.4457 19.564 17.816C19.1805 18.5686 18.5686 19.1805 17.816 19.564C17.4457 19.7527 16.9745 19.8721 16.2026 19.9352C15.419 19.9992 14.4166 20 13 20H11.05C9.60949 20 8.59025 19.9992 7.79391 19.9331C7.00955 19.8679 6.53142 19.7446 6.1561 19.5497C5.42553 19.1702 4.82985 18.5745 4.45035 17.8439C4.25538 17.4686 4.13208 16.9905 4.06694 16.2061C4.0008 15.4097 4 14.3905 4 12.95V11.05C4 9.60949 4.0008 8.59026 4.06694 7.79392C4.13208 7.00955 4.25539 6.53142 4.45035 6.15611C4.82985 5.42553 5.42553 4.82985 6.1561 4.45035C6.53142 4.25539 7.00955 4.13208 7.79391 4.06694C8.59025 4.00081 9.60949 4 11.05 4H12C12.5523 4 13 3.55229 13 3C13 2.44772 12.5523 2 12 2L11.0055 2Z" fill="#0F1729"/>
    </svg>
  );
}

function TeamUserIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'rgba(28,39,76,0.42)', ...style }}>
      <circle cx="12" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19.9975 18C20 17.8358 20 17.669 20 17.5C20 15.0147 16.4183 13 12 13C7.58172 13 4 15.0147 4 17.5C4 19.9853 4 22 12 22C14.231 22 15.8398 21.8433 17 21.5634" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TeamEmailIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="-12 -12 536 536" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M510.678 112.275c-2.308-11.626-7.463-22.265-14.662-31.054-1.518-1.915-3.104-3.63-4.823-5.345-12.755-12.818-30.657-20.814-50.214-20.814H71.021c-19.557 0-37.395 7.996-50.21 20.814-1.715 1.715-3.301 3.43-4.823 5.345C8.785 90.009 3.63 100.649 1.386 112.275.464 116.762 0 121.399 0 126.087V385.92c0 9.968 2.114 19.55 5.884 28.203 3.497 8.26 8.653 15.734 14.926 22.001 1.59 1.586 3.169 3.044 4.892 4.494 12.286 10.175 28.145 16.32 45.319 16.32h369.958c17.18 0 33.108-6.145 45.323-16.384 1.718-1.386 3.305-2.844 4.891-4.43 6.27-6.267 11.425-13.741 14.994-22.001v-.064c3.769-8.653 5.812-18.171 5.812-28.138V126.087c0-4.688-.457-9.325-1.322-13.812ZM46.509 101.571c6.345-6.338 14.866-10.175 24.512-10.175h369.958c9.646 0 18.242 3.837 24.512 10.175 1.122 1.129 2.179 2.387 3.112 3.637L274.696 274.203c-5.348 4.687-11.954 7.002-18.696 7.002-6.674 0-13.276-2.315-18.695-7.002L43.472 105.136c.858-1.25 1.915-2.436 3.037-3.565ZM36.334 385.92V142.735L176.658 265.15 36.405 387.435c-.071-.464-.071-.986-.071-1.515ZM440.979 420.597H71.021c-6.281 0-12.158-1.651-17.174-4.552l147.978-128.959 13.815 12.018c11.561 10.046 26.028 15.134 40.36 15.134 14.406 0 28.872-5.088 40.432-15.134l13.808-12.018 147.92 128.959c-5.023 2.901-10.9 4.552-17.181 4.552ZM475.666 385.92c0 .529 0 1.051-.068 1.515L335.346 265.221 475.666 142.8V385.92Z" fill="currentColor" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Team types
// ─────────────────────────────────────────────────────────────────────────────
interface CoreMember {
  positionKey:   string;
  positionLabel: string;
  positionOrder: number;
  memberName:    string;
  memberEmail:   string;
  memberPhone:   string;
  memberBio:     string;
  memberPhoto:   string;
}

interface SearchUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  teamPhoto: string;
  teamName: string;
  bio: string;
  corePosition: string;
}

const MAX_BIO_WORDS = 70;
const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const OTHER_MEMBERS_CHANGED_EVENT = 'admin-team:other-members-changed';

function notifyOtherMembersChanged() {
  window.dispatchEvent(new Event(OTHER_MEMBERS_CHANGED_EVENT));
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit dialog for a core team slot — edit bio/photo, change person separately
// ─────────────────────────────────────────────────────────────────────────────
function CoreEditDialog({
  member, onSave, onClose,
}: {
  member: CoreMember;
  onSave: (updated: CoreMember) => void;
  onClose: () => void;
}) {
  const [bio, setBio]             = useState(member.memberBio);
  const [photo, setPhoto]         = useState(member.memberPhoto);
  const [busy, setBusy]           = useState(false);
  const [uploading, setUp]        = useState(false);
  const [err, setErr]             = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  // Escape dismisses the innermost thing first: the remove-person confirm, then
  // the editor itself. (A portal'd ChangePersonDialog registers its own handler,
  // and the shared stack makes that one win while it is open.)
  useEscapeKey(() => {
    if (showRemoveConfirm) { setShowRemoveConfirm(false); return; }
    onClose();
  });

  // Track currently selected person (starts from existing member)
  const [selectedUser, setSelectedUser] = useState<{
    id: string; fullName: string; email: string; phone: string; teamPhoto: string;
    othMemberId?: string;
  } | null>(
    member.memberName ? {
      id: '', fullName: member.memberName, email: member.memberEmail,
      phone: member.memberPhone, teamPhoto: member.memberPhoto,
    } : null
  );

  const bioWords = countWords(bio);
  const bioOverLimit = bioWords > MAX_BIO_WORDS;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUp(true); setErr('');
    try {
      const url = await uploadImage(file, 'Members');
      setPhoto(url);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Upload failed.'); }
    finally { setUp(false); e.target.value = ''; }
  };

  // Called when user picks someone from the search popup
  const handlePersonSelected = (u: { id: string; fullName: string; email: string; phone: string; teamPhoto: string; bio?: string; othMemberId?: string }) => {
    setSelectedUser({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, teamPhoto: u.teamPhoto, othMemberId: u.othMemberId });
    setPhoto(u.teamPhoto || '');
    // For other-members restore their bio; for regular users start blank
    setBio(u.bio ?? '');
    setShowSearch(false);
  };

  const handleSave = async () => {
    if (bioOverLimit) { setErr(`About section must be ${MAX_BIO_WORDS} words or fewer.`); return; }
    // Must have either an existing person already assigned OR a newly selected one
    if (!member.memberName && !selectedUser?.id) {
      setErr('Please select a person using "Change Person for this Position".');
      return;
    }
    setBusy(true); setErr('');
    try {
      let result: CoreMember;
      if (selectedUser?.othMemberId) {
        // Person from Other Members — use dedicated route that looks up by othMemberId
        result = await api<CoreMember>(`/core-team/${member.positionKey}/from-other-member`, {
          method: 'PATCH',
          body: JSON.stringify({ othMemberId: selectedUser.othMemberId, memberBio: bio, memberPhoto: photo }),
        });
      } else if (selectedUser?.id) {
        // Regular registered user — send userId
        result = await api<CoreMember>(`/core-team/${member.positionKey}`, {
          method: 'PATCH',
          body: JSON.stringify({ userId: selectedUser.id, memberBio: bio, memberPhoto: photo }),
        });
      } else {
        // Same person, just update bio and/or photo
        result = await api<CoreMember>(`/core-team/${member.positionKey}/bio-photo`, {
          method: 'PATCH',
          body: JSON.stringify({ memberBio: bio, memberPhoto: photo }),
        });
      }
      onSave(result);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Could not save.');
    } finally { setBusy(false); }
  };

  const handleRemove = async () => {
    setBusy(true); setErr('');
    try {
      const result = await api<CoreMember>(`/core-team/${member.positionKey}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      onSave(result);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Could not remove person.');
      setShowRemoveConfirm(false);
    } finally { setBusy(false); }
  };

  const displayPhoto = photo;
  const displayName  = selectedUser?.fullName || '';
  const displayEmail = selectedUser?.email    || '';
  const displayPhone = selectedUser?.phone    || '';
  const canEditPhoto = Boolean(member.memberName || selectedUser?.id);

  return (
    <>
      <div className="am-overlay" role="dialog" aria-modal="true" aria-label={`Edit ${member.positionLabel}`}>
        <div className="ct-dialog">
          <div className="ct-dialog-head">
            <h3>Edit — <span>{member.positionLabel}</span></h3>
            <button className="ct-dialog-close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8L8 16M12 12L16 16M8 8L10 10"/></svg>
            </button>
          </div>
          {err && <p className="form-message" role="alert">{err}</p>}

          <div className="ct-dialog-body">
            {/* Photo col */}
            <div className="ct-photo-col">
              <div
                className="ct-photo-preview"
                onClick={() => canEditPhoto && fileRef.current?.click()}
                role={canEditPhoto ? 'button' : undefined}
                tabIndex={canEditPhoto ? 0 : undefined}
                aria-label={canEditPhoto ? 'Change member photo' : undefined}
                onKeyDown={e => {
                  if (canEditPhoto && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileRef.current?.click(); }
                }}
                style={{ cursor: canEditPhoto ? 'pointer' : 'default' }}
              >
                {displayPhoto
                  ? <img src={displayPhoto} alt="Member photo" />
                  : <div className="ct-photo-placeholder">
                      <TeamUserIcon />
                      <span>{canEditPhoto ? 'Click to upload' : 'Select a person first'}</span>
                    </div>
                }
                {uploading && <div className="ct-photo-loading">Uploading…</div>}
                {canEditPhoto && <div className="ct-photo-overlay">
                  <TeamEditIcon />
                </div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} disabled={!canEditPhoto} />
              {displayName && (
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', margin: '8px 0 0', width: '100%', textAlign: 'center', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.35 }}>
                  {displayName}
                </p>
              )}
            </div>

            {/* Fields col */}
            <div className="ct-fields-col">
              {/* Read-only info about current person */}
              {(displayEmail || displayPhone) && (
                <div style={{ background: 'rgba(15,27,61,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 4 }}>
                  {displayEmail && (
                    <div style={{ fontSize: 12, color: 'rgba(15,27,61,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TeamEmailIcon style={{ width: 13, height: 13, flexShrink: 0, color: '#1C274C' }} />
                      {displayEmail}
                    </div>
                  )}
                  {displayPhone && (
                    <div style={{ fontSize: 12, color: 'rgba(15,27,61,0.6)', display: 'flex', alignItems: 'center', gap: 6, marginTop: displayEmail ? 4 : 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M14 2C14 2 16.2 2.2 19 5C21.8 7.8 22 10 22 10"/><path d="M14.207 5.53564C14.207 5.53564 15.197 5.81849 16.6819 7.30341C18.1668 8.78834 18.4497 9.77829 18.4497 9.77829"/><path d="M4.00655 7.93309C3.93421 9.84122 4.41713 13.0817 7.6677 16.3323C8.45191 17.1165 9.23553 17.7396 10 18.2327M5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C15.2529 20.0243 14.1963 19.9541 13 19.6111"/></svg>
                      {displayPhone}
                    </div>
                  )}
                </div>
              )}

              <div className="si-field">
                <label className="si-label">About (max {MAX_BIO_WORDS} words)</label>
                <textarea className="si-input" rows={5} value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Describe their role, responsibilities and contributions…" />
                <p style={{ fontSize: 11, margin: '4px 0 0', color: bioOverLimit ? '#dc2626' : 'rgba(15,27,61,0.4)', fontWeight: bioOverLimit ? 600 : 400 }}>
                  {bioWords} / {MAX_BIO_WORDS} words
                </p>
              </div>
            </div>
          </div>

          <div className="ct-dialog-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            {/* Bottom-left: change person */}
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11, padding: '6px 12px', color: 'var(--blue-dark)', borderColor: 'var(--blue-dark)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); setShowSearch(true); }}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><path d="M11 6C13.7614 6 16 8.23858 16 11M16.6588 16.6549L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"/></svg>
              Change Person
            </button>
            {member.memberName && (
              <button
                type="button"
                className="btn"
                style={{ fontSize: 11, padding: '6px 12px', color: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                onClick={() => setShowRemoveConfirm(true)}
                disabled={busy}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 12, height: 12 }}><path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4"/><path d="M20.5 6H3.49988"/><path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5"/><path d="M9.5 11L10 16M14.5 11L14 16"/></svg>
                Remove Person
              </button>
            )}
            {/* Bottom-right: cancel / save */}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button type="button" className="btn" style={{ fontSize: 11, padding: '6px 14px' }} onClick={onClose} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-fill" style={{ fontSize: 11, padding: '6px 14px' }} onClick={() => void handleSave()} disabled={busy || uploading}>
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search / change-person popup ─────────────────────────────────── */}
      {showSearch && createPortal(
        <ChangePersonDialog
          positionLabel={member.positionLabel}
          currentEmail={member.memberEmail}
          onSelect={handlePersonSelected}
          onClose={() => setShowSearch(false)}
        />,
        document.body
      )}
      {showRemoveConfirm && createPortal(
        <div className="am-overlay" role="dialog" aria-modal="true" aria-label="Remove person">
          <div className="am-dialog">
            <div className="am-dialog-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4"/><path d="M20.5 6H3.49988"/><path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5"/><path d="M9.5 11L10 16M14.5 11L14 16"/></svg>
            </div>
            <h3>Remove Person</h3>
            <p>Remove <strong>{member.memberName}</strong> from the <strong>{member.positionLabel}</strong> position?</p>
            <div className="am-dialog-actions">
              <button className="btn" onClick={() => setShowRemoveConfirm(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-fill am-btn-danger" onClick={() => void handleRemove()} disabled={busy}>
                {busy ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Second popup: search & pick a new person (also searches Other Members)
// ─────────────────────────────────────────────────────────────────────────────
function ChangePersonDialog({
  positionLabel,
  currentEmail,
  onSelect,
  onClose,
}: {
  positionLabel: string;
  currentEmail: string;
  onSelect: (u: { id: string; fullName: string; email: string; phone: string; teamPhoto: string; bio?: string; othMemberId?: string }) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<SearchUser[]>([]);
  const [otherResults, setOtherResults] = useState<OtherMember[]>([]);
  const [searching, setSearching]       = useState(false);
  const [searchErr, setSearchErr]       = useState('');

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOtherResults([]); setSearchErr(''); return; }
    // clearTimeout only cancels an unfired timer: without this flag a slower
    // earlier response could land after a newer one and win.
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true); setSearchErr('');
      try {
        const [usersRes, othersRes] = await Promise.all([
          api<{ users: SearchUser[] }>(`/core-team/search-users?query=${encodeURIComponent(query.trim())}`),
          api<{ members: OtherMember[] }>('/core-team/other-members'),
        ]);
        if (cancelled) return;
        // filter other members locally by name/email/phone
        const q = query.trim().toLowerCase();
        const currentEmailNormalized = currentEmail.trim().toLowerCase();
        const filteredOthers = othersRes.members.filter(m =>
          (!currentEmailNormalized || m.member_email.trim().toLowerCase() !== currentEmailNormalized) &&
          (m.member_name.toLowerCase().includes(q) ||
            m.member_email.toLowerCase().includes(q) ||
            m.member_phone.includes(q))
        );
        // exclude from regular users anyone already in other members
        // (sub-team members are fine to show here — they get moved when selected)
        const otherEmails = new Set(filteredOthers.map(m => m.member_email.toLowerCase()));
        const filteredUsers = usersRes.users.filter(u =>
          (!currentEmailNormalized || u.email.trim().toLowerCase() !== currentEmailNormalized) &&
          !otherEmails.has(u.email.toLowerCase())
        );
        setResults(filteredUsers);
        setOtherResults(filteredOthers);
      } catch (ex) {
        if (cancelled) return;
        setResults([]); setOtherResults([]);
        setSearchErr(ex instanceof Error ? ex.message : 'Search failed.');
      } finally { if (!cancelled) setSearching(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, currentEmail]);

  const totalResults = results.length + otherResults.length;

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-label={`Change person for ${positionLabel}`} style={{ zIndex: 3000 }}>
      <div className="ct-dialog" style={{ maxWidth: 480 }}>
        <div className="ct-dialog-head">
          <h3>Change Person — <span>{positionLabel}</span></h3>
          <button className="ct-dialog-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8L8 16M12 12L16 16M8 8L10 10"/></svg>
          </button>
        </div>

        <div style={{ padding: '0 20px 16px' }}>
          <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.5)', margin: '12px 0 10px' }}>
            Their photo, name, email and phone will replace the current person's info.
          </p>

          <div className="si-field">
            <label className="si-label">Search new person for this position</label>
            <input className="si-input" type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Name, email or phone…" autoFocus />
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {searching && <p style={{ fontSize: 12, color: 'rgba(15,27,61,0.4)' }}>Searching…</p>}

            {!searching && searchErr && (
              <p style={{ fontSize: 12, color: '#dc2626', fontStyle: 'italic' }}>{searchErr}</p>
            )}

            {!searching && !searchErr && query.trim() && totalResults === 0 && (
              <p style={{ fontSize: 12, color: 'rgba(15,27,61,0.4)', fontStyle: 'italic' }}>No matching users found.</p>
            )}

            {/* Regular users */}
            {results.length > 0 && (
              <>
                {otherResults.length > 0 && (
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(15,27,61,0.35)', letterSpacing: '0.05em', margin: '4px 0 2px', textTransform: 'uppercase' }}>Registered Users</p>
                )}
                {results.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,27,61,0.08)', background: '#fff' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(15,27,61,0.06)' }}>
                      {u.teamPhoto
                        ? <img src={u.teamPhoto} alt={u.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TeamUserIcon style={{ width: 20, height: 20, color: 'rgba(15,27,61,0.3)' }} />
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName || u.email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(15,27,61,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                      {u.corePosition
                        ? <div style={{ fontSize: 10, color: 'var(--blue-dark)', fontWeight: 600, marginTop: 2 }}>On {u.corePosition} — will be moved</div>
                        : u.teamName && <div style={{ fontSize: 10, color: 'var(--blue-dark)', fontWeight: 600, marginTop: 2 }}>On {u.teamName} — will be removed</div>}
                    </div>
                    <button className="btn btn-fill" style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      onClick={() => onSelect({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, teamPhoto: u.teamPhoto, bio: u.bio })}>
                      Select
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Other Members */}
            {otherResults.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(15,27,61,0.35)', letterSpacing: '0.05em', margin: '4px 0 2px', textTransform: 'uppercase' }}>Other Members</p>
                {otherResults.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(58,99,201,0.15)', background: 'rgba(58,99,201,0.03)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(15,27,61,0.06)' }}>
                      {m.member_photo
                        ? <img src={m.member_photo} alt={m.member_name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TeamUserIcon style={{ width: 20, height: 20, color: 'rgba(15,27,61,0.3)' }} />
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.member_name || m.member_email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(15,27,61,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.member_email}{m.member_phone ? ` · ${m.member_phone}` : ''}</div>
                      <div style={{ fontSize: 10, color: 'var(--blue-dark)', fontWeight: 600, marginTop: 2 }}>From Other Members — will be removed from there</div>
                    </div>
                    <button className="btn btn-fill" style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      onClick={() => onSelect({ id: m.member_email, fullName: m.member_name, email: m.member_email, phone: m.member_phone, teamPhoto: m.member_photo, bio: m.member_bio, othMemberId: m.id })}>
                      Select
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="ct-dialog-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Other Members types + section
// ─────────────────────────────────────────────────────────────────────────────
interface OtherMember {
  id: string;
  member_name: string;
  member_email: string;
  member_phone: string;
  member_position: string;
  member_bio: string;
  member_photo: string;
  added_at: string;
}

function OtherMemberDialog({
  member, onSave, onClose,
}: {
  member: OtherMember;
  onSave: (member: OtherMember) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [form, setForm] = useState(member);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr('');
    try {
      const url = await uploadImage(file, 'Members');
      setForm(current => ({ ...current, member_photo: url }));
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Upload failed.'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const updated = await api<OtherMember>(`/core-team/other-members/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          memberName: form.member_name,
          memberEmail: form.member_email,
          memberPhone: form.member_phone,
          memberBio: '',
          memberPhoto: form.member_photo,
        }),
      });
      onSave(updated);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save changes.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-label="Edit other member">
      <div className="ct-dialog">
        <div className="ct-dialog-head">
          <h3>Edit — <span>Other Member</span></h3>
          <button className="ct-dialog-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8L8 16M12 12L16 16M8 8L10 10"/></svg>
          </button>
        </div>
        {err && <p className="form-message" role="alert">{err}</p>}

        <div className="ct-dialog-body">
          <div className="ct-photo-col">
            <div
              className="ct-photo-preview"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Change photo"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
              style={{ cursor: 'pointer' }}
            >
              {form.member_photo
                ? <img src={form.member_photo} alt={form.member_name} />
                : <div className="ct-photo-placeholder">
                    <TeamUserIcon />
                    <span>Click to upload</span>
                  </div>}
              {uploading && <div className="ct-photo-loading">Uploading…</div>}
              <div className="ct-photo-overlay"><TeamEditIcon /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', margin: '8px 0 0', width: '100%', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.35 }}>
              {form.member_name}
            </p>
          </div>

          <div className="ct-fields-col">
            {(form.member_email || form.member_phone) && (
              <div style={{ background: 'rgba(15,27,61,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 4 }}>
                {form.member_email && <div style={{ fontSize: 12, color: 'rgba(15,27,61,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TeamEmailIcon style={{ width: 13, height: 13, flexShrink: 0, color: '#1C274C' }} />
                  {form.member_email}
                </div>}
                {form.member_phone && <div style={{ fontSize: 12, color: 'rgba(15,27,61,0.6)', display: 'flex', alignItems: 'center', gap: 6, marginTop: form.member_email ? 4 : 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M14 2C14 2 16.2 2.2 19 5C21.8 7.8 22 10 22 10"/><path d="M14.207 5.53564C14.207 5.53564 15.197 5.81849 16.6819 7.30341C18.1668 8.78834 18.4497 9.77829 18.4497 9.77829"/><path d="M4.00655 7.93309C3.93421 9.84122 4.41713 13.0817 7.6677 16.3323C8.45191 17.1165 9.23553 17.7396 10 18.2327M5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C15.2529 20.0243 14.1963 19.9541 13 19.6111"/></svg>
                  {form.member_phone}
                </div>}
              </div>
            )}
          </div>
        </div>

        <div className="ct-dialog-footer">
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-fill" onClick={() => void save()} disabled={busy || uploading}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OtherMembersSection() {
  const [members, setMembers]   = useState<OtherMember[]>([]);
  const [delId, setDelId]       = useState<{ id: string; name: string } | null>(null);
  const [editMember, setEditMember] = useState<OtherMember | null>(null);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');

  // Escape closes the topmost of this section's overlays.
  useEscapeKey(() => {
    if (delId) setDelId(null);
    else if (editMember) setEditMember(null);
  });

  const loadMembers = useCallback(async () => {
    try {
      const { members: latestMembers } = await api<{ members: OtherMember[] }>('/core-team/other-members');
      setMembers(latestMembers);
      setErr('');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not load other members.');
    }
  }, []);

  useEffect(() => {
    // Keep this section in sync when a member is moved into or out of a team.
    void loadMembers();
    window.addEventListener(OTHER_MEMBERS_CHANGED_EVENT, loadMembers);
    return () => window.removeEventListener(OTHER_MEMBERS_CHANGED_EVENT, loadMembers);
  }, [loadMembers]);

  const remove = async () => {
    if (!delId) return;
    setBusy(true);
    try {
      await api(`/core-team/other-members/${delId.id}`, { method: 'DELETE', body: JSON.stringify({}) });
      setMembers(cur => cur.filter(m => m.id !== delId.id));
      setDelId(null);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not remove.'); }
    finally { setBusy(false); }
  };

  const saveEdit = (updated: OtherMember) => {
    setMembers(current => current.map(member => member.id === updated.id ? updated : member));
    setEditMember(null);
  };

  return (
    <div style={{ marginTop: 48 }}>
      <div className="st-section-head">
        <div>
          <div className="team-section-marker"><span className="team-section-marker-box" /><span className="team-section-marker-line" /><span className="team-section-marker-label">Former Leadership</span></div>
          <h2 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, fontWeight: 500, color: 'var(--navy)', margin: '6px 0 4px' }}>Other Members</h2>
          <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.5)', margin: 0 }}>Former core-team and sub-team members.</p>
        </div>
      </div>

      {err && <p className="form-message" role="alert">{err}</p>}

      {members.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.4)', padding: '16px 0', fontStyle: 'italic' }}>No other members yet.</p>
      ) : (
        <div className="st-grid">
          {members.map(m => (
            <div key={m.id} className="st-card st-person-card">
              <div className="ct-card-photo st-card-photo">
                {m.member_photo
                  ? <img src={m.member_photo} alt={m.member_name} />
                  : <div className="ct-card-photo-placeholder">
                      <TeamUserIcon />
                    </div>
                }
              </div>
              <div className="ct-card-info">
                <div className="ct-card-top st-person-top">
                  <div>
                    <div className="ct-card-name" style={{ fontSize: 16 }}>{m.member_name || <span className="ct-card-unset">No name</span>}</div>
                  </div>
                  <div className="st-person-actions">
                    <button
                      className="ct-card-edit-btn st-person-action"
                      onClick={() => setEditMember(m)}
                      title="Edit"
                      aria-label={`Edit ${m.member_name || 'other member'}`}
                    >
                      <TeamEditIcon />
                      Edit
                    </button>
                    <button
                      className="st-person-action st-person-delete"
                      onClick={() => setDelId({ id: m.id, name: m.member_name })}
                      aria-label="Remove from Other Members"
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 13, height: 13 }}><path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4"/><path d="M20.5 6H3.49988"/><path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5"/><path d="M9.5 11L10 16M14.5 11L14 16"/></svg>
                    </button>
                  </div>
                </div>
                <div className="ct-card-meta">
                  <div className="ct-card-meta-row">
                    {m.member_email ? <a href={`mailto:${m.member_email}`}>{m.member_email}</a> : 'No email'}
                  </div>
                </div>
                <span className="st-role-badge st-person-position">{m.member_position || 'Former Member'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {delId && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-label="Remove other member">
          <div className="am-dialog">
            <div className="am-dialog-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4"/><path d="M20.5 6H3.49988"/><path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5"/><path d="M9.5 11L10 16M14.5 11L14 16"/></svg>
            </div>
            <h3>Remove Member</h3>
            <p>Remove <strong>{delId.name}</strong> from Other Members?</p>
            <div className="am-dialog-actions">
              <button className="btn" onClick={() => setDelId(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-fill am-btn-danger" onClick={() => void remove()} disabled={busy}>{busy ? 'Removing…' : 'Yes, Remove'}</button>
            </div>
          </div>
        </div>
      )}
      {editMember && <OtherMemberDialog member={editMember} onSave={saveEdit} onClose={() => setEditMember(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const TEAM_POSITION_OPTIONS = [
  { value: 'TEAM_LEAD', label: 'Team Head' },
  { value: 'TEAM_CO_LEAD', label: 'Team Co-Head' },
  { value: 'MEMBER', label: 'Member' },
] as const;

function formatSubTeamPosition(value?: string) {
  switch (value) {
    case 'TEAM_DIRECTOR': return 'Team Director';
    case 'TEAM_LEAD': return 'Team Head';
    case 'TEAM_CO_LEAD': return 'Team Co-Head';
    default: return 'Member';
  }
}

interface SubMember {
  id: string;
  team_id: string;
  member_name:  string;
  member_email: string;
  member_phone: string;
  member_bio:   string;
  member_photo: string;
  position: string;
}
interface SubTeam {
  id: string;
  name: string;
  responsibilities: string;
  display_order: number;
  members: SubMember[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-member edit dialog — search-first for new, form for edits
// ─────────────────────────────────────────────────────────────────────────────
function SubMemberDialog({
  teamId, member, onSave, onClose,
}: {
  teamId: string;
  member: SubMember | null;
  onSave: (m: SubMember) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const blank: SubMember = { id: '', team_id: teamId, member_name: '', member_email: '', member_phone: '', member_bio: '', member_photo: '', position: 'MEMBER' };
  const [form, setForm]     = useState<SubMember>(member ?? blank);
  const [busy, setBusy]     = useState(false);
  const [uploading, setUp]  = useState(false);
  const [err, setErr]       = useState('');
  const fileRef             = useRef<HTMLInputElement>(null);

  // Search state (add mode only)
  const [query, setQuery]               = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [otherResults, setOtherResults]   = useState<OtherMember[]>([]);
  const [searching, setSearching]         = useState(false);
  const [searchErr, setSearchErr]         = useState('');
  const [selectedOthMemberId, setSelectedOthMemberId] = useState<string | null>(null);
  const [personPicked, setPersonPicked] = useState(!!member?.id);

  // Debounced search
  useEffect(() => {
    if (member?.id || personPicked) return;
    if (!query.trim()) { setSearchResults([]); setOtherResults([]); setSearchErr(''); return; }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true); setSearchErr('');
      try {
        const [usersRes, othersRes] = await Promise.all([
          api<{ users: SearchUser[] }>(`/core-team/search-users?query=${encodeURIComponent(query.trim())}&exclude_core=1`),
          api<{ members: OtherMember[] }>('/core-team/other-members'),
        ]);
        if (cancelled) return;
        const q = query.trim().toLowerCase();
        const filteredOthers = othersRes.members.filter(m =>
          m.member_name.toLowerCase().includes(q) ||
          m.member_email.toLowerCase().includes(q) ||
          m.member_phone.includes(q)
        );
        const otherEmails = new Set(filteredOthers.map(m => m.member_email.toLowerCase()));
        // Allow someone already assigned elsewhere to be picked here; the server
        // will move them out of their previous team before inserting the new row.
        setSearchResults(usersRes.users.filter(u => !otherEmails.has(u.email.toLowerCase())));
        setOtherResults(filteredOthers);
        setSearchErr('');
      } catch (ex) {
        if (cancelled) return;
        setSearchResults([]); setOtherResults([]);
        setSearchErr(ex instanceof Error ? ex.message : 'Search failed.');
      } finally { if (!cancelled) setSearching(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, member?.id, personPicked]);

  const pickUser = (u: SearchUser) => {
    setForm(f => ({ ...f, member_name: u.fullName, member_email: u.email, member_phone: u.phone, member_photo: u.teamPhoto || '', member_bio: '', position: f.position || 'MEMBER' }));
    setSelectedOthMemberId(null);
    setPersonPicked(true);
  };

  const pickOtherMember = (m: OtherMember) => {
    setForm(f => ({ ...f, member_name: m.member_name, member_email: m.member_email, member_phone: m.member_phone, member_bio: '', member_photo: m.member_photo, position: f.position || 'MEMBER' }));
    setSelectedOthMemberId(m.id);
    setPersonPicked(true);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUp(true); setErr('');
    try { const url = await uploadImage(file, 'Members'); setForm(f => ({ ...f, member_photo: url })); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Upload failed.'); }
    finally { setUp(false); e.target.value = ''; }
  };

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const body: Record<string, string> = {
        memberName: form.member_name, memberEmail: form.member_email,
        memberPhone: form.member_phone, memberBio: '', memberPhoto: form.member_photo,
        position: form.position,
      };
      if (selectedOthMemberId) body.othMemberId = selectedOthMemberId;

      let result: SubMember;
      if (member?.id) {
        result = await api<SubMember>(`/sub-teams/members/${member.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        result = await api<SubMember>(`/sub-teams/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(body) });
      }
      onSave(result);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Could not save.');
    } finally { setBusy(false); }
  };

  const isAddMode = !member?.id;
  const totalSearch = searchResults.length + otherResults.length;

  return (
    <div className="am-overlay" role="dialog" aria-modal="true" aria-label={isAddMode ? 'Add member' : 'Edit member'}>
      <div className="ct-dialog">
        <div className="ct-dialog-head">
          <h3>{isAddMode ? 'Add Member' : 'Edit Member'}</h3>
          <button className="ct-dialog-close" onClick={onClose} aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8L8 16M12 12L16 16M8 8L10 10"/></svg></button>
        </div>
        {err && <p className="form-message" role="alert">{err}</p>}

        {/* ── ADD MODE: search screen ── */}
        {isAddMode && !personPicked && (
          <div style={{ padding: '16px 24px 20px' }}>
            <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.5)', margin: '0 0 12px' }}>
              Search for a registered user or pick from Other Members.
            </p>
            <div className="si-field">
              <label className="si-label">Search person</label>
              <input className="si-input" type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Name, email or phone…" autoFocus />
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {searching && <p style={{ fontSize: 12, color: 'rgba(15,27,61,0.4)' }}>Searching…</p>}
              {!searching && searchErr && <p style={{ fontSize: 12, color: '#dc2626', fontStyle: 'italic' }}>{searchErr}</p>}
              {!searching && !searchErr && query.trim() && totalSearch === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(15,27,61,0.4)', fontStyle: 'italic' }}>No matching users found.</p>
              )}
              {searchResults.length > 0 && (
                <>
                  {otherResults.length > 0 && <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(15,27,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '4px 0 2px' }}>Registered Users</p>}
                  {searchResults.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,27,61,0.08)', background: '#fff' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(15,27,61,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {u.teamPhoto ? <img src={u.teamPhoto} alt={u.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                          : <TeamUserIcon style={{ width: 18, height: 18, color: 'rgba(15,27,61,0.3)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName || u.email}</div>
                        <div style={{ fontSize: 11, color: 'rgba(15,27,61,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                        {u.teamName && <div style={{ fontSize: 10, color: 'var(--blue-dark)', fontWeight: 600, marginTop: 2 }}>Currently on {u.teamName} — will be moved</div>}
                      </div>
                      <button className="btn btn-fill" style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={() => pickUser(u)}>Select</button>
                    </div>
                  ))}
                </>
              )}
              {otherResults.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(15,27,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '4px 0 2px' }}>Other Members</p>
                  {otherResults.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(58,99,201,0.15)', background: 'rgba(58,99,201,0.03)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(15,27,61,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.member_photo ? <img src={m.member_photo} alt={m.member_name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                          : <TeamUserIcon style={{ width: 18, height: 18, color: 'rgba(15,27,61,0.3)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.member_name || m.member_email}</div>
                        <div style={{ fontSize: 11, color: 'rgba(15,27,61,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.member_email}{m.member_phone ? ` · ${m.member_phone}` : ''}</div>
                        <div style={{ fontSize: 10, color: 'var(--blue-dark)', fontWeight: 600, marginTop: 2 }}>From Other Members — will be removed from there</div>
                      </div>
                      <button className="btn btn-fill" style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={() => pickOtherMember(m)}>Select</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── ADD MODE confirmation / EDIT MODE form ── */}
        {(personPicked || !isAddMode) && (
          <>
            <div className="ct-dialog-body">
              <div className="ct-photo-col">
                <div
                  className="ct-photo-preview"
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Change photo"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                >
                  {form.member_photo ? <img src={form.member_photo} alt="Photo" />
                    : <div className="ct-photo-placeholder"><TeamUserIcon /><span>Click to upload</span></div>}
                  {uploading && <div className="ct-photo-loading">Uploading…</div>}
                  <div className="ct-photo-overlay"><TeamEditIcon /></div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                {form.member_name && (
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', margin: '8px 0 0', textAlign: 'center', wordBreak: 'break-word' }}>{form.member_name}</p>
                )}
              </div>
              <div className="ct-fields-col">
                {/* Read-only info */}
                {(form.member_email || form.member_phone) && (
                  <div style={{ background: 'rgba(15,27,61,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 4 }}>
                    {form.member_email && (
                      <div style={{ fontSize: 12, color: 'rgba(15,27,61,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TeamEmailIcon style={{ width: 13, height: 13, flexShrink: 0, color: '#1C274C' }} />
                        {form.member_email}
                      </div>
                    )}
                    {form.member_phone && (
                      <div style={{ fontSize: 12, color: 'rgba(15,27,61,0.6)', display: 'flex', alignItems: 'center', gap: 6, marginTop: form.member_email ? 4 : 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M14 2C14 2 16.2 2.2 19 5C21.8 7.8 22 10 22 10"/><path d="M14.207 5.53564C14.207 5.53564 15.197 5.81849 16.6819 7.30341C18.1668 8.78834 18.4497 9.77829 18.4497 9.77829"/><path d="M4.00655 7.93309C3.93421 9.84122 4.41713 13.0817 7.6677 16.3323C8.45191 17.1165 9.23553 17.7396 10 18.2327M5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C15.2529 20.0243 14.1963 19.9541 13 19.6111"/></svg>
                        {form.member_phone}
                      </div>
                    )}
                  </div>
                )}
                <div className="si-field">
                  <label className="si-label">Team Position</label>
                  <select className="si-input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                    {TEAM_POSITION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="ct-dialog-footer" style={{ justifyContent: isAddMode ? 'space-between' : 'flex-end' }}>
              {isAddMode && (
                <button className="btn" style={{ fontSize: 11 }} onClick={() => setPersonPicked(false)} disabled={busy}>Back</button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
                <button className="btn btn-fill" onClick={() => void save()} disabled={busy || uploading}>{busy ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </>
        )}

        {/* Footer for search screen */}
        {isAddMode && !personPicked && (
          <div className="ct-dialog-footer">
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-member card (half-width)
// ─────────────────────────────────────────────────────────────────────────────
function SubMemberCard({ member, onEdit, onDelete }: { member: SubMember; onEdit: () => void; onDelete: () => void; }) {
  return (
    <div className="st-card st-person-card">
      <div className="ct-card-photo st-card-photo">
        {member.member_photo ? <img src={member.member_photo} alt={member.member_name} />
          : <div className="ct-card-photo-placeholder"><TeamUserIcon /></div>}
      </div>
      <div className="ct-card-info">
        <div className="ct-card-top st-person-top">
          <div className="ct-card-name" style={{ fontSize: 16 }}>{member.member_name || <span className="ct-card-unset">No name</span>}</div>
          <div className="st-person-actions">
            <button className="ct-card-edit-btn st-person-action" onClick={onEdit} aria-label={`Edit ${member.member_name || 'member'}`} title="Edit">
              <TeamEditIcon />
              Edit
            </button>
            <button className="st-person-action st-person-delete" onClick={onDelete} aria-label={`Remove ${member.member_name || 'member'} from the team`} title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 13, height: 13 }}><path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4"/><path d="M20.5 6H3.49988"/><path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5"/><path d="M9.5 11L10 16M14.5 11L14 16"/></svg>
            </button>
          </div>
        </div>

        <div className="ct-card-meta">
          <div className="ct-card-meta-row">
            {member.member_email ? <a href={`mailto:${member.member_email}`}>{member.member_email}</a> : 'No email'}
          </div>
        </div>
        <span className="st-role-badge st-person-position">{formatSubTeamPosition(member.position)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-teams section
// ─────────────────────────────────────────────────────────────────────────────
function SubTeamsSection() {
  const [teams, setTeams]                 = useState<SubTeam[]>([]);
  const [activeTeamId, setActiveTeamId]   = useState<string | null>(null);
  const [showAddTeam, setShowAddTeam]     = useState(false);
  const [newTeamName, setNewTeamName]     = useState('');
  const [editTeam, setEditTeam]           = useState<SubTeam | null>(null);
  const [teamName, setTeamName]           = useState('');
  const [teamResponsibilities, setTeamResponsibilities] = useState('');
  const [editMember, setEditMember]       = useState<{ teamId: string; member: SubMember | null } | null>(null);
  const [delMember, setDelMember]         = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy]                   = useState(false);
  const [err, setErr]                     = useState('');

  // Escape closes the topmost of this section's overlays.
  useEscapeKey(() => {
    if (delMember) setDelMember(null);
    else if (editMember) setEditMember(null);
    else if (editTeam) setEditTeam(null);
    else if (showAddTeam) { setShowAddTeam(false); setNewTeamName(''); }
  });

  useEffect(() => {
    api<{ teams: SubTeam[] }>('/sub-teams').then(r => {
      setTeams(r.teams);
      // Functional update: reading `activeTeamId` here would either need it as a
      // dependency (refetching on every tab click) or capture a stale value.
      if (r.teams.length > 0) setActiveTeamId(current => current ?? r.teams[0].id);
    }).catch(ex => setErr(ex instanceof Error ? ex.message : 'Could not load teams.'));
  }, []);

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    setBusy(true); setErr('');
    try {
      const t = await api<SubTeam>('/sub-teams/teams', { method: 'POST', body: JSON.stringify({ name: newTeamName.trim() }) });
      setTeams(cur => [...cur, t]);
      setActiveTeamId(t.id);
      setNewTeamName(''); setShowAddTeam(false);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not create team.'); }
    finally { setBusy(false); }
  };

  const openTeamEditor = (team: SubTeam) => {
    setTeamName(team.name);
    setTeamResponsibilities(team.responsibilities || '');
    setEditTeam(team);
    setErr('');
  };

  const saveTeam = async () => {
    if (!editTeam || !teamName.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const updated = await api<{ id: string; name: string; responsibilities: string }>(
        `/sub-teams/teams/${editTeam.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: teamName.trim(), responsibilities: teamResponsibilities.trim() }),
        }
      );
      setTeams(current => current.map(team => team.id === updated.id
        ? { ...team, name: updated.name, responsibilities: updated.responsibilities }
        : team));
      setEditTeam(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not update team.');
    } finally { setBusy(false); }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete this team and all its members?')) return;
    setBusy(true);
    setErr('');
    try {
      await api(`/sub-teams/teams/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
      // Take the fallback selection from the updated list, not the pre-delete
      // snapshot, so it can never point at a deleted team.
      const remaining = teams.filter(t => t.id !== id);
      setTeams(remaining);
      if (activeTeamId === id) setActiveTeamId(remaining[0]?.id ?? null);
      notifyOtherMembersChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not delete team.');
    } finally { setBusy(false); }
  };

  const handleMemberSave = (saved: SubMember) => {
    const savedEmail = saved.member_email.trim().toLowerCase();
    setTeams(cur => cur.map(t => {
      const members = savedEmail
        ? t.members.filter(m => m.id === saved.id || m.member_email.trim().toLowerCase() !== savedEmail)
        : t.members;
      if (t.id !== saved.team_id) return { ...t, members };
      const exists = members.some(m => m.id === saved.id);
      return { ...t, members: exists ? members.map(m => m.id === saved.id ? saved : m) : [...members, saved] };
    }));
    notifyOtherMembersChanged();
    setEditMember(null);
  };

  const deleteMember = async () => {
    if (!delMember) return;
    setBusy(true);
    try {
      await api(`/sub-teams/members/${delMember.id}`, { method: 'DELETE', body: JSON.stringify({}) });
      setTeams(cur => cur.map(t => ({ ...t, members: t.members.filter(m => m.id !== delMember.id) })));
      notifyOtherMembersChanged();
      setDelMember(null);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not delete.'); }
    finally { setBusy(false); }
  };

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return (
    <div style={{ marginTop: 48 }}>
      {/* Section header */}
      <div className="st-section-head">
        <div>
          <div className="team-section-marker"><span className="team-section-marker-box" /><span className="team-section-marker-line" /><span className="team-section-marker-label">Chapter Teams</span></div>
          <h2 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, fontWeight: 500, color: 'var(--navy)', margin: '6px 0 4px' }}>Sub-Teams & Committees</h2>
          <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.5)', margin: 0 }}>Manage the various teams and their members within the chapter.</p>
        </div>
        <button className="btn btn-fill" onClick={() => setShowAddTeam(true)}>+ Add Team</button>
      </div>

      {err && <p className="form-message" role="alert">{err}</p>}

      {/* Team tabs */}
      {teams.length > 0 && (
        <div className="st-tabs" role="tablist">
          {teams.map(t => (
            <div
              key={t.id}
              role="tab"
              tabIndex={0}
              aria-selected={t.id === activeTeamId}
              className={`st-tab ${t.id === activeTeamId ? 'st-tab--active' : ''}`}
              onClick={() => setActiveTeamId(t.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTeamId(t.id); } }}
            >
              {t.name}
              <span className="st-tab-actions">
                <button type="button" className="st-tab-edit" aria-label={`Edit team ${t.name}`} title={`Edit ${t.name}`} onClick={e => { e.stopPropagation(); openTeamEditor(t); }}>
                  <TeamEditIcon />
                </button>
                <button type="button" className="st-tab-del" aria-label={`Delete team ${t.name}`} onClick={e => { e.stopPropagation(); void deleteTeam(t.id); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Members grid */}
      {activeTeam && (
        <>
          <div className="st-members-head">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(15,27,61,0.5)' }}>{activeTeam.members.length} member{activeTeam.members.length !== 1 ? 's' : ''}</span>
            <button className="ct-card-edit-btn" onClick={() => setEditMember({ teamId: activeTeam.id, member: null })}>+ Add Member</button>
          </div>
          {activeTeam.members.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.4)', padding: '20px 0', fontStyle: 'italic' }}>No members yet. Click Add Member to get started.</p>
          ) : (
            <div className="st-grid">
              {activeTeam.members.map(m => (
                <SubMemberCard key={m.id} member={m}
                  onEdit={() => setEditMember({ teamId: activeTeam.id, member: m })}
                  onDelete={() => setDelMember({ id: m.id, name: m.member_name })} />
              ))}
            </div>
          )}
        </>
      )}

      {teams.length === 0 && (
        <p style={{ fontSize: 13, color: 'rgba(15,27,61,0.4)', padding: '24px 0', fontStyle: 'italic' }}>No teams yet. Click Add Team to create the first one.</p>
      )}

      {/* Add team dialog */}
      {showAddTeam && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-label="Create team">
          <div className="am-dialog" style={{ maxWidth: 380 }}>
            <h3>Create New Team</h3>
            <p>Enter a name for the new team.</p>
            <div className="si-field" style={{ width: '100%', textAlign: 'left' }}>
              <label className="si-label">Team Name</label>
              <input className="si-input" type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void addTeam()} placeholder="e.g. Technical Team" autoFocus />
            </div>
            <div className="am-dialog-actions">
              <button className="btn" onClick={() => { setShowAddTeam(false); setNewTeamName(''); }} disabled={busy}>Cancel</button>
              <button className="btn btn-fill" onClick={() => void addTeam()} disabled={busy || !newTeamName.trim()}>{busy ? 'Creating…' : 'Create Team'}</button>
            </div>
          </div>
        </div>
      )}

      {editTeam && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-label={`Edit ${editTeam.name}`}>
          <div className="am-dialog st-team-dialog">
            <h3>Edit Team</h3>
            <p>Update the team name and describe its responsibilities in up to 50 words.</p>
            <div className="si-field st-team-dialog-field">
              <label className="si-label" htmlFor="edit-team-name">Team Name</label>
              <input
                id="edit-team-name"
                className="si-input"
                type="text"
                maxLength={120}
                value={teamName}
                onChange={event => setTeamName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="si-field st-team-dialog-field">
              <label className="si-label" htmlFor="edit-team-responsibilities">Team Responsibilities</label>
              <textarea
                id="edit-team-responsibilities"
                className="si-input"
                rows={5}
                value={teamResponsibilities}
                onChange={event => setTeamResponsibilities(event.target.value)}
                placeholder="Describe what this team is responsible for..."
              />
              <span className="st-team-word-count">
                {countWords(teamResponsibilities)} / 50 words
              </span>
            </div>
            {err && <p className="st-team-dialog-error" role="alert">{err}</p>}
            {countWords(teamResponsibilities) > 50 && (
              <p className="st-team-dialog-error" role="alert">Responsibilities must be 50 words or fewer.</p>
            )}
            <div className="am-dialog-actions">
              <button className="btn" onClick={() => setEditTeam(null)} disabled={busy}>Cancel</button>
              <button
                className="btn btn-fill"
                onClick={() => void saveTeam()}
                disabled={busy || !teamName.trim() || countWords(teamResponsibilities) > 50}
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member edit/add dialog */}
      {editMember && (
        <SubMemberDialog teamId={editMember.teamId} member={editMember.member}
          onSave={handleMemberSave} onClose={() => setEditMember(null)} />
      )}

      {/* Delete member confirm */}
      {delMember && (
        <div className="am-overlay" role="dialog" aria-modal="true" aria-label="Remove member from team">
          <div className="am-dialog">
            <div className="am-dialog-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4"/><path d="M20.5 6H3.49988"/><path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5"/><path d="M9.5 11L10 16M14.5 11L14 16"/></svg>
            </div>
            <h3>Remove Member</h3>
            <p>Remove <strong>{delMember.name}</strong> from this team?</p>
            <div className="am-dialog-actions">
              <button className="btn" onClick={() => setDelMember(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-fill am-btn-danger" onClick={() => void deleteMember()} disabled={busy}>{busy ? 'Removing…' : 'Yes, Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
function CoreCard({ member, onEdit }: { member: CoreMember; onEdit: () => void }) {
  const empty = !member.memberName;
  return (
    <div className={`ct-card ${empty ? 'ct-card--empty' : ''}`}>
      {/* Photo */}
      <div className="ct-card-photo">
        {member.memberPhoto
          ? <img src={member.memberPhoto} alt={member.memberName} />
          : <div className="ct-card-photo-placeholder">
              <TeamUserIcon />
            </div>
        }
      </div>

      {/* Info */}
      <div className="ct-card-info">
        <div className="ct-card-top">
          <div>
            <div className="ct-card-position">{member.positionLabel}</div>
            <div className="ct-card-name">{member.memberName || <span className="ct-card-unset">Not assigned</span>}</div>
          </div>
          <button className="ct-card-edit-btn" onClick={onEdit} aria-label={`Edit ${member.positionLabel}`}>
            <TeamEditIcon />
            Edit
          </button>
        </div>

        <div className="ct-card-meta">
          {member.memberEmail && (
            <div className="ct-card-meta-row">
              <TeamEmailIcon style={{ width: 13, height: 13, flexShrink: 0, color: 'var(--ink-3)' }} />
              <a href={`mailto:${member.memberEmail}`}>{member.memberEmail}</a>
            </div>
          )}
          {member.memberPhone && (
            <div className="ct-card-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2C14 2 16.2 2.2 19 5C21.8 7.8 22 10 22 10"/><path d="M14.207 5.53564C14.207 5.53564 15.197 5.81849 16.6819 7.30341C18.1668 8.78834 18.4497 9.77829 18.4497 9.77829"/><path d="M4.00655 7.93309C3.93421 9.84122 4.41713 13.0817 7.6677 16.3323C8.45191 17.1165 9.23553 17.7396 10 18.2327M5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C15.2529 20.0243 14.1963 19.9541 13 19.6111"/></svg>
              {member.memberPhone}
            </div>
          )}
        </div>

        {member.memberBio && <p className="ct-card-bio">{member.memberBio}</p>}

        {empty && <p className="ct-card-empty-msg">Click Edit to assign a member to this position.</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminTeam() {
  const [coreMembers, setCoreMembers] = useState<CoreMember[]>([]);
  const [editing, setEditing]         = useState<CoreMember | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState('');

  const loadCore = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { members } = await api<{ members: CoreMember[] }>('/core-team');
      setCoreMembers(members);
    } catch (ex) {
      // Never leave the page on a permanent "Loading…": the admin cannot tell
      // a failure from a hang, and this is the only way to edit leadership.
      setLoadError(ex instanceof Error ? ex.message : 'Could not load the core team.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadCore(); }, [loadCore]);

  const handleSave = (updated: CoreMember) => {
    setCoreMembers(cur => cur.map(m => m.positionKey === updated.positionKey ? updated : m));
    notifyOtherMembersChanged();
    setEditing(null);
  };

  return (
    <>
      <AdminPageHeader title="Teams" subtitle="Manage core leadership and chapter roster." icon="team" />

      {/* ── Core Team Section ── */}
      <div className="ct-section-label">
        <div className="ct-section-title">
          <div className="team-section-marker"><span className="team-section-marker-box" /><span className="team-section-marker-line" /><span className="team-section-marker-label">Core Team</span></div>
          <h2>Chapter Leadership</h2>
          <p>The 6 core positions that lead the ACM ITU chapter.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: '24px 0', color: 'rgba(15,27,61,0.4)', fontSize: 13 }}>Loading…</p>
      ) : loadError ? (
        <div style={{ padding: '24px 0' }}>
          <p role="alert" style={{ margin: '0 0 12px', color: '#dc2626', fontSize: 13 }}>{loadError}</p>
          <button className="btn" onClick={() => void loadCore()}>Try again</button>
        </div>
      ) : (
        <div className="ct-list">
          {coreMembers.map(m => (
            <CoreCard key={m.positionKey} member={m} onEdit={() => setEditing(m)} />
          ))}
        </div>
      )}

      {editing && (
        <CoreEditDialog member={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

      {/* ── Sub-Teams Section ── */}
      <SubTeamsSection />

      {/* ── Other Members Section ── */}
      <OtherMembersSection />
    </>
  );
}