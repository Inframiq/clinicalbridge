// Shared seed for the database tests.
// Hospital H owns facility F; locum D (doctor row DR) is assigned to shift S1.
// E is an unrelated doctor still awaiting approval; H2 is another hospital;
// A is the designated super admin (migration 018).
export const U = {
  H: "11111111-1111-1111-1111-111111111111",
  D: "22222222-2222-2222-2222-222222222222",
  E: "33333333-3333-3333-3333-333333333333",
  H2: "44444444-4444-4444-4444-444444444444",
  A: "55555555-5555-5555-5555-555555555555",
} as const;
export type Who = keyof typeof U;
export const F = "f0000000-0000-0000-0000-000000000001";
export const F2 = "f0000000-0000-0000-0000-000000000002";
export const DR = "d0000000-0000-0000-0000-000000000001";
export const ER = "d0000000-0000-0000-0000-000000000002";
export const S1 = "50000000-0000-0000-0000-000000000001";
export const S2 = "50000000-0000-0000-0000-000000000002";
export const P1 = "b0000000-0000-0000-0000-000000000001"; // pending_approval
export const P2 = "b0000000-0000-0000-0000-000000000002"; // approved

export const SEED = `
insert into auth.users(id, email, raw_user_meta_data) values
  ('${U.H}', 'h@x.com', '{"role":"hospital"}'), ('${U.D}', 'd@x.com', '{"role":"locum_tenens"}'),
  ('${U.E}', 'e@x.com', '{"role":"locum_tenens"}'), ('${U.H2}', 'h2@x.com', '{"role":"hospital"}'),
  ('${U.A}', 'chitrothusanjita@gmail.com', '{}');
update profiles set verification_status = 'Approved', verified = true, completed_onboarding = true where id <> '${U.A}';
update profiles set verification_status = 'Submitted', verified = false where id = '${U.E}';
insert into facilities(id, profile_id, name) values ('${F}', '${U.H}', 'Hosp'), ('${F2}', '${U.H2}', 'Hosp2');
insert into doctors(id, profile_id, first_name, last_name, specialty, uploaded_documents) values
  ('${DR}', '${U.D}', 'D', 'Doc', 'ER',
   '{"license":{"path":"x/a.pdf","status":"approved","reviewedAt":"t1"},"id":{"path":"x/b.pdf","status":"rejected","rejectionReason":"blurry"}}'),
  ('${ER}', '${U.E}', 'E', 'Doc', 'ER', '{}');
insert into shifts(id, facility_id, title, department_name, facility_name, date, start_time, end_time, shift_type, hourly_rate, status, assigned_doctor_id) values
  ('${S1}', '${F}', 'Night', 'ER', 'Hosp', '2026-10-01', '20:00', '08:00', 'Night', 100, 'pending', '${DR}'),
  ('${S2}', '${F}', 'Day', 'ER', 'Hosp', '2026-10-02', '08:00', '20:00', 'Day', 100, 'open', null);
insert into applications(shift_id, doctor_id, status) values ('${S2}', '${DR}', 'in_review');
insert into payouts(id, shift_id, doctor_id, facility_id, hours, hourly_rate, gross_pay, net_payout, status) values
  ('${P1}', '${S1}', '${DR}', '${F}', 12, 100, 1200, 1080, 'pending_approval'),
  ('${P2}', '${S1}', '${DR}', '${F}', 12, 100, 1200, 1080, 'approved');
insert into replacement_requests(shift_id, requesting_doctor_id, reason, hourly_compensation) values ('${S1}', '${DR}', 'sick', 100);
insert into attendance_records(shift_id, replacement_doctor_id, check_in_time, status) values ('${S1}', '${DR}', now(), 'checked_in');
insert into message_threads(id, participant_one, participant_two) values ('70000000-0000-0000-0000-000000000001', '${U.H}', '${U.D}');
insert into messages(thread_id, sender_id, body) values ('70000000-0000-0000-0000-000000000001', '${U.H}', 'hello');
insert into storage.objects(bucket_id, name) values ('documents', '${U.D}/locum_tenens_docs/license.pdf');
`;
