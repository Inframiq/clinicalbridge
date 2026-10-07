"use client";

import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHasMounted } from "@/hooks/use-has-mounted";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

/**
 * Light / Dark / System picker. Gated on `useHasMounted` because the
 * active theme is only knowable client-side (it depends on the OS
 * preference or a value read from localStorage) - rendering the real icon
 * on the server would mismatch whatever the client actually resolves to.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const Icon = mounted ? current.icon : Laptop;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Icon className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
