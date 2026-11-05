import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError, api } from '../lib/api';
import { uploadProfileImage } from '../lib/upload';
import { GlobalStyles, Navbar } from './LandingPage';

interface TeamMembership {
  team: string;
  position: string;
}

interface AccountProfile {
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  photoChangesRemaining?: number;
  memberships: TeamMembership[];
}

function initials(fullName: string) {
  return fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

export default function AccountProfilePage() {
  const { user, loading: authLoading, error: authError, refresh, logout } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoStatus, setPhotoStatus] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedFile = useRef<File | null>(null);

  useEffect(() => {
    if (!user?.id || authLoading) return;
    let active = true;
    setLoading(true);
    setError('');
    api<{ profile: AccountProfile }>('/profile/me')
      .then(result => { if (active) setProfile(result.profile); })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load your profile.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, authLoading, retry]);

  const changePhoto = async (file?: File) => {
    if (!file) return;
    setError('');
    setSavingPhoto(true);
    setPhotoStatus(`Selected ${file.name}. Preparing photo…`);

    const extensionType: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const fileType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ? file.type
      : extensionType[file.name.split('.').pop()?.toLowerCase() || ''];
    if (!fileType) {
      setError('Choose a JPEG, PNG, or WebP image.');
      setPhotoStatus('');
      setSavingPhoto(false);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose an image smaller than 10 MB.');
      setPhotoStatus('');
      setSavingPhoto(false);
      return;
    }

    try {
      setPhotoStatus('Uploading photo…');
      const uploadFile = file.type === fileType
        ? file
        : new File([file], file.name, { type: fileType, lastModified: file.lastModified });
      const photoUrl = await uploadProfileImage(uploadFile);
      setProfile(current => current ? {
        ...current,
        photoUrl,
        photoChangesRemaining: current.photoChangesRemaining === undefined
          ? undefined
          : Math.max(0, current.photoChangesRemaining - 1),
      } : current);
      setPhotoStatus('Profile photo updated.');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429
        ? 'Profile photo changes are limited to 2 times every 14 days. Please try again after the restriction period ends.'
        : err instanceof Error ? err.message : 'Unable to update your profile photo.');
      setPhotoStatus('');
    } finally {
      setSavingPhoto(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handlePhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file && selectedFile.current !== file) {
      selectedFile.current = file;
      void changePhoto(file);
    }
  };

  const openPhotoPicker = () => {
    const input = fileInput.current;
    if (!input || savingPhoto) return;

    selectedFile.current = null;
    input.value = '';
    setError('');
    setPhotoStatus('');

    const onWindowFocus = () => {
      window.setTimeout(() => {
        const file = input.files?.[0];
        if (file && selectedFile.current !== file) {
          selectedFile.current = file;
          void changePhoto(file);
        } else if (!file) {
          setPhotoStatus(current => current.startsWith('Choose a JPEG') ? '' : current);
        }
      }, 150);
    };

    window.addEventListener('focus', onWindowFocus, { once: true });
    input.click();
  };

  if (authLoading) return <main className="account-profile-state" role="status">Checking your account…</main>;
  if (authError) {
    return (
      <main className="account-profile-state">
        <h1>We couldn’t load your account</h1>
        <p>{authError}</p>
        <button type="button" onClick={() => void refresh()}>Try again</button>
      </main>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      <GlobalStyles />
      <Navbar
        showNavigation={false}
        rightAction={{ label: 'BACK TO HOME', to: '/member' }}
      />
      <main className="account-profile-page">
      <section className="account-profile-card" aria-labelledby="account-profile-title">
        <div className="account-profile-heading">
          <span className="account-profile-eyebrow">Your account</span>
          <h1 id="account-profile-title">Profile</h1>
        </div>

        {loading ? (
          <p role="status">Loading your profile…</p>
        ) : error && !profile ? (
          <div className="account-profile-message">
            <p role="alert">{error}</p>
            <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>
          </div>
        ) : profile ? (
          <>
            <div className="account-profile-photo-area">
              <div className="account-profile-photo" aria-label={`${profile.fullName} profile photo`}>
                {profile.photoUrl
                  ? <img src={profile.photoUrl} alt="" />
                  : <span>{initials(profile.fullName)}</span>}
              </div>
              <div>
                <h2>{profile.fullName}</h2>
                <p>Update your profile picture</p>
                <button
                  type="button"
                  onClick={openPhotoPicker}
                  disabled={savingPhoto}
                >
                  {savingPhoto ? 'Uploading…' : profile.photoUrl ? 'Change photo' : 'Add photo'}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={savingPhoto}
                  onChange={handlePhotoSelection}
                  aria-label="Choose a new profile photo"
                />
              </div>
            </div>

            {photoStatus && <p className="account-profile-photo-status" role="status" aria-live="polite">{photoStatus}</p>}
            {error && <p className="account-profile-error" role="alert">{error}</p>}

            <dl className="account-profile-details">
              <div><dt>Name</dt><dd>{profile.fullName}</dd></div>
              <div><dt>Email</dt><dd>{profile.email}</dd></div>
              <div><dt>Phone number</dt><dd>{profile.phone || 'Not provided'}</dd></div>
              {user.role !== 'USER' && (
                <div className="account-profile-team">
                  <dt>Team and position</dt>
                  <dd>
                    {profile.memberships.length > 0 ? (
                      <ul>
                        {profile.memberships.map((membership, index) => (
                          <li key={`${membership.team}-${membership.position}-${index}`}>
                            <strong>{membership.team}</strong>
                            {membership.position && <span>{membership.position}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : 'No team assignment'}
                  </dd>
                </div>
              )}
            </dl>
          </>
        ) : null}
      </section>

      <button className="account-profile-logout" type="button" onClick={() => void logout()}>
        Log out
      </button>
      </main>
    </>
  );
}
