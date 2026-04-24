import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AppHeader from "@/components/AppHeader";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Upload, Edit3, AlertCircle, CheckCircle2,
  User, Phone, Calendar, Gift, Loader2, Info, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

type TabType = "direct" | "excel";

interface PlayerForm {
  name: string;
  birthDate: string;
  phone: string;
  giftSize: string;
}

const emptyPlayer = (): PlayerForm => ({ name: "", birthDate: "", phone: "", giftSize: "" });

export default function RegistrationPage() {
  const [, params] = useRoute("/tournament/:id/register");
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const tournamentId = Number(params?.id);

  const [tab, setTab] = useState<TabType>("direct");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<number | null>(null);
  const [isSelfParticipant, setIsSelfParticipant] = useState(true);
  const [players, setPlayers] = useState<PlayerForm[]>([emptyPlayer()]);
  const [submitting, setSubmitting] = useState(false);

  // Excel state
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelErrors, setExcelErrors] = useState<any[]>([]);
  const [excelParsed, setExcelParsed] = useState(false);

  const { data: tournament, isLoading } = trpc.tournament.detail.useQuery(
    { id: tournamentId },
    { enabled: !!tournamentId }
  );

  const registerMutation = trpc.registration.create.useMutation({
    onSuccess: (data) => {
      toast.success("참가 신청이 완료되었습니다!", { description: `접수번호: ${data.registrationNumber}` });
      navigate(`/tournament/${tournamentId}/register/complete`);
    },
    onError: (err) => {
      toast.error("접수 실패", { description: err.message });
      setSubmitting(false);
    },
  });

  const bulkRegisterMutation = trpc.registration.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count}건 일괄 접수 완료!`);
      navigate(`/tournament/${tournamentId}/register/complete`);
    },
    onError: (err) => {
      toast.error("일괄 접수 실패", { description: err.message });
      setSubmitting(false);
    },
  });

  const selectedEvent = useMemo(
    () => tournament?.events.find((e: any) => e.id === selectedEventId),
    [tournament, selectedEventId]
  );

  const isDoubles = useMemo(
    () => selectedEvent ? ["남복", "여복", "혼복"].includes(selectedEvent.eventType) : true,
    [selectedEvent]
  );

  const sizeOptions: string[] = useMemo(
    () => tournament?.sizeOptions ? JSON.parse(tournament.sizeOptions) : [],
    [tournament?.sizeOptions]
  );

  // Handle player count based on event type
  const handleEventChange = useCallback((eventId: number) => {
    setSelectedEventId(eventId);
    const event = tournament?.events.find((e: any) => e.id === eventId);
    if (event) {
      const doubles = ["남복", "여복", "혼복"].includes(event.eventType);
      setPlayers(doubles ? [emptyPlayer(), emptyPlayer()] : [emptyPlayer()]);
    }
  }, [tournament]);

  const updatePlayer = useCallback((index: number, field: keyof PlayerForm, value: string) => {
    setPlayers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  // Phone formatting
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // Birth date formatting
  const formatBirth = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  // Validation
  const validateDirect = (): string | null => {
    if (!selectedEventId) return "종목을 선택해주세요";
    if (tournament?.hasAgeGroup && !selectedAgeGroupId) return "연령대를 선택해주세요";
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const label = players.length > 1 ? `선수${i + 1}` : "선수";
      if (!p.name.trim()) return `${label} 이름을 입력해주세요`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) return `${label} 생년월일을 입력해주세요 (YYYY-MM-DD)`;
      if (p.phone.replace(/\D/g, "").length < 10) return `${label} 전화번호를 입력해주세요`;
      if (sizeOptions.length > 0 && !p.giftSize) return `${label} 기념품 사이즈를 선택해주세요`;
    }
    return null;
  };

  const handleDirectSubmit = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/tournament/${tournamentId}/register`);
      return;
    }
    const err = validateDirect();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    registerMutation.mutate({
      tournamentId,
      tournamentEventId: selectedEventId!,
      ageGroupId: selectedAgeGroupId ?? undefined,
      isSelfParticipant,
      players: players.map(p => ({
        name: p.name.trim(),
        birthDate: p.birthDate,
        phone: p.phone.replace(/\D/g, ""),
        giftSize: p.giftSize || undefined,
      })),
    });
  };

  // Excel upload handler
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) {
        toast.error("데이터가 없습니다. 헤더 행 아래에 데이터를 입력해주세요.");
        return;
      }

      // Parse rows (skip header)
      const parsed: any[] = [];
      const errors: any[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0 || !row[0]) continue;

        const eventType = String(row[0] || "").trim();
        const skillLevel = String(row[1] || "").trim();
        const p1Name = String(row[2] || "").trim();
        const p1Birth = String(row[3] || "").trim();
        const p1Phone = String(row[4] || "").trim();
        const p1Size = String(row[5] || "").trim();
        const p2Name = String(row[6] || "").trim();
        const p2Birth = String(row[7] || "").trim();
        const p2Phone = String(row[8] || "").trim();
        const p2Size = String(row[9] || "").trim();

        const rowData = { eventType, skillLevel, p1Name, p1Birth, p1Phone, p1Size, p2Name, p2Birth, p2Phone, p2Size, rowNum: i + 1 };
        parsed.push(rowData);

        // Validate
        const validEvents = ["남복", "여복", "혼복", "남단", "여단"];
        if (!validEvents.includes(eventType)) {
          errors.push({ row: i + 1, field: "종목", message: `유효하지 않은 종목: ${eventType}`, severity: "error" });
        }
        if (!p1Name) errors.push({ row: i + 1, field: "선수1 이름", message: "이름 필수", severity: "error" });
        if (!p1Phone) errors.push({ row: i + 1, field: "선수1 전화번호", message: "전화번호 필수", severity: "error" });

        const isDoubles = ["남복", "여복", "혼복"].includes(eventType);
        if (isDoubles && !p2Name) {
          errors.push({ row: i + 1, field: "선수2 이름", message: "복식 종목은 선수2 필수", severity: "error" });
        }

        // Size validation
        if (sizeOptions.length > 0) {
          if (p1Size && !sizeOptions.includes(p1Size)) {
            errors.push({ row: i + 1, field: "선수1 사이즈", message: `유효하지 않은 사이즈: ${p1Size}`, severity: "error" });
          }
          if (isDoubles && p2Size && !sizeOptions.includes(p2Size)) {
            errors.push({ row: i + 1, field: "선수2 사이즈", message: `유효하지 않은 사이즈: ${p2Size}`, severity: "error" });
          }
        }
      }

      setExcelRows(parsed);
      setExcelErrors(errors);
      setExcelParsed(true);

      if (errors.filter(e => e.severity === "error").length === 0) {
        toast.success(`${parsed.length}건 파싱 완료! 데이터를 확인 후 접수해주세요.`);
      } else {
        toast.error(`${errors.filter(e => e.severity === "error").length}건의 오류가 있습니다. 수정 후 다시 업로드해주세요.`);
      }
    } catch (err) {
      toast.error("엑셀 파일 읽기 실패. 올바른 .xlsx 파일인지 확인해주세요.");
    }
    e.target.value = "";
  };

  const handleExcelSubmit = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/tournament/${tournamentId}/register`);
      return;
    }
    const blockingErrors = excelErrors.filter(e => e.severity === "error");
    if (blockingErrors.length > 0) {
      toast.error("오류를 먼저 수정해주세요");
      return;
    }
    if (excelRows.length === 0) {
      toast.error("접수할 데이터가 없습니다");
      return;
    }
    setSubmitting(true);

    // Map excel rows to registration inputs
    const items = excelRows.map(row => {
      const event = tournament?.events.find(
        (e: any) => e.eventType === row.eventType && e.skillLevel === row.skillLevel
      );
      const isDoubles = ["남복", "여복", "혼복"].includes(row.eventType);
      const playerList = [
        { name: row.p1Name, birthDate: row.p1Birth, phone: row.p1Phone.replace(/\D/g, ""), giftSize: row.p1Size || undefined },
      ];
      if (isDoubles && row.p2Name) {
        playerList.push({ name: row.p2Name, birthDate: row.p2Birth, phone: row.p2Phone.replace(/\D/g, ""), giftSize: row.p2Size || undefined });
      }
      return {
        tournamentId,
        tournamentEventId: event?.id ?? 0,
        isSelfParticipant: false,
        players: playerList,
      };
    });

    bulkRegisterMutation.mutate({ tournamentId, registrations: items });
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm font-bold text-muted-foreground">대회를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  if (tournament.status !== "open") {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <AlertCircle className="w-12 h-12 text-amber-300 mb-3" />
          <p className="text-sm font-bold text-muted-foreground">현재 접수 기간이 아닙니다</p>
          <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="mt-4 text-xs text-primary font-semibold">
            대회 정보로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 비로그인 사용자 안내 화면
  if (!isAuthenticated) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground mb-1">참가 신청을 위해 로그인해주세요.</p>
          <p className="text-xs text-muted-foreground mb-6">아직 회원이 아니신가요? 간편하게 회원가입하세요!</p>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate(`/login?returnTo=/tournament/${tournamentId}/register`)}
              className="flex-1 bg-ink text-white text-sm font-bold py-3 rounded-xl hover:bg-ink-3 transition-colors"
            >
              로그인
            </button>
            <button
              onClick={() => navigate(`/register?returnTo=/tournament/${tournamentId}/register`)}
              className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-3 rounded-xl hover:bg-optic-deep transition-colors"
            >
              회원가입
            </button>
          </div>
          <button
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="mt-4 text-xs text-muted-foreground hover:text-secondary-foreground"
          >
            대회 정보로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background pb-8">
      <AppHeader />

      {/* Header */}
      <motion.div className="px-4 pt-1 pb-3 flex items-center gap-2" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="w-8 h-8 rounded-full bg-card border border-line-strong flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">참가 신청</h1>
      </motion.div>

      {/* Tournament name */}
      <motion.div className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={0.5}>
        <p className="text-xs text-muted-foreground font-medium">{tournament.name}</p>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="bg-card rounded-xl p-1 flex gap-1  border border-line-strong">
          <button
            onClick={() => setTab("direct")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === "direct" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-secondary-foreground"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            직접 입력
          </button>
          <button
            onClick={() => setTab("excel")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === "excel" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-secondary-foreground"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            엑셀 업로드
          </button>
        </div>
      </motion.div>

      {/* ─── Direct Input Tab ─── */}
      {tab === "direct" && (
        <motion.div className="px-4 space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          {/* Event Selection */}
          <div className="bg-card rounded-2xl p-4  border border-line-strong">
            <h3 className="text-sm font-bold text-foreground mb-3">종목 선택</h3>
            <div className="grid grid-cols-2 gap-2">
              {tournament.events.map((event: any) => {
                const isFull = event.currentTeams >= event.maxTeams;
                const isSelected = selectedEventId === event.id;
                return (
                  <button
                    key={event.id}
                    disabled={isFull}
                    onClick={() => handleEventChange(event.id)}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : isFull
                        ? "border-line-strong bg-ink-3 opacity-50 cursor-not-allowed"
                        : "border-line-strong bg-ink-3 hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[9px] font-bold border-primary text-primary">
                        {event.eventType}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-foreground">{event.skillLevel}</p>
                    <p className={`text-[10px] mt-0.5 ${isFull ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {isFull ? "마감" : `${event.currentTeams}/${event.maxTeams}팀`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Group Selection (if applicable) */}
          {tournament.hasAgeGroup && tournament.ageGroups && tournament.ageGroups.length > 0 && (
            <div className="bg-card rounded-2xl p-4  border border-line-strong">
              <h3 className="text-sm font-bold text-foreground mb-3">연령대 선택</h3>
              <div className="grid grid-cols-2 gap-2">
                {tournament.ageGroups.map((ag: any) => (
                  <button
                    key={ag.id}
                    onClick={() => setSelectedAgeGroupId(ag.id)}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      selectedAgeGroupId === ag.id
                        ? "border-primary bg-primary/10"
                        : "border-line-strong bg-ink-3 hover:border-line-strong"
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground">{ag.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Self Participant Toggle */}
          <div className="bg-card rounded-2xl p-4  border border-line-strong">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">본인 참가 여부</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">대리 신청 시 '아니오' 선택</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsSelfParticipant(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelfParticipant ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  예
                </button>
                <button
                  onClick={() => setIsSelfParticipant(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isSelfParticipant ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  아니오
                </button>
              </div>
            </div>
          </div>

          {/* Player Forms */}
          {players.map((player, idx) => (
            <div key={idx} className="bg-card rounded-2xl p-4  border border-line-strong">
              <h3 className="text-sm font-bold text-foreground mb-3">
                {players.length > 1 ? `선수 ${idx + 1}` : "선수 정보"}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">이름</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                      placeholder="홍길동"
                      className="w-full pl-10 pr-3 py-2.5 bg-ink-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 border border-line-strong"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">생년월일</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={player.birthDate}
                      onChange={(e) => updatePlayer(idx, "birthDate", formatBirth(e.target.value))}
                      placeholder="1990-01-01"
                      maxLength={10}
                      className="w-full pl-10 pr-3 py-2.5 bg-ink-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 border border-line-strong"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">전화번호</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={player.phone}
                      onChange={(e) => updatePlayer(idx, "phone", formatPhone(e.target.value))}
                      placeholder="010-1234-5678"
                      maxLength={13}
                      className="w-full pl-10 pr-3 py-2.5 bg-ink-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 border border-line-strong"
                    />
                  </div>
                </div>
                {sizeOptions.length > 0 && (
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">참가기념품 사이즈</label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={player.giftSize}
                        onChange={(e) => updatePlayer(idx, "giftSize", e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-ink-3 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 border border-line-strong appearance-none"
                      >
                        <option value="">사이즈 선택</option>
                        {sizeOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Payment Info */}
          {tournament.feePerTeam > 0 && tournament.bankName && (
            <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">참가비 안내</p>
                  <p className="text-[11px] text-secondary-foreground mt-1">
                    팀당 {tournament.feePerTeam.toLocaleString()}원
                  </p>
                  <p className="text-[11px] text-secondary-foreground mt-0.5">
                    {tournament.bankName} {tournament.accountNumber} ({tournament.accountHolder})
                  </p>
                  {tournament.paymentNote && (
                    <p className="text-[10px] text-muted-foreground mt-1">{tournament.paymentNote}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleDirectSubmit}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {submitting ? "접수 중..." : "참가 신청하기"}
          </button>
        </motion.div>
      )}

      {/* ─── Excel Upload Tab ─── */}
      {tab === "excel" && (
        <motion.div className="px-4 space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          {/* Template Download */}
          <div className="bg-card rounded-2xl p-4  border border-line-strong">
            <h3 className="text-sm font-bold text-foreground mb-2">엑셀 양식 다운로드</h3>
            <p className="text-[10px] text-muted-foreground mb-2">
              아래 양식을 다운로드하여 작성 후 업로드해주세요.
            </p>
            <button
              onClick={async () => {
                try {
                  const XLSX = await import("xlsx");
                  const header = ["종목", "급수", "선수1이름", "선수1생년월일", "선수1전화번호", "선수1사이즈", "선수2이름", "선수2생년월일", "선수2전화번호", "선수2사이즈"];
                  const example = ["남복", "A조", "홍길동", "1990-01-01", "010-1234-5678", "L", "김철수", "1992-05-15", "010-9876-5432", "XL"];
                  const ws = XLSX.utils.aoa_to_sheet([header, example]);
                  ws["!cols"] = header.map(() => ({ wch: 16 }));
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "참가신청");
                  XLSX.writeFile(wb, "참가신청_양식.xlsx");
                  toast.success("양식이 다운로드되었습니다");
                } catch {
                  toast.error("양식 다운로드에 실패했습니다");
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-ink text-white text-xs font-bold py-2.5 rounded-xl hover:bg-ink-3 transition-colors active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              양식 다운로드 (.xlsx)
            </button>
          </div>

          {/* Upload Area */}
          <div className="bg-card rounded-2xl p-4  border border-line-strong">
            <h3 className="text-sm font-bold text-foreground mb-2">엑셀 파일 업로드</h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              양식: 종목 | 급수 | 선수1이름 | 선수1생년월일 | 선수1전화번호 | 선수1사이즈 | 선수2이름 | 선수2생년월일 | 선수2전화번호 | 선수2사이즈
            </p>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-line-strong rounded-xl cursor-pointer hover:border-primary transition-colors bg-ink-3">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground font-medium">.xlsx 파일을 선택하세요</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            </label>
          </div>

          {/* Parsed Data Preview */}
          {excelParsed && (
            <>
              {/* Errors */}
              {excelErrors.length > 0 && (
                <div className="bg-destructive/10 rounded-2xl p-4 border border-destructive/20">
                  <h4 className="text-xs font-bold text-destructive mb-2">
                    검증 오류 ({excelErrors.filter(e => e.severity === "error").length}건)
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {excelErrors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className={`w-3 h-3 shrink-0 mt-0.5 ${err.severity === "error" ? "text-destructive" : "text-primary"}`} />
                        <p className="text-[10px] text-destructive">
                          행 {err.row}: [{err.field}] {err.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="bg-card rounded-2xl p-4  border border-line-strong overflow-x-auto">
                <h4 className="text-xs font-bold text-foreground mb-2">파싱 결과 ({excelRows.length}건)</h4>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-line-strong">
                      <th className="text-left py-1.5 px-1 text-muted-foreground font-semibold">#</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground font-semibold">종목</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground font-semibold">급수</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground font-semibold">선수1</th>
                      <th className="text-left py-1.5 px-1 text-muted-foreground font-semibold">선수2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="py-1.5 px-1 text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 px-1 font-medium text-foreground">{row.eventType}</td>
                        <td className="py-1.5 px-1 text-secondary-foreground">{row.skillLevel}</td>
                        <td className="py-1.5 px-1 text-secondary-foreground">{row.p1Name}</td>
                        <td className="py-1.5 px-1 text-secondary-foreground">{row.p2Name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit */}
              <button
                onClick={handleExcelSubmit}
                disabled={submitting || excelErrors.filter(e => e.severity === "error").length > 0}
                className="w-full bg-primary text-primary-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {submitting ? "접수 중..." : `${excelRows.length}건 일괄 접수하기`}
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
