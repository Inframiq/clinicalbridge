"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuthRole } from "@/context/auth-provider";

/**
 * Backs a role's "Notification Preferences" toggle list with the real
 * `profiles.notification_preferences` column instead of local-only state.
 * Each caller owns its own topic keys/defaults (they differ per role); this
 * just persists whatever object it's given.
 */
export function useNotificationPreferences(defaults: Record<string, boolean>) {
  const { profile, updateAccountProfile } = useAuthRole();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => ({
    ...defaults,
    ...(profile?.notification_preferences ?? {}),
  }));
  const [saving, setSaving] = useState(false);

  // Adjust state during render the first time the real profile becomes
  // available - same pattern used by the role Settings pages for their own
  // form state, avoiding an extra effect pass / flash of default values.
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  if (profile && profile.id !== loadedProfileId) {
    setLoadedProfileId(profile.id);
    setPrefs({ ...defaults, ...(profile.notification_preferences ?? {}) });
  }

  function setPref(id: string, value: boolean) {
    setPrefs((p) => ({ ...p, [id]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await updateAccountProfile({ notification_preferences: prefs });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to save preferences");
      return;
    }
    toast.success("Preferences saved");
  }

  return { prefs, setPref, save, saving };
}
