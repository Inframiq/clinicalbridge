"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, User, ShieldCheck, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuthRole } from "@/context/auth-provider";
import { ROLE_CONFIG } from "@/lib/roles";
import { formatDate, initials } from "@/lib/format";

/**
 * The account-level "My Profile" page (name, email, phone, role, member
 * since) - distinct from each role's Settings page, which covers
 * organization/professional info (facility details for a hospital,
 * specialty/license for a doctor) rather than the personal account itself.
 * Shared across all four roles since this data all lives on `profiles`,
 * the same table regardless of role.
 */
export function AccountProfilePage() {
  const { profile, name, updateAccountProfile } = useAuthRole();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  // Seed the form once profile finishes loading (it's null on first render
  // while AuthProvider is still fetching) - same during-render adjustment
  // pattern used by the role Settings pages, avoiding an extra effect pass.
  const [syncedId, setSyncedId] = useState<string | undefined>(undefined);
  if (profile && profile.id !== syncedId) {
    setSyncedId(profile.id);
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateAccountProfile({ full_name: fullName, phone });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to update profile");
      return;
    }
    toast.success("Profile updated");
  }

  const roleLabel = profile ? ROLE_CONFIG[profile.role]?.label ?? profile.role : "";
  const [first, ...rest] = (fullName || name || "").trim().split(" ");

  return (
    <div>
      <PageHeader title="My Profile" description="Your personal account details." />

      <div className="grid max-w-2xl grid-cols-1 gap-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Avatar size="lg">
              <AvatarFallback className="bg-brand-muted text-base font-semibold text-brand">
                {initials(first ?? "", rest.slice(-1)[0] ?? "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-foreground">{fullName || name || "—"}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{roleLabel}</Badge>
                {profile?.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <ShieldCheck className="size-3.5" /> Verified
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your name and contact number, shown across your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" value={profile?.email ?? ""} className="pl-9" disabled />
                    </div>
                  </FieldContent>
                </Field>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  Member since {profile?.created_at ? formatDate(profile.created_at) : "—"}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving || !profile}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
