import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb, runAs } from "./harness";
import { F, SEED, U, type Who } from "./fixtures";

// The reads AppDataProvider fires right after sign-in. Under migration 013
// these timed out in production (57014): the facilities and doctors SELECT
// policies call helpers that re-enter each other's RLS for every row.
const READS = {
  facilities: `select f.id, p.verification_status from facilities f left join profiles p on p.id = f.profile_id`,
  doctors: `select id from doctors`,
  departments: `select id from departments`,
  attendance_records: `select id from attendance_records`,
  profiles: `select id from profiles`,
} as const;

// Rows each role must see - the access 013 intended, which the fix must keep.
const VISIBLE: Record<Who, Record<keyof typeof READS, number>> = {
  // Owns F; DR is assigned to / applied for F's shifts.
  H: { facilities: 1, doctors: 1, departments: 1, attendance_records: 1, profiles: 2 },
  // Assigned to / applied for F's shifts.
  D: { facilities: 1, doctors: 1, departments: 0, attendance_records: 1, profiles: 1 },
  // Unrelated doctor.
  E: { facilities: 0, doctors: 1, departments: 0, attendance_records: 0, profiles: 1 },
  // Owns F2, no relationship to DR or ER.
  H2: { facilities: 1, doctors: 0, departments: 0, attendance_records: 0, profiles: 1 },
  A: { facilities: 2, doctors: 2, departments: 1, attendance_records: 1, profiles: 5 },
};

const CASES = (Object.keys(VISIBLE) as Who[]).flatMap((who) =>
  (Object.keys(READS) as (keyof typeof READS)[]).map((table) => [who, table, VISIBLE[who][table]] as const)
);

describe("RLS read access (all migrations applied)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedDb();
    await db.exec(SEED);
    await db.exec(`insert into departments(facility_id, name) values ('${F}', 'ER')`);
  }, 60_000);

  it.each(CASES)("%s reads %s and sees %i row(s)", async (who, table, expected) => {
    await expect(runAs(db, U[who], READS[table])).resolves.toBe(expected);
  });

  it("evaluates the helper policies without re-entering RLS", async () => {
    const { rows } = await db.query<{ proname: string; prosecdef: boolean }>(
      `select proname, prosecdef from pg_proc
       where proname in ('doctor_relates_to_facility', 'facility_owns_or_relates_to_doctor')
       order by proname`
    );
    expect(rows).toEqual([
      { proname: "doctor_relates_to_facility", prosecdef: true },
      { proname: "facility_owns_or_relates_to_doctor", prosecdef: true },
    ]);
  });
});
