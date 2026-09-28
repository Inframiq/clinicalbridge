import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb, runAs, withUser } from "./harness";
import { DR, ER, P1, SEED, U } from "./fixtures";

type AuditRow = { actor_id: string | null; action: string; target_table: string; target_id: string; changes: Record<string, unknown> };

async function auditRows(db: PGlite, where: string): Promise<AuditRow[]> {
  await db.exec("reset role");
  const { rows } = await db.query<AuditRow>(`select actor_id, action, target_table, target_id, changes from audit_log where ${where}`);
  return rows;
}

describe("audit log, data export and account deletion", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedDb();
    await db.exec(SEED);
  }, 60_000);

  describe("audit log", () => {
    it("records a super admin's verification decision with a column diff", async () => {
      const rows = await withUser(db, U.A, async () => {
        await db.query(`update doctors set verified = true where id = '${ER}'`);
        return auditRows(db, `target_id = '${ER}'`);
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ actor_id: U.A, action: "admin_update", target_table: "doctors" });
      expect(rows[0].changes).toEqual({ verified: { old: false, new: true } });
    });

    it("records payout status changes by anyone", async () => {
      const rows = await withUser(db, U.H, async () => {
        await db.query(`update payouts set status = 'approved', approved_at = now() where id = '${P1}'`);
        return auditRows(db, `target_id = '${P1}'`);
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ actor_id: U.H, action: "payout_status" });
    });

    it("does not log a user's ordinary edits to their own record", async () => {
      const rows = await withUser(db, U.D, async () => {
        await db.query(`update doctors set specialty = 'ICU' where id = '${DR}'`);
        return auditRows(db, `target_id = '${DR}'`);
      });
      expect(rows).toHaveLength(0);
    });

    it("is readable only by the super admin and writable by nobody", async () => {
      await withUser(db, U.A, async () => {
        await db.query(`update doctors set verified = true where id = '${ER}'`);
        expect((await db.query(`select id from audit_log`)).rows.length).toBeGreaterThan(0);
      });
      await withUser(db, U.A, async () => {
        await db.query(`update doctors set verified = true where id = '${ER}'`);
        await db.exec(`select set_config('request.jwt.claim.sub', '${U.D}', true)`);
        expect((await db.query(`select id from audit_log`)).rows).toHaveLength(0);
      });
      await expect(runAs(db, U.A, `insert into audit_log(action, target_table) values ('x', 'y')`)).rejects.toThrow();
      await expect(runAs(db, U.A, `delete from audit_log returning id`)).rejects.toThrow();
    });
  });

  describe("export_my_data", () => {
    it("returns the caller's own records and nobody else's", async () => {
      const data = await withUser(db, U.D, async () => {
        const { rows } = await db.query<{ d: Record<string, unknown[]> & { profile: { email: string } } }>(`select export_my_data() as d`);
        return rows[0].d;
      });
      expect(data.profile.email).toBe("d@x.com");
      expect(data.doctor_records).toHaveLength(1);
      expect(data.payouts).toHaveLength(2);
      expect(data.messages).toHaveLength(1);
      expect(data.facilities).toHaveLength(0);
      expect(JSON.stringify(data)).not.toContain("e@x.com");
    });
  });

  describe("delete_my_account", () => {
    it("fully deletes an account with no working history", async () => {
      const result = await withUser(db, U.E, async () => {
        const { rows } = await db.query<{ r: string }>(`select delete_my_account() as r`);
        await db.exec("reset role");
        const users = await db.query(`select id from auth.users where id = '${U.E}'`);
        const doctors = await db.query(`select id from doctors where id = '${ER}'`);
        const audit = await db.query(`select action from audit_log where target_id = '${U.E}'`);
        return { r: rows[0].r, users: users.rows.length, doctors: doctors.rows.length, audit: audit.rows };
      });
      expect(result).toEqual({ r: "deleted", users: 0, doctors: 0, audit: [{ action: "account_deleted" }] });
    });

    it("anonymises an account with history, keeping payouts for the counter-party", async () => {
      const result = await withUser(db, U.D, async () => {
        const { rows } = await db.query<{ r: string }>(`select delete_my_account() as r`);
        await db.exec("reset role");
        const profile = (await db.query<{ full_name: string; email: string; phone: string | null }>(
          `select full_name, email, phone from profiles where id = '${U.D}'`)).rows[0];
        const doctor = (await db.query<{ license_number: string | null; uploaded_documents: object }>(
          `select license_number, uploaded_documents from doctors where id = '${DR}'`)).rows[0];
        const user = (await db.query<{ banned_until: unknown; encrypted_password: string | null }>(
          `select banned_until, encrypted_password from auth.users where id = '${U.D}'`)).rows[0];
        const payouts = (await db.query(`select id from payouts where doctor_id = '${DR}'`)).rows.length;
        return { r: rows[0].r, profile, doctor, user, payouts };
      });
      expect(result.r).toBe("anonymised");
      expect(result.profile).toEqual({ full_name: "Deleted user", email: `deleted+${U.D}@deleted.invalid`, phone: null });
      expect(result.doctor).toEqual({ license_number: null, uploaded_documents: {} });
      expect(result.user.encrypted_password).toBeNull();
      expect(result.user.banned_until).not.toBeNull();
      expect(result.payouts).toBe(2);
    });

    it("refuses to delete the super admin", async () => {
      await expect(runAs(db, U.A, `select delete_my_account()`)).rejects.toThrow(/super admin/);
    });
  });
});
