import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { uploadImage } from '../../lib/upload';

interface Sponsor {
  id: string;
  name: string;
  imageUrl: string;
  displayOrder: number;
}

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api<{ sponsors: Sponsor[] }>('/sponsors');
      setSponsors(result.sponsors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sponsors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSponsors(); }, [loadSponsors]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const processImage = async () => {
    if (!sourceFile) return;
    setProcessing(true);
    setError('');
    setProgress('Loading background-removal model…');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const image = await removeBackground(sourceFile, {
        model: 'isnet',
        output: { format: 'image/png' },
        progress: (key, current, total) => {
          setProgress(total > 0
            ? `${key}: ${Math.round((current / total) * 100)}%`
            : 'Removing background…');
        },
      });
      setProcessedImage(image);
      setPreviewUrl(URL.createObjectURL(image));
      setProgress('Background removed. Review the preview before saving.');
    } catch (err) {
      setError(err instanceof Error ? `Background removal failed: ${err.message}` : 'Background removal failed.');
      setProgress('');
    } finally {
      setProcessing(false);
    }
  };

  const saveSponsor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!processedImage) {
      setError('Remove the image background before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const safeName = name.trim().replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'sponsor';
      const png = new File([processedImage], `${safeName}.png`, { type: 'image/png' });
      const imageUrl = await uploadImage(png, 'Sponsors');
      await api('/sponsors', {
        method: 'POST',
        body: JSON.stringify({ name, imageUrl }),
      });
      setFormOpen(false);
      setName('');
      setSourceFile(null);
      setProcessedImage(null);
      setPreviewUrl('');
      setProgress('');
      if (fileRef.current) fileRef.current.value = '';
      await loadSponsors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save sponsor.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSponsor = async (sponsor: Sponsor) => {
    if (!window.confirm(`Remove ${sponsor.name} from the sponsors list?`)) return;
    setDeletingId(sponsor.id);
    setError('');
    try {
      await api(`/sponsors/${sponsor.id}`, { method: 'DELETE' });
      setSponsors(current => current.filter(item => item.id !== sponsor.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove sponsor.');
    } finally {
      setDeletingId('');
    }
  };

  const closeForm = () => {
    setFormOpen(false);
    setError('');
    setName('');
    setSourceFile(null);
    setProcessedImage(null);
    setPreviewUrl('');
    setProgress('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="si-card sponsor-admin">
      <div className="si-card-head sponsor-admin-head">
        <div>
          <h2>Sponsors</h2>
          <p>Upload sponsor logos; background removal runs in your browser.</p>
        </div>
        <button type="button" className="si-save-btn" onClick={() => { setError(''); setFormOpen(value => !value); }}>
          {formOpen ? 'Close' : 'Add Sponsors'}
        </button>
      </div>

      {error && <p className="sponsor-error" role="alert">{error}</p>}

      {formOpen && (
        <form className="sponsor-form" onSubmit={event => void saveSponsor(event)}>
          <label className="si-field">
            <span className="si-label">Sponsor Name</span>
            <input className="si-input" value={name} onChange={event => setName(event.target.value)} maxLength={255} required />
          </label>
          <label className="si-field">
            <span className="si-label">Sponsor Image</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={event => {
                const selected = event.target.files?.[0] ?? null;
                const file = selected && selected.type.startsWith('image/') ? selected : null;
                setSourceFile(file);
                setProcessedImage(null);
                setPreviewUrl('');
                setProgress('');
                setError(selected && !file ? 'Choose a supported image file.' : '');
              }}
              required
            />
          </label>
          <div className="sponsor-form-actions">
            <button type="button" className="si-save-btn" onClick={() => void processImage()} disabled={!sourceFile || processing || saving}>
              {processing ? 'Processing…' : 'Remove Background'}
            </button>
            <button type="submit" className="si-save-btn" disabled={!processedImage || saving || processing}>
              {saving ? 'Uploading…' : 'Save Sponsor'}
            </button>
            <button type="button" className="sponsor-cancel-btn" onClick={closeForm} disabled={saving || processing}>Cancel</button>
          </div>
          {progress && <p className="sponsor-progress" aria-live="polite">{progress}</p>}
          <p className="sponsor-progress">First use downloads the background-removal model (about 80 MB). The sponsor image is processed locally in your browser.</p>
          {previewUrl && <img className="sponsor-preview" src={previewUrl} alt={`Background-removed preview for ${name || 'sponsor'}`} />}
        </form>
      )}

      {loading ? <p className="am-empty">Loading sponsors…</p> : sponsors.length === 0 ? (
        <p className="am-empty">No sponsors added yet.</p>
      ) : (
        <ul className="sponsor-admin-list">
          {sponsors.map(sponsor => (
            <li key={sponsor.id} className="sponsor-admin-item">
              <img src={sponsor.imageUrl} alt="" />
              <span>{sponsor.name}</span>
              <button type="button" className="sponsor-delete-btn" onClick={() => void deleteSponsor(sponsor)} disabled={deletingId === sponsor.id}>
                {deletingId === sponsor.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
