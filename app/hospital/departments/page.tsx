"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Users, UserCheck, UserMinus, DoorOpen, CalendarDays, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoctors } from "@/hooks/use-doctors";
import { useShifts } from "@/hooks/use-shifts";
import { useDepartments } from "@/hooks/use-departments";
import { useFacilities } from "@/hooks/use-facilities";
import { useAuthRole } from "@/context/auth-provider";
import { CITY_MEDICAL } from "@/context/app-data-provider";

export default function DepartmentsPage() {
  const { doctors } = useDoctors();
  const { shifts } = useShifts();
  const { departments, createDepartment, renameDepartment, deleteDepartment } = useDepartments();
  const { facilities } = useFacilities();
  const { profile } = useAuthRole();

  const myFacility =
    facilities.find((f) => f.profileId === profile?.id) ??
    facilities.find((f) => f.id === CITY_MEDICAL.facilityId);
  const myDepartments = departments.filter((d) => d.facilityId === myFacility?.id);

  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const departmentStats = myDepartments.map((department) => {
    const deptDoctors = doctors.filter((d) => d.department === department.name);
    const onDutyIds = new Set(
      shifts.filter((s) => s.status === "active").map((s) => s.assignedDoctorId)
    );
    const available = deptDoctors.filter((d) => d.status === "active" && !onDutyIds.has(d.id));
    const onLeave = deptDoctors.filter((d) => d.status === "inactive");
    const deptShifts = shifts.filter((s) => s.department === department.name);
    const vacantPositions = deptShifts.filter((s) => s.status === "open");
    const upcomingShifts = deptShifts.filter((s) => s.status === "confirmed" || s.status === "pending");

    return {
      department,
      total: deptDoctors.length,
      available: available.length,
      onLeave: onLeave.length,
      vacant: vacantPositions.length,
      upcoming: upcomingShifts.length,
    };
  });

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !myFacility) return;
    setIsCreating(true);
    try {
      await createDepartment({ facilityId: myFacility.id, name });
      toast.success(`${name} added.`);
      setNewName("");
    } catch {
      // AppDataProvider already rolled back and showed an error toast
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    await renameDepartment(id, name);
    setEditingId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    await deleteDepartment(id);
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Staffing levels and coverage across every department."
      />

      <div className="mb-6 flex items-center gap-2">
        <Input
          placeholder="New department name (e.g. Cardiology)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="max-w-xs"
        />
        <Button type="button" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
          <Plus className="size-4" /> Add Department
        </Button>
      </div>

      {myDepartments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No departments yet. Add your first one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departmentStats.map((stat) => (
            <Card key={stat.department.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                      <Building2 className="size-4" />
                    </span>
                    {editingId === stat.department.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(stat.department.id)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{stat.department.name}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {editingId === stat.department.id ? (
                      <>
                        <Button size="icon-sm" variant="ghost" onClick={() => saveEdit(stat.department.id)}>
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => startEditing(stat.department.id, stat.department.name)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(stat.department.id, stat.department.name)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground">{stat.total}</span>
                    <span className="truncate text-muted-foreground">Doctors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 shrink-0 text-success" />
                    <span className="font-medium text-foreground">{stat.available}</span>
                    <span className="truncate text-muted-foreground">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserMinus className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground">{stat.onLeave}</span>
                    <span className="truncate text-muted-foreground">On Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="size-4 shrink-0 text-warning-foreground" />
                    <span className="font-medium text-foreground">{stat.vacant}</span>
                    <span className="truncate text-muted-foreground">Vacant</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <CalendarDays className="size-4 text-info" />
                    <span className="font-medium text-foreground">{stat.upcoming}</span>
                    <span className="text-muted-foreground">Upcoming Shifts</span>
                  </div>
                </div>
                <Link
                  href="/hospital/doctors"
                  className="mt-4 inline-block text-xs font-medium text-brand hover:underline"
                >
                  View doctors in this department →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
