// #4471 split into the problems it holds, counted the desk's way (causes.ts): every report is
// counted under the cause it is filed by. A problem the desk read differently (desk-notes.json)
// gets its own row and ticket, and stays counted where it is filed.
import { groupByCause, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'unplaced' | 'one-day';

export type ProblemRow = {
  problem: Problem;
  reports: Report[];
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // For a row read out of another: the cause its reports are filed and counted under.
  filedUnder?: Problem;
};

function row(problem: Problem, rs: Report[], filedUnder?: Problem): ProblemRow {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    filedUnder,
  };
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; problems: ProblemRow[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const problems: ProblemRow[] = groupByCause(merged, tenantOf).map((g) => row(g.cause, g.reports));
  for (const g of [...problems]) {
    const moved = g.reports.filter((r) => oneDayMove.includes(r.id));
    if (moved.length) problems.push(row('one-day', moved, g.problem));
  }
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, problems };
}
