import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb, runAs } from "./harness";
import { DR, ER, F, P1, P2, S1, S2, SEED, U, type Who } from "./fixtures";

// Flows the app actually performs - these must keep working.
const ALLOWED: [string, Who, string][] = [
  ["doctor accepts assigned shift", "D", `update shifts set status='confirmed' where id='${S1}' returning id`],
  ["doctor declines assigned shift", "D", `update shifts set status='open', assigned_doctor_id=null where id='${S1}' returning id`],
  ["hospital edits its own shift", "H", `update shifts set hourly_rate=150, status='completed' where id='${S1}' returning id`],
  ["doctor applies to a shift", "D", `insert into applications(shift_id,doctor_id,status) values ('${S1}','${DR}','in_review') returning id`],
  ["doctor withdraws an application", "D", `update applications set status='withdrawn' where doctor_id='${DR}' returning id`],
  ["hospital accepts an application", "H", `update applications set status='accepted' where doctor_id='${DR}' returning id`],
  ["hospital approves a payout", "H", `update payouts set status='approved', approved_at=now() where id='${P1}' returning id`],
  ["hospital disputes a payout", "H", `update payouts set status='disputed' where id='${P1}' returning id`],
  ["doctor withdraws an approved payout", "D", `update payouts set status='payment_processed', paid_at=now() where id='${P2}' returning id`],
  ["doctor requests a replacement", "D", `insert into replacement_requests(shift_id,requesting_doctor_id,reason,hourly_compensation) values ('${S1}','${DR}','x',100) returning id`],
  ["hospital approves a replacement", "H", `update replacement_requests set status='approved', reviewed_at=now() returning id`],
  ["hospital modifies replacement pay", "H", `update replacement_requests set hourly_compensation=120, notes='n' returning id`],
  ["doctor checks in to an assigned shift", "D", `insert into attendance_records(shift_id,replacement_doctor_id,check_in_time,status) values ('${S1}','${DR}',now(),'checked_in') returning id`],
  ["doctor checks out", "D", `update attendance_records set check_out_time=now(), status='checked_out' returning id`],
  ["hospital verifies attendance", "H", `update attendance_records set status='verified', verified_by_profile_id='${U.H}', verified_at=now() returning id`],
  ["recipient marks a message read", "D", `update messages set read=true returning id`],
  ["sender bumps thread last_message_at", "H", `update message_threads set last_message_at=now() returning id`],
  ["doctor rates hospital for a worked shift", "D", `insert into ratings(shift_id,direction,doctor_id,facility_id,overall_score) values ('${S1}','doctor_to_hospital','${DR}','${F}',4.5) returning id`],
  ["doctor re-uploads a rejected doc, keeps the approved one", "D", `update doctors set uploaded_documents='{"license":{"path":"x/a.pdf","status":"approved","reviewedAt":"t1"},"id":{"path":"x/c.pdf"}}' where id='${DR}' returning id`],
  ["doctor edits own specialty", "D", `update doctors set specialty='ICU' where id='${DR}' returning id`],
  ["doctor notifies a hospital they work with", "D", `insert into notifications(user_id,title,body) values ('${U.H}','issue','x')`],
  ["approved hospital invites any doctor", "H", `insert into notifications(user_id,title,body) values ('${U.E}','invite','x')`],
  ["user submits onboarding", "E", `update profiles set completed_onboarding=true, verification_status='Submitted' where id='${U.E}' returning id`],
  ["admin approves a doctor checklist", "A", `update doctors set verified=true, verification_details='{"degree":true}' where id='${ER}' returning id`],
  ["admin approves a document", "A", `update doctors set uploaded_documents='{"license":{"path":"x/a.pdf","status":"approved"}}' where id='${ER}' returning id`],
  ["new doctor creates own row", "E", `insert into doctors(profile_id,first_name,last_name,specialty) values ('${U.E}','a','b','c') returning id`],
  ["owner reads own document", "D", `select id from storage.objects where name like '${U.D}/%'`],
  ["admin reads any document", "A", `select id from storage.objects where name like '${U.D}/%'`],
  ["user uploads into own folder", "E", `insert into storage.objects(bucket_id,name) values ('documents','${U.E}/x/a.pdf') returning id`],
];

// Abuse the old policies allowed - these must now be rejected.
const DENIED: [string, Who, string][] = [
  ["doctor changes shift pay", "D", `update shifts set hourly_rate=999 where id='${S1}' returning id`],
  ["doctor marks shift completed", "D", `update shifts set status='completed' where id='${S1}' returning id`],
  ["doctor hands shift to someone else", "D", `update shifts set assigned_doctor_id='${ER}' where id='${S1}' returning id`],
  ["doctor self-accepts an application", "D", `update applications set status='accepted' where doctor_id='${DR}' returning id`],
  ["doctor applies as already accepted", "D", `insert into applications(shift_id,doctor_id,status) values ('${S1}','${DR}','accepted') returning id`],
  ["doctor inflates a payout", "D", `update payouts set net_payout=99999 where id='${P1}' returning id`],
  ["doctor withdraws an unapproved payout", "D", `update payouts set status='payment_processed' where id='${P1}' returning id`],
  ["doctor approves own payout", "D", `update payouts set status='approved' where id='${P1}' returning id`],
  ["hospital cuts a payout amount", "H", `update payouts set net_payout=1 where id='${P1}' returning id`],
  ["hospital marks a payout paid", "H", `update payouts set status='payment_processed' where id='${P2}' returning id`],
  ["doctor fills own replacement request", "D", `update replacement_requests set status='filled' returning id`],
  ["doctor verifies own attendance", "D", `update attendance_records set status='verified' returning id`],
  ["doctor checks in to an unassigned shift", "D", `insert into attendance_records(shift_id,replacement_doctor_id,check_in_time) values ('${S2}','${DR}',now()) returning id`],
  ["doctor rewrites the hospital's message", "D", `update messages set body='gotcha' returning id`],
  ["doctor swaps a thread participant", "D", `update message_threads set participant_one='${U.E}' returning id`],
  ["doctor writes a hospital_to_doctor rating about self", "D", `insert into ratings(shift_id,direction,doctor_id,facility_id,overall_score) values ('${S1}','hospital_to_doctor','${DR}','${F}',5) returning id`],
  ["doctor rates a shift they never worked", "D", `insert into ratings(shift_id,direction,doctor_id,facility_id,overall_score) values ('${S2}','doctor_to_hospital','${DR}','${F}',1) returning id`],
  ["doctor self-approves verification checklist", "D", `update doctors set verification_details='{"degree":true}' where id='${DR}' returning id`],
  ["doctor sets own rating", "D", `update doctors set rating=5, review_count=500 where id='${DR}' returning id`],
  ["doctor flips a rejected doc to approved", "D", `update doctors set uploaded_documents='{"license":{"path":"x/a.pdf","status":"approved","reviewedAt":"t1"},"id":{"path":"x/b.pdf","status":"approved"}}' where id='${DR}' returning id`],
  ["doctor swaps the file under an approved doc", "D", `update doctors set uploaded_documents='{"license":{"path":"x/evil.pdf","status":"approved","reviewedAt":"t1"}}' where id='${DR}' returning id`],
  ["hospital self-approves facility checklist", "H", `update facilities set verification_status='{"medicalLicense":true}' where id='${F}' returning id`],
  ["user self-approves profile", "E", `update profiles set verification_status='Approved' where id='${U.E}' returning id`],
  ["doctor notifies an unrelated doctor", "D", `insert into notifications(user_id,title,body) values ('${U.E}','spam','x')`],
  ["hospital edits another hospital's shift", "H2", `update shifts set hourly_rate=1 where id='${S1}' returning id`],
  ["user reads someone else's document", "E", `select id from storage.objects where name like '${U.D}/%'`],
  ["user uploads into someone else's folder", "E", `insert into storage.objects(bucket_id,name) values ('documents','${U.D}/x/evil.pdf') returning id`],
];

describe("RLS policies and write guards (all migrations applied)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedDb();
    await db.exec(SEED);
  }, 60_000);

  it("keeps the documents bucket private", async () => {
    const { rows } = await db.query<{ public: boolean }>(`select public from storage.buckets where id = 'documents'`);
    expect(rows[0]?.public).toBe(false);
  });

  it.each(ALLOWED)("allows: %s", async (_label, who, sql) => {
    await expect(runAs(db, U[who], sql)).resolves.toBeGreaterThan(0);
  });

  it.each(DENIED)("denies: %s", async (_label, who, sql) => {
    const affected = await runAs(db, U[who], sql).catch(() => 0);
    expect(affected).toBe(0);
  });

  it("strips privileged values from a doctor's self-insert", async () => {
    await db.exec("begin");
    try {
      await db.exec(
        `set local role authenticated; select set_config('request.jwt.claim.sub', '${U.E}', true);`
      );
      const { rows } = await db.query<{ verified: boolean; review_count: number; degree: string; docs: Record<string, { status?: string }> }>(
        `insert into doctors(profile_id, first_name, last_name, specialty, verified, rating, review_count, verification_details, uploaded_documents)
         values ('${U.E}', 'a', 'b', 'c', true, 5, 999, '{"degree":true}', '{"x":{"path":"p","status":"approved"}}')
         returning verified, review_count, verification_details->>'degree' as degree, uploaded_documents as docs`
      );
      expect(rows[0]).toMatchObject({ verified: false, review_count: 0, degree: "false" });
      expect(rows[0].docs.x.status).toBeUndefined();
    } finally {
      await db.exec("rollback");
    }
  });
});
