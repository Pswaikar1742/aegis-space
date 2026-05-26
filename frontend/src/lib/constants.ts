import { LayoutDashboard, Users, BarChart3, Building2, Bell, Search, DollarSign, TrendingUp, CheckCircle2, Shield, Wrench, CreditCard, Printer, Zap, Send, Settings, UserCircle, Briefcase, Activity, LockKeyhole, Fingerprint, ShieldCheck, LogOut, Mail, MapPin, Layers3, CalendarRange } from 'lucide-react';
import type { Persona } from './types';

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://aegis-space-backend.onrender.com";
export const KALYAN_BRANCH_ID = "4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";
export const BKC_BRANCH_ID = "8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e";
export const HYD_BRANCH_ID = "9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f";
export const STARK_MEMBER_ID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";

export const SESSION_STORAGE_KEY = 'aegis-space-session';
export const ACTIVE_BRANCH_STORAGE_KEY = 'aegis-space-active-branch';
export const MEMBER_LOCATION_STORAGE_KEY = 'aegis-space-member-location';

export const NAV_ITEMS: { key: Persona; label: string; icon: any; category: string }[] = [
  { key: 'cfo', label: 'CFO Treasury', icon: BarChart3, category: 'Native' },
  { key: 'manager', label: 'Branch Manager', icon: LayoutDashboard, category: 'Native' },
  { key: 'tenant_admin', label: 'Tenant Admin', icon: Building2, category: 'Native' },
  { key: 'member', label: 'Coworking Member', icon: UserCircle, category: 'Native' },
  { key: 'front_desk', label: 'Front Desk / Security', icon: Shield, category: 'Integration' },
  { key: 'it_admin', label: 'IT / Network Admin', icon: Activity, category: 'Integration' },
  { key: 'vendor', label: 'Janitorial / Vendor', icon: Wrench, category: 'Integration' },
];

export const PERSONA_CREDENTIALS: Record<Persona, { label: string; password: string; access: string }> = {
  cfo: { label: 'CFO Treasury', password: 'AegisSpace2026!CFO', access: 'Executive finance and portfolio reporting' },
  manager: { label: 'Branch Manager', password: 'AegisSpace2026!MGR', access: 'Operations, bookings, and floor control' },
  tenant_admin: { label: 'Tenant Admin', password: 'AegisSpace2026!TEN', access: 'Member perks and internal tenant workflows' },
  member: { label: 'Coworking Member', password: 'AegisSpace2026!MEM', access: 'End-user booking and activity access' },
  front_desk: { label: 'Front Desk / Security', password: 'AegisSpace2026!FRONT', access: 'Visitor check-in and access logging' },
  it_admin: { label: 'IT / Network Admin', password: 'AegisSpace2026!IT', access: 'Infrastructure and connectivity oversight' },
  vendor: { label: 'Janitorial / Vendor', password: 'AegisSpace2026!VEND', access: 'Facility task tracking and closeout' },
};

export const MEMBER_LOCATION_FILTERS = [
  { value: 'all', label: 'All locations', hint: 'Every available slot in this branch' },
  { value: 'hot_desk', label: 'Hot desks', hint: 'Flexible shared desks' },
  { value: 'dedicated_desk', label: 'Dedicated desks', hint: 'Reserved personal seats' },
  { value: 'meeting_room', label: 'Meeting rooms', hint: 'Hourly or session booking spaces' },
  { value: 'private_suite', label: 'Private suites', hint: 'Enclosed team spaces' },
];
