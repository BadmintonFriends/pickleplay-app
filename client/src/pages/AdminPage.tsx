import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Trophy, Users, Settings, ChevronLeft, ChevronRight,
  Plus, Edit3, Trash2, Eye, CheckCircle2, XCircle,
  CreditCard, Download, Loader2, AlertCircle, Home,
  Shield, UserCheck, Search, Filter, Save, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

type AdminTab = "tournaments" | "registrations" | "users";
type TournamentFormMode = "list" | "create" | "edit";

interface TournamentFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  address: string;
  feePerTeam: number;
  giftDescription: string;
  sizeType: "numeric" | "alpha";
  sizeOptions: string;
  hasAgeGroup: boolean;
  hasSingles: boolean;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  paymentNote: string;
  status: "draft" | "open" | "closed" | "cancelled";
  organizerHosts: string;
  organizerSponsors: string;
}

interface EventFormData {
  eventType: "남복" | "여복" | "혼복" | "남단" | "여단";
  skillLevel: string;
  maxTeams: number;
  dayLabel: string;
}

interface AgeGroupFormData {
  code: string;
  label: string;
  minAge: number;
  maxAge: number;
}

const emptyForm = (): TournamentFormData => ({
  name: "", description: "", startDate: "", endDate: "", venue: "", address: "",
  feePerTeam: 0, giftDescription: "", sizeType: "alpha", sizeOptions: "",
  hasAgeGroup: false, hasSingles: false, bankName: "", accountNumber: "",
  accountHolder: "", paymentNote: "", status: "draft", organizerHosts: "", organizerSponsors: "",
});

const emptyEvent = (): EventFormData => ({ eventType: "남복", skillLevel: "", maxTeams: 40, dayLabel: "" });
const emptyAgeGroup = (): AgeGroupFormData => ({ code: "", label: "", minAge: 0, maxAge: 99 });

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

  // Tournament form state
  const [formMode, setFormMode] = useState<TournamentFormMode>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TournamentFormData>(emptyForm());
  const [events, setEvents] = useState<EventFormData[]>([emptyEvent()]);
  const [ageGroups, setAgeGroups] = useState<AgeGroupFormData[]>([]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "organizer";

  // Queries
  const utils = trpc.useUtils();
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

  const createTournamentMutation = trpc.admin.createTournament.useMutation({
    onSuccess: async (data) => {
      toast.success("대회가 생성되었습니다!");
      // Set events
      if (events.length > 0 && events.some(e => e.skillLevel)) {
        await setEventsMutation.mutateAsync({ tournamentId: data.id, events: events.filter(e => e.skillLevel) });
      }
      // Set age groups
      if (form.hasAgeGroup && ageGroups.length > 0 && ageGroups.some(ag => ag.code)) {
        await setAgeGroupsMutation.mutateAsync({ tournamentId: data.id, ageGroups: ageGroups.filter(ag => ag.code) });
      }
      utils.tournament.list.invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTournamentMutation = trpc.admin.updateTournament.useMutation({
    onSuccess: async () => {
      toast.success("대회가 수정되었습니다!");
      if (editingId) {
        await setEventsMutation.mutateAsync({ tournamentId: editingId, events: events.filter(e => e.skillLevel) });
        if (form.hasAgeGroup && ageGroups.length > 0) {
          await setAgeGroupsMutation.mutateAsync({ tournamentId: editingId, ageGroups: ageGroups.filter(ag => ag.code) });
        }
      }
      utils.tournament.list.invalidate();
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const setEventsMutation = trpc.admin.setEvents.useMutation();
  const setAgeGroupsMutation = trpc.admin.setAgeGroups.useMutation();

  const resetForm = () => {
    setFormMode("list");
    setEditingId(null);
    setForm(emptyForm());
    setEvents([emptyEvent()]);
    setAgeGroups([]);
  };

  const startCreate = () => {
    resetForm();
    setFormMode("create");
  };

  const startEdit = async (t: any) => {
    const orgInfo = t.organizerInfo ? JSON.parse(t.organizerInfo) : { hosts: [], sponsors: [] };
    setForm({
      name: t.name, description: t.description ?? "", startDate: t.startDate, endDate: t.endDate,
      venue: t.venue, address: t.address, feePerTeam: t.feePerTeam ?? 0,
      giftDescription: t.giftDescription ?? "", sizeType: t.sizeType ?? "alpha",
      sizeOptions: t.sizeOptions ?? "", hasAgeGroup: t.hasAgeGroup ?? false,
      hasSingles: t.hasSingles ?? false, bankName: t.bankName ?? "",
      accountNumber: t.accountNumber ?? "", accountHolder: t.accountHolder ?? "",
      paymentNote: t.paymentNote ?? "", status: t.status,
      organizerHosts: orgInfo.hosts?.join(", ") ?? "",
      organizerSponsors: orgInfo.sponsors?.join(", ") ?? "",
    });
    // Load events from detail
    try {
      const detail = await utils.tournament.detail.fetch({ id: t.id });
      if (detail.events.length > 0) {
        setEvents(detail.events.map((e: any) => ({
          eventType: e.eventType, skillLevel: e.skillLevel, maxTeams: e.maxTeams, dayLabel: e.dayLabel ?? "",
        })));
      } else {
        setEvents([emptyEvent()]);
      }
      if (detail.ageGroups && detail.ageGroups.length > 0) {
        setAgeGroups(detail.ageGroups.map((ag: any) => ({
          code: ag.code, label: ag.label, minAge: ag.minAge, maxAge: ag.maxAge ?? 99,
        })));
      }
    } catch {
      setEvents([emptyEvent()]);
    }
    setEditingId(t.id);
    setFormMode("edit");
  };

  const handleSubmit = () => {
    if (!form.name || !form.startDate || !form.endDate || !form.venue || !form.address) {
      toast.error("필수 항목을 모두 입력해주세요 (이름, 일시, 장소, 주소)");
      return;
    }
    const organizerInfo = JSON.stringify({
      hosts: form.organizerHosts.split(",").map(s => s.trim()).filter(Boolean),
      sponsors: form.organizerSponsors.split(",").map(s => s.trim()).filter(Boolean),
    });
    const payload = {
      name: form.name, description: form.description || undefined,
      startDate: form.startDate, endDate: form.endDate,
      venue: form.venue, address: form.address, organizerInfo,
      feePerTeam: form.feePerTeam, giftDescription: form.giftDescription || undefined,
      sizeType: form.sizeType, sizeOptions: form.sizeOptions || undefined,
      hasAgeGroup: form.hasAgeGroup, hasSingles: form.hasSingles,
      bankName: form.bankName || undefined, accountNumber: form.accountNumber || undefined,
      accountHolder: form.accountHolder || undefined, paymentNote: form.paymentNote || undefined,
      status: form.status,
    };

    if (formMode === "create") {
      createTournamentMutation.mutate(payload);
    } else if (formMode === "edit" && editingId) {
      updateTournamentMutation.mutate({ id: editingId, data: payload });
    }
  };

  // Excel export
  const handleExcelExport = async () => {
    if (!regData || regData.length === 0) {
      toast.error("내보낼 접수 데이터가 없습니다");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows: any[][] = [
        ["접수번호", "접수상태", "입금상태", "종목", "급수", "선수1이름", "선수1생년월일", "선수1전화번호", "선수1사이즈", "선수2이름", "선수2생년월일", "선수2전화번호", "선수2사이즈", "접수일시"],
      ];
      for (const reg of regData) {
        const p1 = reg.players?.[0];
        const p2 = reg.players?.[1];
        rows.push([
          reg.registrationNumber,
          reg.status === "pending" ? "대기" : reg.status === "confirmed" ? "확정" : "취소",
          reg.paymentStatus === "unpaid" ? "미입금" : reg.paymentStatus === "paid" ? "입금완료" : "환불",
          (reg as any).eventType ?? "",
          (reg as any).skillLevel ?? "",
          p1?.name ?? "", p1?.birthDate ?? "", p1?.phone ?? "", p1?.giftSize ?? "",
          p2?.name ?? "", p2?.birthDate ?? "", p2?.phone ?? "", p2?.giftSize ?? "",
          reg.createdAt ? new Date(reg.createdAt).toLocaleString("ko-KR") : "",
        ]);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Column widths
      ws["!cols"] = [
        { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 8 },
        { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 6 },
        { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "접수명단");
      const tName = tournamentList?.find((t: any) => t.id === selectedTournamentId)?.name ?? "대회";
      XLSX.writeFile(wb, `${tName}_접수명단.xlsx`);
      toast.success("엑셀 파일이 다운로드되었습니다");
    } catch (err) {
      toast.error("엑셀 내보내기 실패");
    }
  };

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

  const isSaving = createTournamentMutation.isPending || updateTournamentMutation.isPending;

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
              onClick={() => { setActiveTab(t.key); if (t.key === "tournaments") resetForm(); }}
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
      <div className="p-4 max-w-2xl mx-auto">
        {/* ─── Tournaments Tab ─── */}
        {activeTab === "tournaments" && formMode === "list" && (
          <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-[#1a1a2e]">대회 목록</h2>
              <button
                onClick={startCreate}
                className="flex items-center gap-1 bg-[#C8E632] text-[#1a1a2e] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#b8d62a] transition-colors"
              >
                <Plus className="w-3 h-3" /> 대회 추가
              </button>
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
                      onClick={() => startEdit(t)}
                      className="text-[10px] font-bold text-blue-500 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> 수정
                    </button>
                    <button
                      onClick={() => { setSelectedTournamentId(t.id); setActiveTab("registrations"); }}
                      className="text-[10px] font-bold text-purple-500 flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" /> 접수 관리
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* ─── Tournament Create/Edit Form ─── */}
        {activeTab === "tournaments" && (formMode === "create" || formMode === "edit") && (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1a1a2e]">
                {formMode === "create" ? "대회 생성" : "대회 수정"}
              </h2>
              <button onClick={resetForm} className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                <X className="w-3.5 h-3.5" /> 취소
              </button>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-[#1a1a2e] mb-2">기본 정보</h3>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">대회명 *</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 리닝코리아 포항 전국 피클볼 대회" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">설명</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50 min-h-[60px]" placeholder="대회 설명" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">시작일 *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">종료일 *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">장소 *</label>
                <input value={form.venue} onChange={e => setForm(p => ({...p, venue: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 만인당실내체육관" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">주소 *</label>
                <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 경북 포항시 남구 희망대로 814" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">상태</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as any}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50">
                  <option value="draft">준비 중</option>
                  <option value="open">접수 중</option>
                  <option value="closed">접수 마감</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-[#1a1a2e] mb-2">주최/후원 정보</h3>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">주최·주관 (쉼표 구분)</label>
                <input value={form.organizerHosts} onChange={e => setForm(p => ({...p, organizerHosts: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 리닝코리아, 포항 피클볼 조직위원회" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">후원·협찬 (쉼표 구분)</label>
                <input value={form.organizerSponsors} onChange={e => setForm(p => ({...p, organizerSponsors: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 포항시 체육회, 대한피클볼 협회" />
              </div>
            </div>

            {/* Fee & Gift */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-[#1a1a2e] mb-2">참가비 & 기념품</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">참가비 (원)</label>
                  <input type="number" value={form.feePerTeam} onChange={e => setForm(p => ({...p, feePerTeam: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">기념품 설명</label>
                  <input value={form.giftDescription} onChange={e => setForm(p => ({...p, giftDescription: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 리닝 반팔 티셔츠" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">사이즈 옵션 (쉼표 구분)</label>
                <input value={form.sizeOptions} onChange={e => setForm(p => ({...p, sizeOptions: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder='예: S, M, L, XL, 2XL, 3XL 또는 ["S","M","L","XL"]' />
              </div>
            </div>

            {/* Bank Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-[#1a1a2e] mb-2">입금 정보</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">은행명</label>
                  <input value={form.bankName} onChange={e => setForm(p => ({...p, bankName: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 카카오뱅크" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">예금주</label>
                  <input value={form.accountHolder} onChange={e => setForm(p => ({...p, accountHolder: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 홍길동" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">계좌번호</label>
                <input value={form.accountNumber} onChange={e => setForm(p => ({...p, accountNumber: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 3333-12-1234567" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">입금 안내 메모</label>
                <input value={form.paymentNote} onChange={e => setForm(p => ({...p, paymentNote: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50" placeholder="예: 입금자명에 팀명을 기재해주세요" />
              </div>
            </div>

            {/* Options */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-[#1a1a2e] mb-2">옵션</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.hasAgeGroup} onChange={e => setForm(p => ({...p, hasAgeGroup: e.target.checked}))}
                    className="rounded border-gray-300" />
                  연령대 구분
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.hasSingles} onChange={e => setForm(p => ({...p, hasSingles: e.target.checked}))}
                    className="rounded border-gray-300" />
                  단식 종목 포함
                </label>
              </div>
            </div>

            {/* Events */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1a1a2e]">종목 설정</h3>
                <button onClick={() => setEvents(prev => [...prev, emptyEvent()])}
                  className="text-[10px] font-bold text-[#8BA61E] flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              {events.map((ev, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-end">
                  <div className="col-span-3">
                    <label className="text-[9px] text-gray-400 block mb-0.5">종목</label>
                    <select value={ev.eventType} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], eventType: e.target.value as any}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100">
                      <option value="남복">남복</option>
                      <option value="여복">여복</option>
                      <option value="혼복">혼복</option>
                      {form.hasSingles && <option value="남단">남단</option>}
                      {form.hasSingles && <option value="여단">여단</option>}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[9px] text-gray-400 block mb-0.5">급수</label>
                    <input value={ev.skillLevel} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], skillLevel: e.target.value}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" placeholder="A조" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] text-gray-400 block mb-0.5">최대팀</label>
                    <input type="number" value={ev.maxTeams} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], maxTeams: Number(e.target.value)}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[9px] text-gray-400 block mb-0.5">일자</label>
                    <input value={ev.dayLabel} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], dayLabel: e.target.value}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" placeholder="Day1" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {events.length > 1 && (
                      <button onClick={() => setEvents(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Age Groups (if enabled) */}
            {form.hasAgeGroup && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1a1a2e]">연령대 설정</h3>
                  <button onClick={() => setAgeGroups(prev => [...prev, emptyAgeGroup()])}
                    className="text-[10px] font-bold text-[#8BA61E] flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                </div>
                {ageGroups.map((ag, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-end">
                    <div className="col-span-2">
                      <label className="text-[9px] text-gray-400 block mb-0.5">코드</label>
                      <input value={ag.code} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], code: e.target.value}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" placeholder="A" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[9px] text-gray-400 block mb-0.5">라벨</label>
                      <input value={ag.label} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], label: e.target.value}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" placeholder="20~30대" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-gray-400 block mb-0.5">최소</label>
                      <input type="number" value={ag.minAge} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], minAge: Number(e.target.value)}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-gray-400 block mb-0.5">최대</label>
                      <input type="number" value={ag.maxAge} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], maxAge: Number(e.target.value)}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-gray-50 rounded text-[10px] border border-gray-100" />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button onClick={() => setAgeGroups(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {ageGroups.length === 0 && (
                  <p className="text-[10px] text-gray-400 text-center py-2">연령대를 추가해주세요</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="w-full bg-[#C8E632] text-[#1a1a2e] text-sm font-black py-3.5 rounded-xl hover:bg-[#b8d62a] transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "저장 중..." : formMode === "create" ? "대회 생성" : "대회 수정"}
            </button>
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
                {/* Search + Export */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="이름, 전화번호, 접수번호 검색..."
                      className="w-full pl-10 pr-3 py-2.5 bg-white rounded-xl text-xs text-[#1a1a2e] placeholder:text-gray-300 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50"
                    />
                  </div>
                  <button
                    onClick={handleExcelExport}
                    className="flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-bold px-3 py-2.5 rounded-xl hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    엑셀 내보내기
                  </button>
                </div>

                {/* Stats */}
                {regData && regData.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-lg p-2.5 text-center border border-gray-100">
                      <p className="text-lg font-black text-[#1a1a2e]">{regData.length}</p>
                      <p className="text-[9px] text-gray-400">전체</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center border border-gray-100">
                      <p className="text-lg font-black text-green-600">{regData.filter((r: any) => r.paymentStatus === "paid").length}</p>
                      <p className="text-[9px] text-gray-400">입금완료</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center border border-gray-100">
                      <p className="text-lg font-black text-amber-500">{regData.filter((r: any) => r.paymentStatus === "unpaid").length}</p>
                      <p className="text-[9px] text-gray-400">미입금</p>
                    </div>
                  </div>
                )}

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
