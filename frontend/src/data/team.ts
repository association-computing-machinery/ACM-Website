export interface Member {
  id: string | number;
  name: string;
  role: string;
  group: string;
  photoUrl?: string;
  bio?: string;
  department?: string;
  tenure?: string;
  archived?: boolean;
  order?: number;
}

const GROUP_ORDER: Record<string, number> = {
  'President':        0,
  'Leadership':       1,
  'Core Team':        2,
  'Sub-team Leads':   3,
  'Members':          4,
};

/** Sort members by group priority, then by optional order field, then alphabetically. */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    const ga = GROUP_ORDER[a.group] ?? 99;
    const gb = GROUP_ORDER[b.group] ?? 99;
    if (ga !== gb) return ga - gb;
    const oa = a.order ?? 999;
    const ob = b.order ?? 999;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}
