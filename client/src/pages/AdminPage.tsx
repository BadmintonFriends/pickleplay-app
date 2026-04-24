import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Trophy, Users, Settings, ChevronLeft, ChevronRight,
  Plus, Edit3, Trash2, Eye, CheckCircle2, XCircle,
  CreditCard, Download, Loader2, AlertCircle, Home,
  Shield, UserCheck, Search, Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type AdminTab = "tournaments" | "registrations" | "users";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("tournaments");
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Check admin access
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "organizer";

  // Queries
  const { data: tournamentList } = trpc.tournament.list.useQuery(undefined, { enabled: isAdmin });
  const { data: allUsers } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin && activeTab === "users" });
  const { data: regData, refetch: refetchRegs } = trpc.admin.tournamentRegistrations.useQuery(
    { tournamentId: selectedTournamentId! },
    { enabled: isAdmin && activeTab === "registrations" && !!selectedTournamentId }
  );

  // Mutations
  const updatePaymentMutation = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => { toast.success("입금 상태 변경 완료"); refetchRegs(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.admin.updateRegistrationStatus.useMutation({
    onSuccess: () => { toast.success("접수 상태 변경 완료"); refetchRegs(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("역할 변경 완료"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C8E632] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-gray-300 mb-3" />
        <h2 className="text-base font-bold text-[#1a1a2e] mb-1">관리자 로그인 필요</h2>
        <p className="text-xs text-gray-400 mb-4">관리자 권한이 필요합니다</p>
        <a href={getLoginUrl()} className="bg-[#C8E632] text-[#1a1a2e] text-sm font-bold px-6 py-2.5 rounded-xl">
          로그인
        </a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-red-300 mb-3" />
        <h2 className="text-base font-bold text-[#1a1a2e] mb-1">접근 권한 없음</h2>
        <p className="text-xs text-gray-400 mb-4">관리자 또는 대회 운영자 권한이 필요합니다</p>
        <button onClick={() => navigate("/")} className="bg-gray-200 text-gray-700 text-sm font-bold px-6 py-2.5 rounded-xl">
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: "tournaments", label: "대회 관리", icon: Trophy },
    { key: "registrations", label: "접수 관리", icon: Users },
    { key: "users", label: "사용자", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Admin Header */}
      <div className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Home className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold">PicklePlay 관리자</h1>
            <p className="text-[10px] text-white/50">{user?.name ?? user?.email}</p>
          </div>
        </div>
        <Badge className="bg-[#C8E632] text-[#1a1a2e] text-[10px] font-bold">{user?.role}</Badge>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? "border-[#C8E632] text-[#1a1a2e]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* ─── Tournaments Tab ─── */}
        {activeTab === "tournaments" && (
          <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-[#1a1a2e]">대회 목록</h2>
            </div>
            {!tournamentList || tournamentList.length === 0 ? (
              <div className="text-center py-10">
                <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">등록된 대회가 없습니다</p>
              </div>
            ) : (
              tournamentList.map((t: any) => (
                <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-[#1a1a2e] flex-1 truncate">{t.name}</h3>
                    <Badge variant="outline" className="text-[9px] ml-2">{t.status}</Badge>
                  </div>
                  <p className="text-[10px] text-gray-400">{t.startDate} · {t.venue}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => navigate(`/tournament/${t.id}`)}
                      className="text-[10px] font-bold text-[#8BA61E] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> 상세
                    </button>
                    <button
                      onClick={() => { setSelectedTournamentId(t.id); setActiveTab("registrations"); }}
                      className="text-[10px] font-bold text-blue-500 flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" /> 접수 관리
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* ─── Registrations Tab ─── */}
        {activeTab === "registrations" && (
          <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            {/* Tournament Selector */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">대회 선택</label>
              <select
                value={selectedTournamentId ?? ""}
                onChange={(e) => setSelectedTournamentId(Number(e.target.value) || null)}
                className="w-full py-2 px-3 bg-gray-50 rounded-lg text-xs text-[#1a1a2e] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50"
              >
                <option value="">대회를 선택하세요</option>
                {tournamentList?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTournamentId && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름, 전화번호, 접수번호 검색..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white rounded-xl text-xs text-[#1a1a2e] placeholder:text-gray-300 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50"
                  />
                </div>

                {/* Registration List */}
                {!regData ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-[#C8E632] animate-spin" />
                  </div>
                ) : regData.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">접수 내역이 없습니다</p>
                  </div>
                ) : (
                  regData
                    .filter((r: any) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        r.registrationNumber?.toLowerCase().includes(q) ||
                        r.players?.some((p: any) =>
                          p.name.toLowerCase().includes(q) || p.phone.includes(q)
                        )
                      );
                    })
                    .map((reg: any) => (
                      <div key={reg.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-gray-400">{reg.registrationNumber}</span>
                          <div className="flex gap-1">
                            <select
                              value={reg.paymentStatus}
                              onChange={(e) => updatePaymentMutation.mutate({ registrationId: reg.id, paymentStatus: e.target.value as any })}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 bg-white"
                            >
                              <option value="unpaid">미입금</option>
                              <option value="paid">입금완료</option>
                              <option value="refunded">환불</option>
                            </select>
                            <select
                              value={reg.status}
                              onChange={(e) => updateStatusMutation.mutate({ registrationId: reg.id, status: e.target.value as any })}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 bg-white"
                            >
                              <option value="pending">대기</option>
                              <option value="confirmed">확정</option>
                              <option value="cancelled">취소</option>
                            </select>
                          </div>
                        </div>
                        {reg.players?.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2 text-[10px] text-gray-600 py-0.5">
                            <span className="font-bold text-[#1a1a2e]">{p.name}</span>
                            <span>{p.phone}</span>
                            <span>{p.birthDate}</span>
                            {p.giftSize && <Badge variant="outline" className="text-[8px]">{p.giftSize}</Badge>}
                          </div>
                        ))}
                      </div>
                    ))
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ─── Users Tab ─── */}
        {activeTab === "users" && (
          <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <h2 className="text-sm font-bold text-[#1a1a2e] mb-2">사용자 관리</h2>
            {!allUsers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#C8E632] animate-spin" />
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">사용자가 없습니다</p>
            ) : (
              allUsers.map((u: any) => (
                <div key={u.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#C8E632]/15 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[#8BA61E]">{u.name?.[0] ?? "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1a2e] truncate">{u.name ?? "이름 없음"}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email ?? u.phone ?? u.openId}</p>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: u.id, role: e.target.value as any })}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 bg-white"
                  >
                    <option value="user">user</option>
                    <option value="organizer">organizer</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
