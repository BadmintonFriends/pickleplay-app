import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Trophy, Users, Settings, ChevronLeft, ChevronRight,
  Plus, Edit3, Trash2, Eye, CheckCircle2, XCircle,
  Loader2, AlertCircle, Home,
  Shield, UserCheck, Save, X,
  Upload, Image as ImageIcon,
  Ban, PlayCircle, PauseCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";

type AdminTab = "tournaments" | "users";
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

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "준비 중", color: "bg-muted text-muted-foreground", icon: Settings },
  open: { label: "접수 중", color: "bg-primary/20 text-primary", icon: PlayCircle },
  closed: { label: "접수 마감", color: "bg-primary/20 text-primary", icon: PauseCircle },
  cancelled: { label: "취소", color: "bg-destructive/20 text-destructive", icon: Ban },
};



export default function AdminPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("tournaments");

  const posterInputRef = useRef<HTMLInputElement>(null);
  const sizeGuideInputRef = useRef<HTMLInputElement>(null);
  const [sizeGuidePreview, setSizeGuidePreview] = useState<string | null>(null);
  const [uploadingSizeGuide, setUploadingSizeGuide] = useState(false);

  // Tournament form state
  const [formMode, setFormMode] = useState<TournamentFormMode>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TournamentFormData>(emptyForm());
  const [events, setEvents] = useState<EventFormData[]>([emptyEvent()]);
  const [ageGroups, setAgeGroups] = useState<AgeGroupFormData[]>([]);
  const [posterPreviews, setPosterPreviews] = useState<string[]>([]);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "organizer";

  // Queries
  const utils = trpc.useUtils();
  const { data: tournamentList } = trpc.tournament.list.useQuery(undefined, { enabled: isAdmin });
  const { data: allUsers } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin && activeTab === "users" });
  // Mutations

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("역할 변경 완료"); },
    onError: (err: any) => toast.error(err.message),
  });

  const createTournamentMutation = trpc.admin.createTournament.useMutation({
    onSuccess: async (data) => {
      toast.success("대회가 생성되었습니다!");
      if (events.length > 0 && events.some(e => e.skillLevel)) {
        await setEventsMutation.mutateAsync({ tournamentId: data.id, events: events.filter(e => e.skillLevel) });
      }
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

  const uploadPosterMutation = trpc.admin.uploadPoster.useMutation({
    onSuccess: () => { toast.success("포스터가 업로드되었습니다!"); },
    onError: (err: any) => toast.error("포스터 업로드 실패: " + err.message),
  });

  const setEventsMutation = trpc.admin.setEvents.useMutation();
  const setAgeGroupsMutation = trpc.admin.setAgeGroups.useMutation();

  const uploadSizeGuideMutation = trpc.admin.uploadSizeGuide.useMutation({
    onSuccess: () => { toast.success("사이즈표가 업로드되었습니다!"); },
    onError: (err: any) => toast.error("사이즈표 업로드 실패: " + err.message),
  });
  const deleteSizeGuideMutation = trpc.admin.deleteSizeGuide.useMutation({
    onSuccess: () => { toast.success("사이즈표가 삭제되었습니다!"); },
    onError: (err: any) => toast.error("사이즈표 삭제 실패: " + err.message),
  });

  const resetForm = () => {
    setFormMode("list");
    setEditingId(null);
    setForm(emptyForm());
    setEvents([emptyEvent()]);
    setAgeGroups([]);
    setPosterPreviews([]);
    setSizeGuidePreview(null);
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
    setSizeGuidePreview(t.sizeGuideImageUrl ?? null);
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
      if (detail.posters && detail.posters.length > 0) {
        setPosterPreviews(detail.posters.map((p: any) => p.imageUrl));
      }
    } catch {
      setEvents([emptyEvent()]);
    }
    setEditingId(t.id);
    setFormMode("edit");
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!editingId && formMode !== "edit") {
      toast.error("대회를 먼저 생성한 후 포스터를 업로드해주세요");
      return;
    }
    const tournamentId = editingId;
    if (!tournamentId) return;

    setUploadingPoster(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}은 이미지 파일이 아닙니다`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}은 10MB를 초과합니다`);
          continue;
        }
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        // Extract base64 data and content type from data URL
        const [header, b64] = base64.split(",");
        const ct = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
        const result = await uploadPosterMutation.mutateAsync({
          tournamentId,
          base64Data: b64,
          contentType: ct,
          sortOrder: posterPreviews.length + i,
        });
        setPosterPreviews(prev => [...prev, (result as any).imageUrl]);
      }
      utils.tournament.detail.invalidate({ id: tournamentId });
    } catch (err) {
      console.error("Poster upload error:", err);
    } finally {
      setUploadingPoster(false);
      if (posterInputRef.current) posterInputRef.current.value = "";
    }
  };

  const handleSizeGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!editingId) {
      toast.error("대회를 먼저 생성한 후 사이즈표를 업로드해주세요");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("10MB 이하 파일만 업로드 가능합니다");
      return;
    }
    setUploadingSizeGuide(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const [header, b64] = base64.split(",");
      const ct = header.match(/data:(.*?);/)?.[1] || "image/png";
      const result = await uploadSizeGuideMutation.mutateAsync({
        tournamentId: editingId,
        base64Data: b64,
        contentType: ct,
      });
      setSizeGuidePreview(result.url);
      utils.tournament.list.invalidate();
    } catch (err) {
      console.error("Size guide upload error:", err);
    } finally {
      setUploadingSizeGuide(false);
      if (sizeGuideInputRef.current) sizeGuideInputRef.current.value = "";
    }
  };

  const handleDeleteSizeGuide = async () => {
    if (!editingId) return;
    try {
      await deleteSizeGuideMutation.mutateAsync({ tournamentId: editingId });
      setSizeGuidePreview(null);
      utils.tournament.list.invalidate();
    } catch (err) {
      console.error("Size guide delete error:", err);
    }
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



  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">관리자 로그인 필요</h2>
        <p className="text-xs text-muted-foreground mb-4">관리자 권한이 필요합니다</p>
        <button onClick={() => navigate("/login?returnTo=/admin")} className="bg-primary text-foreground text-sm font-bold px-6 py-2.5 rounded-xl">
          로그인
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-red-300 mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">접근 권한 없음</h2>
        <p className="text-xs text-muted-foreground mb-4">관리자 또는 대회 운영자 권한이 필요합니다</p>
        <button onClick={() => navigate("/")} className="bg-line-strong text-secondary-foreground text-sm font-bold px-6 py-2.5 rounded-xl">
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // organizer는 본인 대회만 필터링
  const filteredTournamentList = useMemo(() => {
    if (!tournamentList) return [];
    if (user?.role === "admin" || user?.role === "super_admin") return tournamentList;
    // organizer는 본인이 생성한 대회만
    return tournamentList.filter((t: any) => t.organizerId === user?.id);
  }, [tournamentList, user]);

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: "tournaments", label: "대회 관리", icon: Trophy },
    ...(user?.role === "admin" || user?.role === "super_admin" ? [{ key: "users" as AdminTab, label: "사용자", icon: UserCheck }] : []),
  ];

  const isSaving = createTournamentMutation.isPending || updateTournamentMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <div className="bg-ink text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-card/10 flex items-center justify-center">
            <Home className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold">PicklePlay 관리자</h1>
            <p className="text-[10px] text-white/50">{user?.name ?? user?.email}</p>
          </div>
        </div>
        <Badge className="bg-primary text-foreground text-[10px] font-bold">{user?.role}</Badge>
      </div>

      {/* Tab Bar */}
      <div className="bg-card border-b border-line-strong px-4 flex gap-1 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); if (t.key === "tournaments") resetForm(); }}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-secondary-foreground"
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
              <h2 className="text-sm font-bold text-foreground">대회 목록</h2>
              <button
                onClick={startCreate}
                className="flex items-center gap-1 bg-primary text-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-optic-deep transition-colors"
              >
                <Plus className="w-3 h-3" /> 대회 추가
              </button>
            </div>
            {!filteredTournamentList || filteredTournamentList.length === 0 ? (
              <div className="text-center py-10">
                <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{user?.role === "organizer" ? "본인이 생성한 대회가 없습니다" : "등록된 대회가 없습니다"}</p>
              </div>
            ) : (
              filteredTournamentList.map((t: any) => {
                const sc = statusConfig[t.status] || statusConfig.draft;
                const StatusIcon = sc.icon;
                return (
                  <div key={t.id} className="bg-card rounded-xl p-4  border border-line-strong">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-foreground flex-1 truncate">{t.name}</h3>
                      <Badge className={`${sc.color} text-[9px] font-bold border-0 flex items-center gap-0.5`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {sc.label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">{t.startDate} ~ {t.endDate} · {t.venue}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/tournament/${t.id}`)}
                        className="text-[10px] font-bold text-primary flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> 상세보기
                      </button>
                      <button
                        onClick={() => navigate(`/tournament/${t.id}/manage`)}
                        className="text-[10px] font-bold text-purple-500 flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" /> 대회 관리
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* ─── Tournament Create/Edit Form ─── */}
        {activeTab === "tournaments" && (formMode === "create" || formMode === "edit") && (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {formMode === "create" ? "대회 생성" : "대회 수정"}
              </h2>
              <button onClick={resetForm} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-secondary-foreground">
                <X className="w-3.5 h-3.5" /> 취소
              </button>
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">기본 정보</h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">대회명 *</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 리닝코리아 포항 전국 피클볼 대회" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">설명</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]" placeholder="대회 설명" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">시작일 *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">종료일 *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">장소 *</label>
                <input value={form.venue} onChange={e => setForm(p => ({...p, venue: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 만인당실내체육관" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">주소 *</label>
                <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 경북 포항시 남구 희망대로 814" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">상태</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as any}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="draft">준비 중</option>
                  <option value="open">접수 중</option>
                  <option value="closed">접수 마감</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
            </div>

            {/* Poster Upload (only in edit mode) */}
            {formMode === "edit" && editingId && (
              <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> 대회 포스터
                  </h3>
                  <button
                    onClick={() => posterInputRef.current?.click()}
                    disabled={uploadingPoster}
                    className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-[#6d8517] disabled:opacity-50"
                  >
                    {uploadingPoster ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {uploadingPoster ? "업로드 중..." : "포스터 추가"}
                  </button>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePosterUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground">인스타그램 4:5 비율 권장 (1080x1350px). 최대 10MB.</p>
                {posterPreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {posterPreviews.map((url, i) => (
                      <div key={i} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted border border-line-strong">
                        <img src={url} alt={`포스터 ${i + 1}`} className="w-full h-full object-cover" />
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
                    <button
                      onClick={() => posterInputRef.current?.click()}
                      className="mt-2 text-[10px] font-bold text-primary underline"
                    >
                      포스터 업로드하기
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Organizer Info */}
            <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">주최/후원 정보</h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">주최·주관 (쉼표 구분)</label>
                <input value={form.organizerHosts} onChange={e => setForm(p => ({...p, organizerHosts: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 리닝코리아, 포항 피클볼 조직위원회" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">후원·협찬 (쉼표 구분)</label>
                <input value={form.organizerSponsors} onChange={e => setForm(p => ({...p, organizerSponsors: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 포항시 체육회, 대한피클볼 협회" />
              </div>
            </div>

            {/* Fee & Gift */}
            <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">참가비 & 기념품</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">참가비 (원)</label>
                  <input type="number" value={form.feePerTeam} onChange={e => setForm(p => ({...p, feePerTeam: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">기념품 설명</label>
                  <input value={form.giftDescription} onChange={e => setForm(p => ({...p, giftDescription: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 리닝 반팔 티셔츠" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">사이즈 옵션 (쉼표 구분)</label>
                <input value={form.sizeOptions} onChange={e => setForm(p => ({...p, sizeOptions: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder='예: XS, S, M, L, XL, 2XL, 3XL' />
              </div>
              {/* Size Guide Image Upload */}
              {form.sizeOptions && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">사이즈표 이미지 (선택사항)</label>
                  {sizeGuidePreview ? (
                    <div className="relative">
                      <img src={sizeGuidePreview} alt="사이즈표" className="w-full rounded-lg border border-line-strong" />
                      <button
                        type="button"
                        onClick={handleDeleteSizeGuide}
                        className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/80 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => sizeGuideInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-line-strong rounded-xl cursor-pointer hover:border-primary transition-colors bg-ink-3"
                    >
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
                  <input
                    ref={sizeGuideInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSizeGuideUpload}
                  />
                </div>
              )}
            </div>

            {/* Bank Info */}
            <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">입금 정보</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">은행명</label>
                  <input value={form.bankName} onChange={e => setForm(p => ({...p, bankName: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 카카오뱅크" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">예금주</label>
                  <input value={form.accountHolder} onChange={e => setForm(p => ({...p, accountHolder: e.target.value}))}
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 홍길동" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">계좌번호</label>
                <input value={form.accountNumber} onChange={e => setForm(p => ({...p, accountNumber: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 3333-12-1234567" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">입금 안내 메모</label>
                <input value={form.paymentNote} onChange={e => setForm(p => ({...p, paymentNote: e.target.value}))}
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="예: 입금자명에 팀명을 기재해주세요" />
              </div>
            </div>

            {/* Options */}
            <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">옵션</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.hasAgeGroup} onChange={e => setForm(p => ({...p, hasAgeGroup: e.target.checked}))}
                    className="rounded border-line-strong" />
                  연령대 구분
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.hasSingles} onChange={e => setForm(p => ({...p, hasSingles: e.target.checked}))}
                    className="rounded border-line-strong" />
                  단식 종목 포함
                </label>
              </div>
            </div>

            {/* Events */}
            <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
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
                      const next = [...events]; next[i] = {...next[i], eventType: e.target.value as any}; setEvents(next);
                    }} className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong">
                      <option value="남복">남복</option>
                      <option value="여복">여복</option>
                      <option value="혼복">혼복</option>
                      {form.hasSingles && <option value="남단">남단</option>}
                      {form.hasSingles && <option value="여단">여단</option>}
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

            {/* Age Groups (if enabled) */}
            {form.hasAgeGroup && (
              <div className="bg-card rounded-xl p-4  border border-line-strong space-y-3">
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

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="w-full bg-primary text-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "저장 중..." : formMode === "create" ? "대회 생성" : "대회 수정"}
            </button>
          </motion.div>
        )}


        {/* ─── Users Tab ─── */}
        {activeTab === "users" && (
          <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <h2 className="text-sm font-bold text-foreground mb-2">사용자 관리</h2>
            {!allUsers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">사용자가 없습니다</p>
            ) : (
              allUsers.map((u: any) => (
                <div key={u.id} className="bg-card rounded-xl p-3  border border-line-strong flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">{u.name?.[0] ?? "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{u.name ?? "이름 없음"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.phone ?? u.email ?? u.openId}</p>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: u.id, role: e.target.value as any })}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-line-strong bg-card"
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
