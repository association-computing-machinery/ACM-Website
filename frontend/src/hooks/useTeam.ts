import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Member } from '../data/team';

interface UseTeamResult {
  members: Member[];
  loading: boolean;
  error: string;
  retry: () => void;
}

interface UseMemberResult {
  member: Member | null;
  loading: boolean;
  error: string;
  retry: () => void;
}

/**
 * Fetch all team members. Pass `leadsOnly = true` to get only the top-level leads.
 *
 * The request is not carried across a re-render or unmount: without that guard a
 * slow earlier response can land after a newer one and win.
 */
export function useTeam(leadsOnly = false): UseTeamResult {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api<{ members: Member[] }>(leadsOnly ? '/team?leads=true' : '/team')
      .then(data => { if (!cancelled) setMembers(data.members ?? []); })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load team members.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leadsOnly, reloadKey]);

  const retry = useCallback(() => setReloadKey(key => key + 1), []);
  return { members, loading, error, retry };
}

/** Fetch a single member by id. */
export function useMember(id: string | undefined): UseMemberResult {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setMember(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    api<{ member: Member }>(`/team/${id}`)
      .then(data => { if (!cancelled) setMember(data.member ?? null); })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load member profile.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  const retry = useCallback(() => setReloadKey(key => key + 1), []);
  return { member, loading, error, retry };
}
