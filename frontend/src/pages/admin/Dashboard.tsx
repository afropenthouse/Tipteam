import { useState, useEffect } from "react";
import {
  Users,
  Store,
  Star,
  MessageSquareWarning,
  Wallet,
  CreditCard,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const fmtNGN = (n: number) => `₦${n.toLocaleString()}`;

const statsCards = [
  { label: "Total Users", icon: Users, color: "text-blue-500" },
  { label: "Active Businesses", icon: Store, color: "text-green-500" },
  { label: "Total Feedback", icon: MessageSquareWarning, color: "text-yellow-500" },
  { label: "Withdrawals", icon: Wallet, color: "text-purple-500" },
  { label: "Active Subscriptions", icon: CreditCard, color: "text-pink-500" },
  { label: "Total Tips Earned", icon: TrendingUp, color: "text-emerald-500" },
  { label: "Total Withdrawn", icon: Activity, color: "text-orange-500" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => adminApi.getDashboardStats(),
  });

  const stats = data?.stats;

  const statItems = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Active Businesses", value: stats?.totalBusinesses ?? 0 },
    { label: "Total Feedback", value: stats?.totalFeedback ?? 0 },
    { label: "Withdrawals", value: stats?.totalWithdrawals ?? 0 },
    { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0 },
    { label: "Total Tips Earned", value: fmtNGN(stats?.totalTipsEarned ?? 0), prefix: true },
    { label: "Total Withdrawn", value: fmtNGN(stats?.totalAmountWithdrawn ?? 0), prefix: true },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Platform-wide statistics at a glance.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((s, i) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                {statsCards[i] && (() => {
                  const Icon = statsCards[i].icon;
                  return <Icon className={`h-4 w-4 ${statsCards[i].color}`} />;
                })()}
              </div>
              <div className="mt-3 text-2xl font-bold">{isLoading ? <Skeleton className="h-6 w-24" /> : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity placeholder */}
      <Card>
        <CardHeader>
          <span className="font-semibold">Recent Activity</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>vf
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Dashboard refreshed</TableCell>
                  <TableCell className="text-muted-foreground">Viewed platform overview</TableCell>
                  <TableCell className="text-right text-muted-foreground">Just now</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}