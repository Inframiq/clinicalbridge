import type { AppNotification, ActivityFeedItem, TimelineEvent, Patient } from "@/types";

export const notifications: AppNotification[] = [
  {
    id: "note-001",
    title: "System Maintenance",
    body: "Scheduled maintenance on May 28, 2025 from 02:00 AM - 04:00 AM.",
    timestamp: "2 hours ago",
    read: false,
    type: "info",
  },
  {
    id: "note-002",
    title: "New Feature Released",
    body: "Smart Match v2.0 is now live with improved accuracy.",
    timestamp: "1 day ago",
    read: false,
    type: "success",
  },
  {
    id: "note-003",
    title: "Policy Update",
    body: "Updated cancellation policy effective from May 20, 2025.",
    timestamp: "2 days ago",
    read: true,
    type: "warning",
  },
];

export const activityFeed: ActivityFeedItem[] = [
  {
    id: "act-001",
    actorName: "Dr. Sarah Johnson",
    action: "Applied for ER Physician",
    timestamp: "2 min ago",
    icon: "applied",
  },
  {
    id: "act-002",
    actorName: "Dr. Michael Lee",
    action: "Checked in for ICU Shift",
    timestamp: "15 min ago",
    icon: "checked-in",
  },
  {
    id: "act-003",
    actorName: "New Application",
    action: "For Pediatrician Shift",
    timestamp: "28 min ago",
    icon: "new",
  },
  {
    id: "act-004",
    actorName: "Dr. Priya Shah",
    action: "Completed Pediatric Shift",
    timestamp: "1 hour ago",
    icon: "completed",
  },
];

export const shiftTimeline: TimelineEvent[] = [
  { id: "tl-1", label: "Checked-In", timestamp: "07:55 AM · May 25", status: "done" },
  { id: "tl-2", label: "Currently On Shift", timestamp: "08:00 AM · May 25", status: "current" },
  { id: "tl-3", label: "Break Started", timestamp: "12:00 PM · May 25", status: "upcoming" },
  { id: "tl-4", label: "Break Ended", timestamp: "12:15 PM · May 25", status: "upcoming" },
  { id: "tl-5", label: "Shift Ends", timestamp: "04:00 PM · May 25", status: "upcoming" },
];

export const patients: Patient[] = [
  { id: "pt-1", name: "John Smith", mrn: "MRN-12345", bedRoom: "Room 3", status: "in_progress", lastUpdate: "07:45 AM" },
  { id: "pt-2", name: "Mary Thompson", mrn: "MRN-12346", bedRoom: "Room 5", status: "in_progress", lastUpdate: "08:15 AM" },
  { id: "pt-3", name: "Robert Williams", mrn: "MRN-12347", bedRoom: "Room 2", status: "pending", lastUpdate: "09:00 AM" },
  { id: "pt-4", name: "Susan Kim", mrn: "MRN-12348", bedRoom: "Room 7", status: "in_progress", lastUpdate: "09:10 AM" },
  { id: "pt-5", name: "David Lee", mrn: "MRN-12349", bedRoom: "Room 4", status: "completed", lastUpdate: "07:30 AM" },
];
