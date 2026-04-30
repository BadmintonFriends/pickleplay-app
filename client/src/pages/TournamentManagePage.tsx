import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Users, Download, Loader2, Shield,
  Search, Phone, DollarSign, RefreshCw, MessageSquare,
  Save, Plus, Trash2, Upload, Image as ImageIcon, X,
  Settings, FileText, Trophy, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05 } }),
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: "미입금", color: "bg-yellow-100 text-yellow-700" },
  paid: { label: "입금완료", color: "bg-green-100 text-green-700" },
  refunded: { label: "환불", color: "bg-red-100 text-red-700" },
};

const regStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-gray-100 text-gray-700" },
  confirmed: { label: "확정", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "준비 중", color: "bg-gray-100 text-gray-700" },
  open: { label: "접수 중", color: "bg-green-100 text-green-700" },
  closed: { label: "접수 마감", color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

type ManageTab = "registrations" | "info" | "events" | "media" | "status";

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

const emptyEvent = (): EventFormData => ({ eventType: "남복" as const, skillLevel: "", maxTeams: 40, dayLabel: "" });
const emptyAgeGroup = (): AgeGroupFormData => ({ code: "", label: "", minAge: 20, maxAge: 99 });

export default function TournamentManagePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/tournament/:id/manage");
  const tournamentId = params?.id ? Number(params.id) : null;

  const [activeTab, setActiveTab] = useState<ManageTab>("registrations");
  const [searchQuery, setSearchQuery] = useState("");

  const isAllowed = user?.role === "admin" || user?.role === "super_admin" || !!user;

  // 대회 정보 조회
  const { data: tournament, isLoading: tournamentLoading, refetch: refetchTournament } = trpc.tournament.detail.useQuery(
    { id: tournamentId! },
    { enabled: !!tournamentId && isAllowed }
  );

  // 대회 관리자 여부는 백엔드 verifyTournamentOwnership에서 검증
  const isOwner = useMemo(() => {
    if (!user || !tournament) return false;
    if (user.role === "admin" || user.role === "super_admin") return true;
    // 일반 user는 tournament_organizers 테이블로 검증되므로 우선 true로 설정 (백엔드에서 FORBIDDEN 반환 시 에러 처리)
    return true;
  }, [user, tournament]);

  // 접수 목록 조회
  const { data: regData, refetch: refetchRegs } = trpc.admin.tournamentRegistrations.useQuery(
    { tournamentId: tournamentId! },
    { enabled: !!tournamentId && isOwner && activeTab === "registrations" }
  );

  // ─── Mutations ───
  const utils = trpc.useUtils();
  const updatePaymentMutation = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => { toast.success("입금 상태 변경 완료 (SMS 알림 전송됨)"); refetchRegs(); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateStatusMutation = trpc.admin.updateRegistrationStatus.useMutation({
    onSuccess: () => { toast.success("접수 상태 변경 완료"); refetchRegs(); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateTournamentMutation = trpc.admin.updateTournament.useMutation({
    onSuccess: () => { toast.success("대회 정보가 수정되었습니다!"); refetchTournament(); utils.tournament.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });
  const setEventsMutation = trpc.admin.setEvents.useMutation({
    onSuccess: () => { toast.success("종목 설정이 저장되었습니다!"); refetchTournament(); },
    onError: (err: any) => toast.error(err.message),
  });
  const setAgeGroupsMutation = trpc.admin.setAgeGroups.useMutation({
    onSuccess: () => { toast.success("연령대 설정이 저장되었습니다!"); refetchTournament(); },
    onError: (err: any) => toast.error(err.message),
  });
  const uploadPosterMutation = trpc.admin.uploadPoster.useMutation({
    onSuccess: () => { toast.success("포스터가 업로드되었습니다!"); refetchTournament(); },
    onError: (err: any) => toast.error("포스터 업로드 실패: " + err.message),
  });
  const uploadSizeGuideMutation = trpc.admin.uploadSizeGuide.useMutation({
    onSuccess: () => { toast.success("사이즈표가 업로드되었습니다!"); refetchTournament(); },
    onError: (err: any) => toast.error("사이즈표 업로드 실패: " + err.message),
  });
  const deleteSizeGuideMutation = trpc.admin.deleteSizeGuide.useMutation({
    onSuccess: () => { toast.success("사이즈표가 삭제되었습니다!"); refetchTournament(); },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Organizer Management ───
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [orgSearching, setOrgSearching] = useState(false);

  const { data: organizerList, refetch: refetchOrganizers } = trpc.admin.getTournamentOrganizers.useQuery(
    { tournamentId: tournamentId! },
    { enabled: !!tournamentId && isOwner && activeTab === "info" }
  );
  const addOrganizerMutation = trpc.admin.addTournamentOrganizer.useMutation({
    onSuccess: () => { toast.success("관리자가 추가되었습니다!"); refetchOrganizers(); setShowOrganizerModal(false); setOrgSearchQuery(""); },
    onError: (err: any) => toast.error(err.message),
  });
  const removeOrganizerMutation = trpc.admin.removeTournamentOrganizer.useMutation({
    onSuccess: () => { toast.success("관리자가 제거되었습니다."); refetchOrganizers(); },
    onError: (err: any) => toast.error(err.message),
  });
  const { data: searchedUsers } = trpc.admin.searchUsersForOrganizer.useQuery(
    { query: orgSearchQuery },
    { enabled: orgSearchQuery.length >= 2 && showOrganizerModal }
  );

  const isAdminRole = user?.role === "admin" || user?.role === "super_admin";

  // ─── Info Tab State ───
  const [infoForm, setInfoForm] = useState({
    name: "", description: "", startDate: "", endDate: "",
    venue: "", address: "", feePerTeam: 0, giftDescription: "",
    sizeType: "alpha" as "numeric" | "alpha", sizeOptions: "",
    hasAgeGroup: false, hasSingles: false,
    bankName: "", accountNumber: "", accountHolder: "", paymentNote: "",
    organizerHosts: "", organizerSponsors: "",
  });

  // ─── Events Tab State ───
  const [events, setEvents] = useState<EventFormData[]>([emptyEvent()]);
  const [ageGroups, setAgeGroups] = useState<AgeGroupFormData[]>([]);

  // ─── Media Tab State ───
  const posterInputRef = useRef<HTMLInputElement>(null);
  const sizeGuideInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingSizeGuide, setUploadingSizeGuide] = useState(false);

  // Populate form when tournament data loads
  useEffect(() => {
    if (!tournament) return;
    const orgInfo = tournament.organizerInfo ? JSON.parse(tournament.organizerInfo as string) : { hosts: [], sponsors: [] };
    setInfoForm({
      name: tournament.name ?? "",
      description: tournament.description ?? "",
      startDate: tournament.startDate ?? "",
      endDate: tournament.endDate ?? "",
      venue: tournament.venue ?? "",
      address: tournament.address ?? "",
      feePerTeam: tournament.feePerTeam ?? 0,
      giftDescription: tournament.giftDescription ?? "",
      sizeType: (tournament.sizeType as "numeric" | "alpha") ?? "alpha",
      sizeOptions: tournament.sizeOptions ?? "",
      hasAgeGroup: tournament.hasAgeGroup ?? false,
      hasSingles: tournament.hasSingles ?? false,
      bankName: tournament.bankName ?? "",
      accountNumber: tournament.accountNumber ?? "",
      accountHolder: tournament.accountHolder ?? "",
      paymentNote: tournament.paymentNote ?? "",
      organizerHosts: orgInfo.hosts?.join(", ") ?? "",
      organizerSponsors: orgInfo.sponsors?.join(", ") ?? "",
    });
    if (tournament.events && tournament.events.length > 0) {
      setEvents(tournament.events.map((e: any) => ({
        eventType: e.eventType, skillLevel: e.skillLevel, maxTeams: e.maxTeams, dayLabel: e.dayLabel ?? "",
      })));
    } else {
      setEvents([emptyEvent()]);
    }
    if (tournament.ageGroups && tournament.ageGroups.length > 0) {
      setAgeGroups(tournament.ageGroups.map((ag: any) => ({
        code: ag.code, label: ag.label, minAge: ag.minAge, maxAge: ag.maxAge ?? 99,
      })));
    }
  }, [tournament]);

  // ─── Handlers ───
  const handleInfoSubmit = () => {
    if (!tournamentId) return;
    if (!infoForm.name || !infoForm.startDate || !infoForm.endDate || !infoForm.venue || !infoForm.address) {
      toast.error("필수 항목을 모두 입력해주세요 (이름, 일시, 장소, 주소)");
      return;
    }
    const organizerInfo = JSON.stringify({
      hosts: infoForm.organizerHosts.split(",").map(s => s.trim()).filter(Boolean),
      sponsors: infoForm.organizerSponsors.split(",").map(s => s.trim()).filter(Boolean),
    });
    updateTournamentMutation.mutate({
      id: tournamentId,
      data: {
        name: infoForm.name, description: infoForm.description || undefined,
        startDate: infoForm.startDate, endDate: infoForm.endDate,
        venue: infoForm.venue, address: infoForm.address, organizerInfo,
        feePerTeam: infoForm.feePerTeam, giftDescription: infoForm.giftDescription || undefined,
        sizeType: infoForm.sizeType, sizeOptions: infoForm.sizeOptions || undefined,
        hasAgeGroup: infoForm.hasAgeGroup, hasSingles: infoForm.hasSingles,
        bankName: infoForm.bankName || undefined, accountNumber: infoForm.accountNumber || undefined,
        accountHolder: infoForm.accountHolder || undefined, paymentNote: infoForm.paymentNote || undefined,
      },
    });
  };

  const handleEventsSubmit = () => {
    if (!tournamentId) return;
    const validEvents = events.filter(e => e.skillLevel);
    if (validEvents.length === 0) {
      toast.error("최소 1개 이상의 종목을 설정해주세요");
      return;
    }
    setEventsMutation.mutate({ tournamentId, events: validEvents });
    if (infoForm.hasAgeGroup && ageGroups.length > 0 && ageGroups.some(ag => ag.code)) {
      setAgeGroupsMutation.mutate({ tournamentId, ageGroups: ageGroups.filter(ag => ag.code) });
    }
  };

  const handleStatusChange = (newStatus: "draft" | "open" | "closed" | "cancelled") => {
    if (!tournamentId) return;
    updateTournamentMutation.mutate({
      id: tournamentId,
      data: { status: newStatus },
    });
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !tournamentId) return;
    setUploadingPoster(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) { toast.error(`${file.name}은 이미지 파일이 아닙니다`); continue; }
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}은 10MB를 초과합니다`); continue; }
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
        const ct = file.type || "image/jpeg";
        await uploadPosterMutation.mutateAsync({
          tournamentId,
          base64Data: base64,
          contentType: ct,
          sortOrder: (tournament?.posters?.length ?? 0) + i,
        });
      }
    } catch (err) {
      toast.error("포스터 업로드 중 오류가 발생했습니다");
    } finally {
      setUploadingPoster(false);
      if (posterInputRef.current) posterInputRef.current.value = "";
    }
  };

  const handleSizeGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tournamentId) return;
    if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 업로드 가능합니다"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("10MB 이하 파일만 업로드 가능합니다"); return; }
    setUploadingSizeGuide(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      await uploadSizeGuideMutation.mutateAsync({ tournamentId, base64Data: base64, contentType: file.type });
    } catch (err) {
      toast.error("사이즈표 업로드 실패");
    } finally {
      setUploadingSizeGuide(false);
      if (sizeGuideInputRef.current) sizeGuideInputRef.current.value = "";
    }
  };

  const handleDeleteSizeGuide = () => {
    if (!tournamentId) return;
    deleteSizeGuideMutation.mutate({ tournamentId });
  };

  // Excel export
  const handleExcelExport = async () => {
    if (!regData || regData.length === 0) { toast.error("내보낼 데이터가 없습니다"); return; }
    try {
      const XLSX = await import("xlsx");
      const rows: any[][] = [
        ["접수번호", "접수상태", "입금상태", "종목", "급수", "선수1이름", "선수1소속", "선수1생년월일", "선수1전화번호", "선수1사이즈", "선수2이름", "선수2소속", "선수2생년월일", "선수2전화번호", "선수2사이즈", "접수일시"],
      ];
      for (const reg of regData) {
        const p1 = reg.players?.[0];
        const p2 = reg.players?.[1];
        rows.push([
          reg.registrationNumber,
          reg.status === "pending" ? "대기" : reg.status === "confirmed" ? "확정" : "취소",
          reg.paymentStatus === "unpaid" ? "미입금" : reg.paymentStatus === "paid" ? "입금완료" : "환불",
          (reg as any).eventType ?? "", (reg as any).skillLevel ?? "",
          p1?.name ?? "", p1?.affiliation ?? "", p1?.birthDate ?? "", p1?.phone ?? "", p1?.giftSize ?? "",
          p2?.name ?? "", p2?.affiliation ?? "", p2?.birthDate ?? "", p2?.phone ?? "", p2?.giftSize ?? "",
          reg.createdAt ? new Date(reg.createdAt).toLocaleString("ko-KR") : "",
        ]);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 8 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 6 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "접수명단");
      XLSX.writeFile(wb, `${tournament?.name ?? "대회"}_접수명단.xlsx`);
      toast.success("엑셀 파일이 다운로드되었습니다");
    } catch { toast.error("엑셀 내보내기 실패"); }
  };

  // ─── Guard States ───
  if (authLoading || tournamentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-red-300 mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">로그인 필요</h2>
        <p className="text-xs text-muted-foreground mb-4">대회 관리를 위해 로그인해주세요</p>
        <button onClick={() => navigate(`/login?returnTo=/tournament/${tournamentId}/manage`)} className="bg-primary text-foreground text-sm font-bold px-6 py-2.5 rounded-xl">
          로그인
        </button>
      </div>
    );
  }
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-red-300 mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">접근 권한 없음</h2>
        <p className="text-xs text-muted-foreground mb-4">대회 관리자 권한이 필요합니다</p>
        <button onClick={() => navigate("/")} className="bg-line-strong text-secondary-foreground text-sm font-bold px-6 py-2.5 rounded-xl">
          홈으로 돌아가기
        </button>
      </div>
    );
  }
  if (tournament && !isOwner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-yellow-300 mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">접근 불가</h2>
        <p className="text-xs text-muted-foreground mb-4">본인이 생성한 대회만 관리할 수 있습니다</p>
        <button onClick={() => navigate("/")} className="bg-line-strong text-secondary-foreground text-sm font-bold px-6 py-2.5 rounded-xl">
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // Filter registrations
  const filteredRegs = regData?.filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.registrationNumber?.toLowerCase().includes(q) ||
      r.players?.some((p: any) =>
        p.name.toLowerCase().includes(q) || p.phone.includes(q) || (p.affiliation && p.affiliation.toLowerCase().includes(q))
      )
    );
  }) ?? [];

  const tabs: { key: ManageTab; label: string; icon: any }[] = [
    { key: "registrations", label: "접수", icon: Users },
    { key: "info", label: "정보", icon: FileText },
    { key: "events", label: "종목", icon: Trophy },
    { key: "media", label: "미디어", icon: ImageIcon },
    { key: "status", label: "상태", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-ink text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="w-8 h-8 rounded-full bg-card/10 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">{tournament?.name ?? "대회"} - 관리</h1>
          <p className="text-[10px] text-white/50">{user?.name ?? user?.email}</p>
        </div>
        <Badge className="bg-primary text-foreground text-[10px] font-bold">
          {user?.role === "admin" || user?.role === "super_admin" ? "관리자" : "운영자"}
        </Badge>
      </div>

      {/* Tab Bar */}
      <div className="bg-card border-b border-line-strong px-2 flex gap-0.5 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-secondary-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {/* ─── Registrations Tab ─── */}
        {activeTab === "registrations" && (
          <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 소속, 전화번호, 접수번호 검색..."
                  className="w-full pl-10 pr-3 py-2.5 bg-card rounded-xl text-xs text-foreground placeholder:text-muted-foreground border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button onClick={handleExcelExport} className="flex items-center gap-1.5 bg-primary text-white text-[10px] font-bold px-3 py-2.5 rounded-xl hover:bg-optic-deep transition-colors whitespace-nowrap">
                <Download className="w-3.5 h-3.5" /> 엑셀
              </button>
            </div>

            {regData && regData.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-card rounded-lg p-2.5 text-center border border-line-strong">
                  <p className="text-lg font-black text-foreground">{regData.length}</p>
                  <p className="text-[9px] text-muted-foreground">전체</p>
                </div>
                <div className="bg-card rounded-lg p-2.5 text-center border border-line-strong">
                  <p className="text-lg font-black text-primary">{regData.filter((r: any) => r.paymentStatus === "paid").length}</p>
                  <p className="text-[9px] text-muted-foreground">입금완료</p>
                </div>
                <div className="bg-card rounded-lg p-2.5 text-center border border-line-strong">
                  <p className="text-lg font-black text-primary">{regData.filter((r: any) => r.paymentStatus === "unpaid").length}</p>
                  <p className="text-[9px] text-muted-foreground">미입금</p>
                </div>
                <div className="bg-card rounded-lg p-2.5 text-center border border-line-strong">
                  <p className="text-lg font-black text-destructive">{regData.filter((r: any) => r.paymentStatus === "refunded").length}</p>
                  <p className="text-[9px] text-muted-foreground">환불</p>
                </div>
              </div>
            )}

            {!regData ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : filteredRegs.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{searchQuery ? "검색 결과가 없습니다" : "접수 내역이 없습니다"}</p>
              </div>
            ) : (
              filteredRegs.map((reg: any) => {
                const ps = paymentStatusConfig[reg.paymentStatus] || paymentStatusConfig.unpaid;
                const rs = regStatusConfig[reg.status] || regStatusConfig.pending;
                return (
                  <div key={reg.id} className="bg-card rounded-xl p-4 border border-line-strong">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{reg.registrationNumber}</span>
                        <Badge className={`${rs.color} text-[8px] font-bold border`}>{rs.label}</Badge>
                        <Badge className={`${ps.color} text-[8px] font-bold border`}>{ps.label}</Badge>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString("ko-KR") : ""}
                      </span>
                    </div>
                    {((reg as any).eventType || (reg as any).skillLevel) && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[8px] font-bold">{(reg as any).eventType}</Badge>
                        <Badge variant="outline" className="text-[8px]">{(reg as any).skillLevel}</Badge>
                      </div>
                    )}
                    <div className="space-y-1 mb-3">
                      {reg.players?.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 text-[10px] text-secondary-foreground bg-ink-3 rounded-lg px-2.5 py-1.5">
                          <span className="font-bold text-foreground min-w-[50px]">{p.name}</span>
                          {p.affiliation && <span className="text-muted-foreground">({p.affiliation})</span>}
                          <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.phone}</span>
                          <span>{p.birthDate}</span>
                          {p.giftSize && <Badge variant="outline" className="text-[8px]">{p.giftSize}</Badge>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                      <span className="text-[9px] text-muted-foreground font-semibold">입금:</span>
                      <div className="flex gap-1">
                        {(["unpaid", "paid", "refunded"] as const).map(status => {
                          const cfg = paymentStatusConfig[status];
                          const isActive = reg.paymentStatus === status;
                          return (
                            <button key={status}
                              onClick={() => !isActive && updatePaymentMutation.mutate({ registrationId: reg.id, paymentStatus: status })}
                              disabled={isActive || updatePaymentMutation.isPending}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${isActive ? `${cfg.color} ring-1 ring-current` : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"} disabled:opacity-60`}
                            >
                              {status === "paid" && <DollarSign className="w-2.5 h-2.5 inline mr-0.5" />}
                              {status === "refunded" && <RefreshCw className="w-2.5 h-2.5 inline mr-0.5" />}
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[9px] text-muted-foreground mx-1">|</span>
                      <span className="text-[9px] text-muted-foreground font-semibold">접수:</span>
                      <div className="flex gap-1">
                        {(["pending", "confirmed", "cancelled"] as const).map(status => {
                          const cfg = regStatusConfig[status];
                          const isActive = reg.status === status;
                          return (
                            <button key={status}
                              onClick={() => !isActive && updateStatusMutation.mutate({ registrationId: reg.id, status })}
                              disabled={isActive || updateStatusMutation.isPending}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${isActive ? `${cfg.color} ring-1 ring-current` : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"} disabled:opacity-60`}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {reg.paymentStatus === "paid" && (
                      <div className="mt-2 flex items-center gap-1 text-[9px] text-primary bg-primary/10 rounded-md px-2 py-1">
                        <MessageSquare className="w-3 h-3" /> 입금 확인 SMS가 발송되었습니다
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* ─── Info Tab ─── */}
        {activeTab === "info" && (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">기본 정보</h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">대회명 *</label>
                <input value={infoForm.name} onChange={e => setInfoForm(p => ({...p, name: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="대회명" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">설명</label>
                <textarea value={infoForm.description} onChange={e => setInfoForm(p => ({...p, description: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]" placeholder="대회 설명" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">시작일 *</label>
                  <input type="date" value={infoForm.startDate} onChange={e => setInfoForm(p => ({...p, startDate: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">종료일 *</label>
                  <input type="date" value={infoForm.endDate} onChange={e => setInfoForm(p => ({...p, endDate: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">장소 *</label>
                <input value={infoForm.venue} onChange={e => setInfoForm(p => ({...p, venue: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="장소" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">주소 *</label>
                <input value={infoForm.address} onChange={e => setInfoForm(p => ({...p, address: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="주소" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">주최/후원 정보</h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">주최·주관 (쉼표 구분)</label>
                <input value={infoForm.organizerHosts} onChange={e => setInfoForm(p => ({...p, organizerHosts: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 리닝코리아, 포항 피클볼 조직위원회" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">후원·협찬 (쉼표 구분)</label>
                <input value={infoForm.organizerSponsors} onChange={e => setInfoForm(p => ({...p, organizerSponsors: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 포항시 체육회" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">참가비 & 기념품</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">참가비 (원)</label>
                  <input type="number" value={infoForm.feePerTeam} onChange={e => setInfoForm(p => ({...p, feePerTeam: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">기념품 설명</label>
                  <input value={infoForm.giftDescription} onChange={e => setInfoForm(p => ({...p, giftDescription: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 리닝 반팔 티셔츠" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">사이즈 옵션 (쉼표 구분)</label>
                <input value={infoForm.sizeOptions} onChange={e => setInfoForm(p => ({...p, sizeOptions: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: XS, S, M, L, XL, 2XL, 3XL" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">입금 정보</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">은행명</label>
                  <input value={infoForm.bankName} onChange={e => setInfoForm(p => ({...p, bankName: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 카카오뱅크" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">예금주</label>
                  <input value={infoForm.accountHolder} onChange={e => setInfoForm(p => ({...p, accountHolder: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 홍길동" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">계좌번호</label>
                <input value={infoForm.accountNumber} onChange={e => setInfoForm(p => ({...p, accountNumber: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 3333-12-1234567" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">입금 안내 메모</label>
                <input value={infoForm.paymentNote} onChange={e => setInfoForm(p => ({...p, paymentNote: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 입금자명에 팀명을 기재해주세요" />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">옵션</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={infoForm.hasAgeGroup} onChange={e => setInfoForm(p => ({...p, hasAgeGroup: e.target.checked}))} className="rounded border-line-strong" />
                  연령대 구분
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={infoForm.hasSingles} onChange={e => setInfoForm(p => ({...p, hasSingles: e.target.checked}))} className="rounded border-line-strong" />
                  단식 종목 포함
                </label>
              </div>
            </div>

            <button onClick={handleInfoSubmit} disabled={updateTournamentMutation.isPending}
              className="w-full bg-primary text-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
              {updateTournamentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {updateTournamentMutation.isPending ? "저장 중..." : "대회 정보 저장"}
            </button>

            {/* ─── 관리자 관리 섹션 ─── */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> 대회 관리자
                </h3>
                {isAdminRole && (
                  <button onClick={() => setShowOrganizerModal(true)}
                    className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                )}
              </div>
              {!organizerList || organizerList.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">등록된 관리자가 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {organizerList.map((org: any) => (
                    <div key={org.userId} className="flex items-center justify-between bg-ink-3 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{org.userName || org.userEmail || `ID: ${org.userId}`}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {org.role === "owner" ? "대회 생성자" : "운영자"}
                          </p>
                        </div>
                      </div>
                      {isAdminRole && org.role !== "owner" && (
                        <button
                          onClick={() => {
                            if (confirm(`${org.userName || org.userEmail} 관리자를 제거하시겠습니까?`)) {
                              removeOrganizerMutation.mutate({ tournamentId: tournamentId!, userId: org.userId });
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isAdminRole && (
                <p className="text-[9px] text-muted-foreground text-center">관리자 추가/제거는 시스템 관리자만 가능합니다</p>
              )}
            </div>

            {/* 관리자 추가 모달 */}
            <Dialog open={showOrganizerModal} onOpenChange={setShowOrganizerModal}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">대회 관리자 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={orgSearchQuery}
                      onChange={e => setOrgSearchQuery(e.target.value)}
                      placeholder="이름 또는 이메일로 검색..."
                      className="w-full pl-9 pr-3 py-2.5 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  {orgSearchQuery.length < 2 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">2글자 이상 입력하세요</p>
                  ) : !searchedUsers || searchedUsers.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">검색 결과가 없습니다</p>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {searchedUsers.map((u: any) => {
                        const alreadyAdded = organizerList?.some((o: any) => o.userId === u.id);
                        return (
                          <button
                            key={u.id}
                            disabled={alreadyAdded || addOrganizerMutation.isPending}
                            onClick={() => addOrganizerMutation.mutate({ tournamentId: tournamentId!, userId: u.id })}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                              alreadyAdded ? "opacity-50 cursor-not-allowed bg-ink-3" : "hover:bg-ink-3"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-semibold">{u.name || "이름 없음"}</p>
                              <p className="text-[9px] text-muted-foreground">{u.email}</p>
                            </div>
                            {alreadyAdded ? (
                              <Badge className="text-[8px] bg-muted text-muted-foreground">이미 등록</Badge>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}

        {/* ─── Events Tab ─── */}
        {activeTab === "events" && (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground">종목 설정</h3>
                <button onClick={() => setEvents(prev => [...prev, emptyEvent()])}
                  className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              {events.map((ev, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-end">
                  <div className="col-span-3">
                    <label className="text-[9px] text-muted-foreground block mb-0.5">종목</label>
                    <select value={ev.eventType} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], eventType: e.target.value as EventFormData["eventType"]}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong">
                      <option value="남복">남복</option>
                      <option value="여복">여복</option>
                      <option value="혼복">혼복</option>
                      {infoForm.hasSingles && <option value="남단">남단</option>}
                      {infoForm.hasSingles && <option value="여단">여단</option>}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[9px] text-muted-foreground block mb-0.5">급수</label>
                    <input value={ev.skillLevel} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], skillLevel: e.target.value}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" placeholder="A조" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] text-muted-foreground block mb-0.5">최대팀</label>
                    <input type="number" value={ev.maxTeams} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], maxTeams: Number(e.target.value)}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[9px] text-muted-foreground block mb-0.5">일자</label>
                    <input value={ev.dayLabel} onChange={e => {
                      const next = [...events]; next[i] = {...next[i], dayLabel: e.target.value}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" placeholder="Day1" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {events.length > 1 && (
                      <button onClick={() => setEvents(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {infoForm.hasAgeGroup && (
              <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">연령대 설정</h3>
                  <button onClick={() => setAgeGroups(prev => [...prev, emptyAgeGroup()])}
                    className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                </div>
                {ageGroups.map((ag, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-end">
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">코드</label>
                      <input value={ag.code} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], code: e.target.value}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" placeholder="A" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">라벨</label>
                      <input value={ag.label} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], label: e.target.value}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" placeholder="20~30대" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">최소</label>
                      <input type="number" value={ag.minAge} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], minAge: Number(e.target.value)}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">최대</label>
                      <input type="number" value={ag.maxAge} onChange={e => {
                        const next = [...ageGroups]; next[i] = {...next[i], maxAge: Number(e.target.value)}; setAgeGroups(next);
                      }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong" />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button onClick={() => setAgeGroups(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {ageGroups.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">연령대를 추가해주세요</p>
                )}
              </div>
            )}

            <button onClick={handleEventsSubmit} disabled={setEventsMutation.isPending}
              className="w-full bg-primary text-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
              {setEventsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {setEventsMutation.isPending ? "저장 중..." : "종목 설정 저장"}
            </button>
          </motion.div>
        )}

        {/* ─── Media Tab ─── */}
        {activeTab === "media" && (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            {/* Posters */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> 대회 포스터
                </h3>
                <button onClick={() => posterInputRef.current?.click()} disabled={uploadingPoster}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-[#6d8517] disabled:opacity-50">
                  {uploadingPoster ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploadingPoster ? "업로드 중..." : "포스터 추가"}
                </button>
                <input ref={posterInputRef} type="file" accept="image/*" multiple onChange={handlePosterUpload} className="hidden" />
              </div>
              <p className="text-[9px] text-muted-foreground">인스타그램 4:5 비율 권장 (1080x1350px). 최대 10MB.</p>
              {tournament?.posters && tournament.posters.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {tournament.posters.map((poster: any, i: number) => (
                    <div key={poster.id} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted border border-line-strong">
                      <img src={poster.imageUrl} alt={`포스터 ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-line-strong rounded-lg">
                  <ImageIcon className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-[10px] text-muted-foreground">아직 업로드된 포스터가 없습니다</p>
                  <button onClick={() => posterInputRef.current?.click()} className="mt-2 text-[10px] font-bold text-primary underline">
                    포스터 업로드하기
                  </button>
                </div>
              )}
            </div>

            {/* Size Guide */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground">사이즈표 이미지</h3>
              {tournament?.sizeGuideImageUrl ? (
                <div className="relative">
                  <img src={tournament.sizeGuideImageUrl} alt="사이즈표" className="w-full rounded-lg border border-line-strong" />
                  <button type="button" onClick={handleDeleteSizeGuide}
                    className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/80 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div onClick={() => sizeGuideInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-line-strong rounded-xl cursor-pointer hover:border-primary transition-colors bg-ink-3">
                  {uploadingSizeGuide ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">사이즈표 이미지 업로드</span>
                    </>
                  )}
                </div>
              )}
              <input ref={sizeGuideInputRef} type="file" accept="image/*" className="hidden" onChange={handleSizeGuideUpload} />
            </div>
          </motion.div>
        )}

        {/* ─── Status Tab ─── */}
        {activeTab === "status" && (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-4">
              <h3 className="text-xs font-bold text-foreground mb-2">대회 상태 변경</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-muted-foreground">현재 상태:</span>
                <Badge className={`${statusConfig[tournament?.status ?? "draft"]?.color ?? ""} text-[10px] font-bold border`}>
                  {statusConfig[tournament?.status ?? "draft"]?.label ?? "알 수 없음"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(statusConfig) as [string, { label: string; color: string }][]).map(([key, cfg]) => {
                  const isActive = tournament?.status === key;
                  return (
                    <button
                      key={key}
                      onClick={() => !isActive && handleStatusChange(key as any)}
                      disabled={isActive || updateTournamentMutation.isPending}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                        isActive
                          ? `${cfg.color} border-current ring-2 ring-current/20`
                          : "bg-ink-3 border-line-strong text-muted-foreground hover:border-primary hover:text-foreground"
                      } disabled:opacity-60`}
                    >
                      <span className="text-sm font-bold">{cfg.label}</span>
                      {isActive && <span className="text-[9px]">현재 상태</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-yellow-700 space-y-1">
                    <p className="font-bold">상태 변경 안내</p>
                    <p><strong>준비 중</strong>: 대회가 아직 공개되지 않은 상태입니다.</p>
                    <p><strong>접수 중</strong>: 참가자가 접수할 수 있는 상태입니다.</p>
                    <p><strong>접수 마감</strong>: 더 이상 접수를 받지 않습니다.</p>
                    <p><strong>취소</strong>: 대회가 취소되었습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
