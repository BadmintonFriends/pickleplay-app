import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findPotentialBracketConflicts } from "@/lib/bracketConflictPotential";
import { trpc } from "@/lib/trpc";
import { motion, Reorder } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  DollarSign,
  Download,
  FileText,
  GitBranch,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
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
  bracket_published: {
    label: "대진표 공개",
    color: "bg-blue-100 text-blue-700",
  },
  in_progress: { label: "대회 진행중", color: "bg-purple-100 text-purple-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

type ActualBracketSettingsSummary = {
  eventId: number;
  label: string;
  matchDate: string | null;
  courtCount: number | null;
  courtNumbers: number[];
  qualifyingScore: number | null;
  mainScore: number | null;
  mainFinalsScore: number | null;
  finalsFromRound: number | null;
  deuceEnabled: boolean | null;
  deuceMaxScore: number | null;
  advanceCount: number | null;
  teamCount: number | null;
  mainAdvanceTeamCount: number | null;
  hasUnsavedDifference: boolean;
};

function formatAdminCourtLabel(summary: ActualBracketSettingsSummary) {
  if (summary.courtCount == null) return "코트 미배정";
  if (summary.courtNumbers.length === 0) return `${summary.courtCount}코트`;
  return `${summary.courtCount}코트 (${summary.courtNumbers.join(", ")}번)`;
}

function finalsFromRoundLabel(finalsFromRound: number | null): string {
  if (finalsFromRound === null) return "전체 본선";
  if (finalsFromRound === 0) return "결승";
  return `${Math.pow(2, finalsFromRound + 1)}강 이상`;
}

function formatAdminScoreLabel(summary: ActualBracketSettingsSummary) {
  const qualifying =
    summary.qualifyingScore != null
      ? `예선 ${summary.qualifyingScore}점`
      : null;
  const main = summary.mainScore != null ? `본선 ${summary.mainScore}점` : null;
  const finals =
    summary.mainFinalsScore != null
      ? `${finalsFromRoundLabel(summary.finalsFromRound)} ${summary.mainFinalsScore}점`
      : null;
  return [qualifying, main, finals].filter(Boolean).join(" · ") || "점수 미설정";
}

function formatAdminDeuceLabel(summary: ActualBracketSettingsSummary) {
  if (summary.deuceEnabled == null) return "듀스 미설정";
  if (!summary.deuceEnabled) return "듀스 없음";
  return summary.deuceMaxScore != null
    ? `듀스 최대 ${summary.deuceMaxScore}점`
    : "듀스 있음";
}

function formatAdminAdvanceRankLabel(summary: ActualBracketSettingsSummary) {
  return summary.advanceCount != null && summary.advanceCount > 0
    ? `본선 진출 ${summary.advanceCount}위까지`
    : null;
}

function formatAdminEventLabel(label: string, teamCount?: number | null) {
  return teamCount != null && teamCount > 0
    ? `${label} [${teamCount}팀]`
    : label;
}

type ManageTab =
  | "registrations"
  | "info"
  | "events"
  | "media"
  | "status"
  | "bracket"
  | "onsite";

interface EventFormData {
  id?: number; // 기존 이벤트 ID (업데이트 시 사용)
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

const emptyEvent = (): EventFormData => ({
  eventType: "남복" as const,
  skillLevel: "",
  maxTeams: 40,
  dayLabel: "",
});
const emptyAgeGroup = (): AgeGroupFormData => ({
  code: "",
  label: "",
  minAge: 20,
  maxAge: 99,
});

export default function TournamentManagePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/tournament/:id/manage");
  const tournamentId = params?.id ? Number(params.id) : null;

  const [activeTab, setActiveTab] = useState<ManageTab>("registrations");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingReg, setEditingReg] = useState<any>(null);
  const [editEventId, setEditEventId] = useState<string>("");
  const [editAgeGroupId, setEditAgeGroupId] = useState<string>("");
  const [editSizes, setEditSizes] = useState<Record<number, string>>({});
  const [editPlayers, setEditPlayers] = useState<
    Record<
      number,
      { name: string; birthDate: string; phone: string; affiliation: string }
    >
  >({});
  const [visibleCount, setVisibleCount] = useState(15);
  const observerRef = useRef<HTMLDivElement>(null);

  const isAllowed =
    user?.role === "admin" || user?.role === "super_admin" || !!user;

  // 대회 정보 조회
  const {
    data: tournament,
    isLoading: tournamentLoading,
    refetch: refetchTournament,
  } = trpc.tournament.detail.useQuery(
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
  const { data: regData, refetch: refetchRegs } =
    trpc.admin.tournamentRegistrations.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId && isOwner && activeTab === "registrations" }
    );

  // ─── Mutations ───
  const utils = trpc.useUtils();
  const updatePaymentMutation = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success("입금 상태 변경 완료 (SMS 알림 전송됨)");
      refetchRegs();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const updateStatusMutation = trpc.admin.updateRegistrationStatus.useMutation({
    onSuccess: () => {
      toast.success("접수 상태 변경 완료");
      refetchRegs();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const updateTournamentMutation = trpc.admin.updateTournament.useMutation({
    onSuccess: () => {
      toast.success("대회 정보가 수정되었습니다!");
      refetchTournament();
      utils.tournament.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const setEventsMutation = trpc.admin.setEvents.useMutation({
    onSuccess: () => {
      toast.success("종목 설정이 저장되었습니다!");
      refetchTournament();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const setAgeGroupsMutation = trpc.admin.setAgeGroups.useMutation({
    onSuccess: () => {
      toast.success("연령대 설정이 저장되었습니다!");
      refetchTournament();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const uploadPosterMutation = trpc.admin.uploadPoster.useMutation({
    onSuccess: () => {
      toast.success("포스터가 업로드되었습니다!");
      refetchTournament();
    },
    onError: (err: any) => toast.error("포스터 업로드 실패: " + err.message),
  });
  const uploadSizeGuideMutation = trpc.admin.uploadSizeGuide.useMutation({
    onSuccess: () => {
      toast.success("사이즈표가 업로드되었습니다!");
      refetchTournament();
    },
    onError: (err: any) => toast.error("사이즈표 업로드 실패: " + err.message),
  });
  const deleteSizeGuideMutation = trpc.admin.deleteSizeGuide.useMutation({
    onSuccess: () => {
      toast.success("사이즈표가 삭제되었습니다!");
      refetchTournament();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const updateRegEventMutation = trpc.admin.updateRegistrationEvent.useMutation(
    {
      onSuccess: () => {
        toast.success("종목/급수가 변경되었습니다");
        refetchRegs();
        setEditingReg(null);
      },
      onError: (err: any) => toast.error(err.message),
    }
  );
  const updatePlayerSizeMutation = trpc.admin.updatePlayerGiftSize.useMutation({
    onSuccess: () => {
      toast.success("사이즈가 변경되었습니다");
      refetchRegs();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const updatePlayerInfoMutation = trpc.admin.updatePlayerInfo.useMutation({
    onSuccess: () => {
      toast.success("선수 정보가 변경되었습니다");
      refetchRegs();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Organizer Management ───
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showInProgressAlert, setShowInProgressAlert] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [orgSearching, setOrgSearching] = useState(false);

  const { data: organizerList, refetch: refetchOrganizers } =
    trpc.admin.getTournamentOrganizers.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId && isOwner && activeTab === "info" }
    );
  const addOrganizerMutation = trpc.admin.addTournamentOrganizer.useMutation({
    onSuccess: () => {
      toast.success("관리자가 추가되었습니다!");
      refetchOrganizers();
      setShowOrganizerModal(false);
      setOrgSearchQuery("");
    },
    onError: (err: any) => toast.error(err.message),
  });
  const removeOrganizerMutation =
    trpc.admin.removeTournamentOrganizer.useMutation({
      onSuccess: () => {
        toast.success("관리자가 제거되었습니다.");
        refetchOrganizers();
      },
      onError: (err: any) => toast.error(err.message),
    });
  const { data: searchedUsers } = trpc.admin.searchUsersForOrganizer.useQuery(
    { query: orgSearchQuery },
    { enabled: orgSearchQuery.length >= 2 && showOrganizerModal }
  );

  const isAdminRole = user?.role === "admin" || user?.role === "super_admin";

  // ─── Bracket Tab State ───
  const [bracketEventId, setBracketEventId] = useState<number | null>(null);
  const [matchResultForm, setMatchResultForm] = useState<{
    matchId: string;
    score1: string;
    score2: string;
  }>({ matchId: "", score1: "", score2: "" });
  const [settingsForm, setSettingsForm] = useState<
    {
      tournamentEventId: number;
      eventOrder: number;
      qualifyingScore: number;
      mainScore: number;
      mainFinalsScore: number | null;
      finalsFromRound: number | null;
      deuceEnabled: boolean;
      deuceMaxScore: number;
      advanceCount: number;
      hasThirdPlace: boolean;
      matchDate: string;
    }[]
  >([]);
  const [bulkForm, setBulkForm] = useState({
    qualifyingScore: "21",
    mainScore: "21",
    mainFinalsScore: "",
    finalsFromRound: "",
    deuceEnabled: false,
    deuceMaxScore: "25",
    advanceCount: 1,
    hasThirdPlace: false,
    matchDate: "",
  });
  const [selectedEventIndices, setSelectedEventIndices] = useState<Set<number>>(
    new Set()
  );
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [selectedDateTab, setSelectedDateTab] = useState<string>("");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [expandedSettingsId, setExpandedSettingsId] = useState<number | null>(
    null
  );
  const [actualBracketSettingsOpen, setActualBracketSettingsOpen] =
    useState(true);
  const [
    selectedActualBracketSettingsOpen,
    setSelectedActualBracketSettingsOpen,
  ] = useState(true);

  const tournamentDates = useMemo(() => {
    if (!tournament?.startDate || !tournament?.endDate) return [];
    const dates: string[] = [];
    const cur = new Date(tournament.startDate);
    const end = new Date(tournament.endDate);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [tournament?.startDate, tournament?.endDate]);

  const filteredSettingsIndices = useMemo(() => {
    if (tournamentDates.length <= 1) return settingsForm.map((_, i) => i);
    return settingsForm
      .map((_, i) => i)
      .filter(i => settingsForm[i].matchDate === selectedDateTab);
  }, [settingsForm, selectedDateTab, tournamentDates.length]);

  // ─── Bracket Queries & Mutations ───
  const { data: bracketSettings, refetch: refetchBracketSettings } =
    trpc.bracket.getSettings.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId && activeTab === "bracket" }
    );
  const { data: allBracketGroups, refetch: refetchAllBracketGroups } =
    trpc.bracket.getGroups.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId && activeTab === "bracket" }
    );
  const { data: bracketGroups, refetch: refetchGroups } =
    trpc.bracket.getGroups.useQuery(
      { tournamentId: tournamentId!, tournamentEventId: bracketEventId ?? 0 },
      { enabled: !!tournamentId && !!bracketEventId && activeTab === "bracket" }
    );
  const { data: bracketSchedule, refetch: refetchSchedule } =
    trpc.bracket.getSchedule.useQuery(
      { tournamentId: tournamentId! },
      {
        enabled:
          !!tournamentId && (activeTab === "bracket" || activeTab === "status"),
      }
    );
  const hasGeneratedBracket =
    Array.isArray(bracketSchedule) && bracketSchedule.length > 0;
  const { data: mainBracket, refetch: refetchMainBracket } =
    trpc.bracket.getMainBracket.useQuery(
      { tournamentId: tournamentId!, tournamentEventId: bracketEventId ?? 0 },
      { enabled: !!tournamentId && !!bracketEventId && activeTab === "bracket" }
    );
  const generateMutation = trpc.bracket.generate.useMutation({
    onSuccess: () => {
      toast.success("대진이 생성되었습니다!");
      refetchBracketSettings();
      refetchAllBracketGroups();
      refetchGroups();
      refetchSchedule();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const regenerateMutation = trpc.bracket.regenerate.useMutation({
    onSuccess: () => {
      toast.success("대진이 재생성되었습니다!");
      refetchAllBracketGroups();
      refetchGroups();
      refetchSchedule();
      refetchMainBracket();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMatchResultMutation = trpc.bracket.updateMatchResult.useMutation({
    onSuccess: () => {
      toast.success("경기 결과가 저장되었습니다!");
      setMatchResultForm({ matchId: "", score1: "", score2: "" });
      refetchGroups();
      refetchMainBracket();
      refetchSchedule();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const saveSettingsMutation = trpc.bracket.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("설정이 저장되었습니다!");
      refetchBracketSettings();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const { data: courtSettingsData, refetch: refetchCourtSettings } =
    trpc.bracket.getCourtSettings.useQuery(
      { tournamentId: tournamentId! },
      { enabled: !!tournamentId && activeTab === "bracket" }
    );
  const saveCourtSettingsMutation = trpc.bracket.saveCourtSettings.useMutation({
    onSuccess: () => {
      toast.success("코트 설정이 저장되었습니다!");
      refetchCourtSettings();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const rescheduleCourtMutation = trpc.bracket.rescheduleWithCourtCount.useMutation({
    onSuccess: (data) => {
      toast.success(`재배정 완료: ${data.updatedCount}경기`);
      refetchCourtSettings();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const [courtForm, setCourtForm] = useState<
    {
      matchDate: string;
      courtCount: string;
      startTime: string;
      estimatedMinutes: string;
    }[]
  >([]);
  const [targetEndTime, setTargetEndTime] = useState<string>("18:00");
  const [schedGroupId, setSchedGroupId] = useState<number | null>(null);
  const [bracketSubTab, setBracketSubTab] = useState<
    "settings" | "view" | "conflicts"
  >("settings");
  const [viewDateTab, setViewDateTab] = useState<string>("");
  const [refereePinInput, setRefereePinInput] = useState<string>("");

  // 현장 탭
  const [onsiteDate, setOnsiteDate] = useState<string>("");
  const [onsiteEventId, setOnsiteEventId] = useState<number | null>(null);
  const [onsiteView, setOnsiteView] = useState<number | "main" | null>(null);
  const [onsiteSubTab, setOnsiteSubTab] = useState<"manage" | "assign">(
    "manage"
  );
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editScore1, setEditScore1] = useState<string>("");
  const [editScore2, setEditScore2] = useState<string>("");
  const [editTeam1Name, setEditTeam1Name] = useState<string>("");
  const [editTeam2Name, setEditTeam2Name] = useState<string>("");
  const [onsiteAssignDate, setOnsiteAssignDate] = useState<string>("");
  const [selectedAssignCourt, setSelectedAssignCourt] = useState<number | null>(
    null
  );
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [moveMode, setMoveMode] = useState<"court" | "swap" | null>(null);
  const [targetCourt, setTargetCourt] = useState<string>("");
  const [targetPos, setTargetPos] = useState<string>("");
  const [swapTargetId, setSwapTargetId] = useState<number | null>(null);
  // 팀 조 이동
  const [moveTeamState, setMoveTeamState] = useState<{
    regId: number;
    fromGroupId: number;
  } | null>(null);
  // 예선 경기 순서 변경 (로컬 순서 상태)
  const [localMatchOrder, setLocalMatchOrder] = useState<number[]>([]);
  // 조 구성 변경 여부 (경기 재생성 필요 표시)
  const [hasGroupChanges, setHasGroupChanges] = useState(false);

  const {
    data: publicBracket,
    isLoading: publicBracketLoading,
    refetch: refetchPublicBracket,
  } = trpc.bracket.getPublicBracket.useQuery(
    { tournamentId: tournamentId! },
    {
      enabled:
        !!tournamentId &&
        (activeTab === "onsite" ||
          (activeTab === "bracket" &&
            bracketSubTab === "conflicts" &&
            hasGeneratedBracket)),
    }
  );

  const potentialBracketConflicts = useMemo(
    () =>
      publicBracket ? findPotentialBracketConflicts(publicBracket as any) : [],
    [publicBracket]
  );

  const adminUpdateResult = trpc.bracket.adminUpdateMatchResult.useMutation({
    onSuccess: () => {
      toast.success("경기 결과가 수정되었습니다");
      setEditingMatchId(null);
      setEditScore1("");
      setEditScore2("");
      setEditTeam1Name("");
      setEditTeam2Name("");
      refetchPublicBracket();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const moveMatchMutation = trpc.bracket.moveMatchToCourt.useMutation({
    onSuccess: () => {
      toast.success("경기 위치가 변경되었습니다");
      setSelectedMatchId(null);
      setMoveMode(null);
      refetchPublicBracket();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const swapMatchMutation = trpc.bracket.swapMatchOrder.useMutation({
    onSuccess: () => {
      toast.success("경기 순번이 교체되었습니다");
      setSelectedMatchId(null);
      setMoveMode(null);
      refetchPublicBracket();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const { data: groupMatchesData, refetch: refetchGroupMatches } =
    trpc.bracket.getGroupMatches.useQuery(
      { groupId: schedGroupId! },
      { enabled: !!schedGroupId }
    );
  const moveTeamMutation = trpc.bracket.moveTeam.useMutation({
    onSuccess: () => {
      toast.success(
        "팀 조가 변경되었습니다. '저장 및 경기 재생성' 버튼을 눌러 경기를 재생성하세요."
      );
      setMoveTeamState(null);
      setHasGroupChanges(true);
      refetchAllBracketGroups();
      refetchGroups();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const reorderMatchesMutation = trpc.bracket.reorderGroupMatches.useMutation({
    onSuccess: () => {
      toast.success("경기 순서가 저장되었습니다");
      refetchGroupMatches();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const regenerateMatchesMutation =
    trpc.bracket.regenerateMatchesFromGroups.useMutation({
      onSuccess: () => {
        toast.success("경기가 재생성되었습니다. 코트/시간이 재배정되었습니다.");
        setHasGroupChanges(false);
        refetchAllBracketGroups();
        refetchGroups();
        refetchGroupMatches();
        refetchSchedule();
      },
      onError: (err: any) => toast.error(err.message),
    });

  // settingsForm 초기화: bracketSettings 또는 tournament events 기반
  useEffect(() => {
    if (activeTab !== "bracket" || !tournament?.events) return;
    const events = tournament.events as any[];
    if (bracketSettings && bracketSettings.length > 0) {
      const bs = bracketSettings as any[];
      const sorted = [...events].sort((a: any, b: any) => {
        const aOrder =
          bs.find((s: any) => s.tournamentEventId === a.id)?.eventOrder ?? 999;
        const bOrder =
          bs.find((s: any) => s.tournamentEventId === b.id)?.eventOrder ?? 999;
        return aOrder - bOrder;
      });
      setSettingsForm(
        sorted.map((e: any, i: number) => {
          const existing = bs.find((s: any) => s.tournamentEventId === e.id);
          return {
            tournamentEventId: e.id,
            eventOrder: existing?.eventOrder ?? i,
            qualifyingScore: existing?.qualifyingScore ?? 21,
            mainScore: existing?.mainScore ?? 21,
            mainFinalsScore: existing?.mainFinalsScore ?? null,
            finalsFromRound: existing?.finalsFromRound ?? null,
            deuceEnabled: existing?.deuceEnabled ?? false,
            deuceMaxScore: existing?.deuceMaxScore ?? 17,
            advanceCount: existing?.advanceCount ?? 1,
            hasThirdPlace: existing?.hasThirdPlace ?? false,
            matchDate: existing?.matchDate ?? "",
          };
        })
      );
    } else {
      setSettingsForm(
        events.map((e: any, i: number) => ({
          tournamentEventId: e.id,
          eventOrder: i,
          qualifyingScore: 21,
          mainScore: 21,
          mainFinalsScore: null,
          finalsFromRound: null,
          deuceEnabled: false,
          deuceMaxScore: 17,
          advanceCount: 1,
          hasThirdPlace: false,
          matchDate: "",
        }))
      );
    }
  }, [bracketSettings, tournament?.events, activeTab]);

  useEffect(() => {
    if (activeTab !== "bracket" || tournamentDates.length === 0) return;
    const settings = (courtSettingsData as any[]) ?? [];
    setCourtForm(
      tournamentDates.map(d => {
        const existing = settings.find((cs: any) => cs.matchDate === d);
        return {
          matchDate: d,
          courtCount: String(existing?.courtCount ?? 4),
          startTime: existing?.startTime ?? "09:00",
          estimatedMinutes: String(existing?.estimatedMinutes ?? 30),
        };
      })
    );
    // 첫 번째 날짜의 targetEndTime으로 복원
    const first = settings[0];
    if (first?.targetEndTime) setTargetEndTime(first.targetEndTime);
  }, [courtSettingsData, tournamentDates, activeTab]);

  // ─── Info Tab State ───
  const [infoForm, setInfoForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    venue: "",
    address: "",
    feePerTeam: 0,
    giftDescription: "",
    sizeType: "alpha" as "numeric" | "alpha",
    sizeOptions: "",
    hasAgeGroup: false,
    hasSingles: false,
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    paymentNote: "",
    organizerHosts: "",
    organizerSponsors: "",
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
    const orgInfo = tournament.organizerInfo
      ? JSON.parse(tournament.organizerInfo as string)
      : { hosts: [], sponsors: [] };
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
      setEvents(
        tournament.events.map((e: any) => ({
          id: e.id,
          eventType: e.eventType,
          skillLevel: e.skillLevel,
          maxTeams: e.maxTeams,
          dayLabel: e.dayLabel ?? "",
        }))
      );
    } else {
      setEvents([emptyEvent()]);
    }
    if (tournament.ageGroups && tournament.ageGroups.length > 0) {
      setAgeGroups(
        tournament.ageGroups.map((ag: any) => ({
          code: ag.code,
          label: ag.label,
          minAge: ag.minAge,
          maxAge: ag.maxAge ?? 99,
        }))
      );
    }
  }, [tournament]);

  // ─── Infinite Scroll ───
  useEffect(() => {
    setVisibleCount(15);
  }, [eventFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 15);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  });

  // refereePin 초기화
  useEffect(() => {
    if (tournament?.refereePin) setRefereePinInput(tournament.refereePin);
  }, [tournament?.refereePin]);

  // 그룹 경기 데이터 변경 시 로컬 순서 초기화
  useEffect(() => {
    if (groupMatchesData) {
      setLocalMatchOrder((groupMatchesData as any[]).map((m: any) => m.id));
    }
  }, [groupMatchesData]);

  // ─── Handlers ───
  const handleInfoSubmit = () => {
    if (!tournamentId) return;
    if (
      !infoForm.name ||
      !infoForm.startDate ||
      !infoForm.endDate ||
      !infoForm.venue ||
      !infoForm.address
    ) {
      toast.error("필수 항목을 모두 입력해주세요 (이름, 일시, 장소, 주소)");
      return;
    }
    const organizerInfo = JSON.stringify({
      hosts: infoForm.organizerHosts
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
      sponsors: infoForm.organizerSponsors
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
    });
    updateTournamentMutation.mutate({
      id: tournamentId,
      data: {
        name: infoForm.name,
        description: infoForm.description || undefined,
        startDate: infoForm.startDate,
        endDate: infoForm.endDate,
        venue: infoForm.venue,
        address: infoForm.address,
        organizerInfo,
        feePerTeam: infoForm.feePerTeam,
        giftDescription: infoForm.giftDescription || undefined,
        sizeType: infoForm.sizeType,
        sizeOptions: infoForm.sizeOptions || undefined,
        hasAgeGroup: infoForm.hasAgeGroup,
        hasSingles: infoForm.hasSingles,
        bankName: infoForm.bankName || undefined,
        accountNumber: infoForm.accountNumber || undefined,
        accountHolder: infoForm.accountHolder || undefined,
        paymentNote: infoForm.paymentNote || undefined,
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
    if (
      infoForm.hasAgeGroup &&
      ageGroups.length > 0 &&
      ageGroups.some(ag => ag.code)
    ) {
      setAgeGroupsMutation.mutate({
        tournamentId,
        ageGroups: ageGroups.filter(ag => ag.code),
      });
    }
  };

  const formatPhoneEdit = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };
  const formatBirthEdit = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const handleOpenEdit = (reg: any) => {
    setEditingReg(reg);
    setEditEventId(String(reg.tournamentEventId));
    setEditAgeGroupId(reg.ageGroupId ? String(reg.ageGroupId) : "");
    const sizes: Record<number, string> = {};
    const playerInfo: Record<
      number,
      { name: string; birthDate: string; phone: string; affiliation: string }
    > = {};
    reg.players?.forEach((p: any) => {
      if (p.giftSize) sizes[p.id] = p.giftSize;
      playerInfo[p.id] = {
        name: p.name || "",
        birthDate: p.birthDate || "",
        phone: formatPhoneEdit(p.phone || ""),
        affiliation: p.affiliation || "",
      };
    });
    setEditSizes(sizes);
    setEditPlayers(playerInfo);
  };

  const handleSaveEdit = () => {
    if (!editingReg) return;
    updateRegEventMutation.mutate({
      registrationId: editingReg.id,
      tournamentEventId: Number(editEventId),
      ageGroupId: editAgeGroupId ? Number(editAgeGroupId) : null,
    });
    // 사이즈 변경 + 선수 정보 변경도 함께 저장
    editingReg.players?.forEach((p: any) => {
      const newSize = editSizes[p.id];
      if (newSize !== undefined && newSize !== (p.giftSize || "")) {
        updatePlayerSizeMutation.mutate({ playerId: p.id, giftSize: newSize });
      }
      const info = editPlayers[p.id];
      if (info) {
        const phoneDigits = info.phone.replace(/\D/g, "");
        const changed =
          info.name !== (p.name || "") ||
          info.birthDate !== (p.birthDate || "") ||
          phoneDigits !== (p.phone || "").replace(/\D/g, "") ||
          info.affiliation !== (p.affiliation || "");
        if (changed) {
          updatePlayerInfoMutation.mutate({
            playerId: p.id,
            name: info.name.trim(),
            birthDate: info.birthDate,
            phone: phoneDigits,
            affiliation: info.affiliation.trim(),
          });
        }
      }
    });
  };

  // sizeOptions 파싱
  const sizeOptionsList = useMemo(() => {
    if (!tournament?.sizeOptions) return [];
    try {
      return JSON.parse(tournament.sizeOptions) as string[];
    } catch {
      return [];
    }
  }, [tournament?.sizeOptions]);

  const handleStatusChange = (
    newStatus: "draft" | "open" | "closed" | "cancelled"
  ) => {
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
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}은 이미지 파일이 아닙니다`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}은 10MB를 초과합니다`);
          continue;
        }
        const reader = new FileReader();
        const base64 = await new Promise<string>(resolve => {
          reader.onload = () =>
            resolve((reader.result as string).split(",")[1]);
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

  const handleSizeGuideUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !tournamentId) return;
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
      const base64 = await new Promise<string>(resolve => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      await uploadSizeGuideMutation.mutateAsync({
        tournamentId,
        base64Data: base64,
        contentType: file.type,
      });
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
    if (!regData || regData.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows: any[][] = [
        [
          "접수번호",
          "접수상태",
          "입금상태",
          "종목",
          "급수",
          "나이대",
          "선수1이름",
          "선수1소속",
          "선수1생년월일",
          "선수1전화번호",
          "선수1사이즈",
          "선수2이름",
          "선수2소속",
          "선수2생년월일",
          "선수2전화번호",
          "선수2사이즈",
          "접수일시",
        ],
      ];
      for (const reg of regData) {
        const p1 = reg.players?.[0];
        const p2 = reg.players?.[1];
        rows.push([
          reg.registrationNumber,
          reg.status === "pending"
            ? "대기"
            : reg.status === "confirmed"
              ? "확정"
              : "취소",
          reg.paymentStatus === "unpaid"
            ? "미입금"
            : reg.paymentStatus === "paid"
              ? "입금완료"
              : "환불",
          reg.eventType ?? "",
          reg.skillLevel ?? "",
          reg.ageGroupLabel ?? "",
          p1?.name ?? "",
          p1?.affiliation ?? "",
          p1?.birthDate ?? "",
          p1?.phone ?? "",
          p1?.giftSize ?? "",
          p2?.name ?? "",
          p2?.affiliation ?? "",
          p2?.birthDate ?? "",
          p2?.phone ?? "",
          p2?.giftSize ?? "",
          reg.createdAt ? new Date(reg.createdAt).toLocaleString("ko-KR") : "",
        ]);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 14 },
        { wch: 8 },
        { wch: 8 },
        { wch: 6 },
        { wch: 8 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
        { wch: 6 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
        { wch: 6 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "접수명단");
      XLSX.writeFile(wb, `${tournament?.name ?? "대회"}_접수명단.xlsx`);
      toast.success("엑셀 파일이 다운로드되었습니다");
    } catch {
      toast.error("엑셀 내보내기 실패");
    }
  };

  // 종목 필터 옵션 생성 (hooks는 조건부 리턴 전에 배치해야 함)
  const eventFilterOptions = useMemo(() => {
    if (!regData) return [];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const r of regData) {
      const key = `${r.eventType ?? ""}_${r.skillLevel ?? ""}`;
      if (!seen.has(key) && (r.eventType || r.skillLevel)) {
        seen.add(key);
        options.push({
          value: key,
          label: `${r.eventType ?? ""} ${r.skillLevel ?? ""}`.trim(),
        });
      }
    }
    return options;
  }, [regData]);

  // Filter registrations
  const filteredRegs = useMemo(() => {
    if (!regData) return [];
    return regData.filter((r: any) => {
      // 종목 필터
      if (eventFilter !== "all") {
        const key = `${r.eventType ?? ""}_${r.skillLevel ?? ""}`;
        if (key !== eventFilter) return false;
      }
      // 상태 필터
      if (statusFilter !== "all") {
        if (
          statusFilter === "unpaid" ||
          statusFilter === "paid" ||
          statusFilter === "refunded"
        ) {
          if (r.paymentStatus !== statusFilter) return false;
        } else {
          if (r.status !== statusFilter) return false;
        }
      }
      // 검색 필터
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.registrationNumber?.toLowerCase().includes(q) ||
        r.players?.some(
          (p: any) =>
            p.name.toLowerCase().includes(q) ||
            p.phone.includes(q) ||
            (p.affiliation && p.affiliation.toLowerCase().includes(q))
        )
      );
    });
  }, [regData, eventFilter, statusFilter, searchQuery]);

  const actualBracketSettingsSummaries = useMemo(() => {
    const savedSettings = ((bracketSettings as any[]) ?? []).sort(
      (a: any, b: any) => (a.eventOrder ?? 0) - (b.eventOrder ?? 0)
    );
    const generatedGroups = (allBracketGroups as any[]) ?? [];
    const savedCourtSettings = (courtSettingsData as any[]) ?? [];
    const scheduledMatches = (bracketSchedule as any[]) ?? [];
    const tournamentEvents = (tournament?.events as any[]) ?? [];

    return savedSettings.map((saved: any): ActualBracketSettingsSummary => {
      const event = tournamentEvents.find(
        (e: any) => e.id === saved.tournamentEventId
      );
      const current = settingsForm.find(
        s => s.tournamentEventId === saved.tournamentEventId
      );
      const matchDate = saved.matchDate ?? current?.matchDate ?? null;
      const courtNumbers = [
        ...new Set(
          scheduledMatches
            .filter(
              (m: any) =>
                m.tournamentEventId === saved.tournamentEventId &&
                m.courtNumber != null
            )
            .map((m: any) => Number(m.courtNumber))
        ),
      ].sort((a, b) => a - b);
      const savedCourtCount =
        savedCourtSettings.find((cs: any) => cs.matchDate === matchDate)
          ?.courtCount ?? null;
      const actualCourtCount =
        courtNumbers.length > 0 ? courtNumbers.length : savedCourtCount;
      const currentCourtCount =
        courtForm.find(cf => cf.matchDate === matchDate)?.courtCount ?? null;
      const eventGroups = generatedGroups.filter(
        (g: any) => g.tournamentEventId === saved.tournamentEventId
      );
      const teamCount = eventGroups.reduce(
        (sum: number, group: any) =>
          sum + ((group.teams as any[]) ?? []).length,
        0
      );
      const hasGeneratedTeams = eventGroups.length > 0 && teamCount > 0;

      const scoreDiff =
        !!current &&
        (current.qualifyingScore !== saved.qualifyingScore ||
          current.mainScore !== saved.mainScore ||
          current.mainFinalsScore !== (saved.mainFinalsScore ?? null) ||
          current.finalsFromRound !== (saved.finalsFromRound ?? null) ||
          current.deuceEnabled !== saved.deuceEnabled ||
          current.deuceMaxScore !== saved.deuceMaxScore);
      const courtDiff =
        currentCourtCount != null &&
        actualCourtCount != null &&
        Number(currentCourtCount) !== actualCourtCount;

      return {
        eventId: saved.tournamentEventId,
        label: event
          ? `${event.eventType} ${event.skillLevel}`
          : `종목 ${saved.tournamentEventId}`,
        matchDate,
        courtCount: actualCourtCount,
        courtNumbers,
        qualifyingScore: saved.qualifyingScore ?? null,
        mainScore: saved.mainScore ?? null,
        deuceEnabled: saved.deuceEnabled ?? null,
        deuceMaxScore: saved.deuceMaxScore ?? null,
        advanceCount: saved.advanceCount ?? current?.advanceCount ?? null,
        teamCount: hasGeneratedTeams ? teamCount : null,
        mainAdvanceTeamCount: hasGeneratedTeams
          ? eventGroups.length *
            (saved.advanceCount ?? current?.advanceCount ?? 1)
          : null,
        hasUnsavedDifference: scoreDiff || courtDiff,
      };
    });
  }, [
    allBracketGroups,
    bracketSettings,
    bracketSchedule,
    courtForm,
    courtSettingsData,
    settingsForm,
    tournament?.events,
  ]);

  const selectedActualBracketSettings = useMemo(
    () =>
      actualBracketSettingsSummaries.find(
        summary => summary.eventId === bracketEventId
      ) ?? null,
    [actualBracketSettingsSummaries, bracketEventId]
  );

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
        <h2 className="text-base font-bold text-foreground mb-1">
          로그인 필요
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          대회 관리를 위해 로그인해주세요
        </p>
        <button
          onClick={() =>
            navigate(`/login?returnTo=/tournament/${tournamentId}/manage`)
          }
          className="bg-primary text-foreground text-sm font-bold px-6 py-2.5 rounded-xl"
        >
          로그인
        </button>
      </div>
    );
  }
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-red-300 mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">
          접근 권한 없음
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          대회 관리자 권한이 필요합니다
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-line-strong text-secondary-foreground text-sm font-bold px-6 py-2.5 rounded-xl"
        >
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
        <p className="text-xs text-muted-foreground mb-4">
          본인이 생성한 대회만 관리할 수 있습니다
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-line-strong text-secondary-foreground text-sm font-bold px-6 py-2.5 rounded-xl"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const tabs: { key: ManageTab; label: string; icon: any }[] = [
    { key: "registrations", label: "접수", icon: Users },
    { key: "info", label: "정보", icon: FileText },
    { key: "events", label: "종목", icon: Trophy },
    { key: "media", label: "미디어", icon: ImageIcon },
    { key: "status", label: "상태", icon: Settings },
    { key: "bracket", label: "대진", icon: GitBranch },
    { key: "onsite", label: "현장", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 경기 재생성 중 오버레이 */}
      {regenerateMatchesMutation.isPending && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center gap-4 pointer-events-auto">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-white font-bold text-base">경기 재생성 중...</p>
          <p className="text-white/60 text-xs">
            완료될 때까지 다른 작업을 진행하지 마세요
          </p>
        </div>
      )}
      {/* Header */}
      <div className="bg-ink text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/tournament/${tournamentId}`)}
          className="w-8 h-8 rounded-full bg-card/10 flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">
            {tournament?.name ?? "대회"} - 관리
          </h1>
          <p className="text-[10px] text-white/50">
            {user?.name ?? user?.email}
          </p>
        </div>
        <Badge className="bg-primary text-foreground text-[10px] font-bold">
          {user?.role === "admin" || user?.role === "super_admin"
            ? "관리자"
            : "운영자"}
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
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="이름, 소속, 전화번호, 접수번호 검색..."
                  className="w-full pl-10 pr-3 py-2.5 bg-card rounded-xl text-xs text-foreground placeholder:text-muted-foreground border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={handleExcelExport}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-2.5 rounded-xl hover:bg-optic-deep transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> 엑셀
              </button>
            </div>
            {eventFilterOptions.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setEventFilter("all")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${eventFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"}`}
                >
                  전체
                </button>
                {eventFilterOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEventFilter(opt.value)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${eventFilter === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {regData && regData.length > 0 && (
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-lg p-2 text-center border transition-all ${statusFilter === "all" ? "border-primary bg-primary/10" : "border-line-strong bg-card hover:bg-ink-3"}`}
                >
                  <p className="text-base font-black text-foreground">
                    {regData.length}
                  </p>
                  <p className="text-[8px] text-muted-foreground">전체</p>
                </button>
                <button
                  onClick={() => setStatusFilter("paid")}
                  className={`rounded-lg p-2 text-center border transition-all ${statusFilter === "paid" ? "border-primary bg-primary/10" : "border-line-strong bg-card hover:bg-ink-3"}`}
                >
                  <p className="text-base font-black text-primary">
                    {
                      regData.filter((r: any) => r.paymentStatus === "paid")
                        .length
                    }
                  </p>
                  <p className="text-[8px] text-muted-foreground">입금완료</p>
                </button>
                <button
                  onClick={() => setStatusFilter("unpaid")}
                  className={`rounded-lg p-2 text-center border transition-all ${statusFilter === "unpaid" ? "border-primary bg-primary/10" : "border-line-strong bg-card hover:bg-ink-3"}`}
                >
                  <p className="text-base font-black text-yellow-500">
                    {
                      regData.filter((r: any) => r.paymentStatus === "unpaid")
                        .length
                    }
                  </p>
                  <p className="text-[8px] text-muted-foreground">미입금</p>
                </button>
                <button
                  onClick={() => setStatusFilter("confirmed")}
                  className={`rounded-lg p-2 text-center border transition-all ${statusFilter === "confirmed" ? "border-primary bg-primary/10" : "border-line-strong bg-card hover:bg-ink-3"}`}
                >
                  <p className="text-base font-black text-green-500">
                    {
                      regData.filter((r: any) => r.status === "confirmed")
                        .length
                    }
                  </p>
                  <p className="text-[8px] text-muted-foreground">확정</p>
                </button>
                <button
                  onClick={() => setStatusFilter("cancelled")}
                  className={`rounded-lg p-2 text-center border transition-all ${statusFilter === "cancelled" ? "border-primary bg-primary/10" : "border-line-strong bg-card hover:bg-ink-3"}`}
                >
                  <p className="text-base font-black text-destructive">
                    {
                      regData.filter((r: any) => r.status === "cancelled")
                        .length
                    }
                  </p>
                  <p className="text-[8px] text-muted-foreground">취소</p>
                </button>
              </div>
            )}

            {(eventFilter !== "all" || statusFilter !== "all" || searchQuery) &&
              regData &&
              filteredRegs.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  필터 결과:{" "}
                  <span className="font-bold text-foreground">
                    {filteredRegs.length}
                  </span>
                  건
                </p>
              )}

            {!regData ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : filteredRegs.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery ||
                  eventFilter !== "all" ||
                  statusFilter !== "all"
                    ? "필터 조건에 맞는 접수가 없습니다"
                    : "접수 내역이 없습니다"}
                </p>
              </div>
            ) : (
              filteredRegs.slice(0, visibleCount).map((reg: any) => {
                const ps =
                  paymentStatusConfig[reg.paymentStatus] ||
                  paymentStatusConfig.unpaid;
                const rs =
                  regStatusConfig[reg.status] || regStatusConfig.pending;
                return (
                  <div
                    key={reg.id}
                    className="bg-card rounded-xl p-4 border border-line-strong"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {reg.registrationNumber}
                        </span>
                        {reg.eventType && (
                          <Badge className="text-[8px] font-bold border bg-indigo-100 text-indigo-700">
                            {reg.eventType}
                          </Badge>
                        )}
                        {reg.skillLevel && (
                          <Badge className="text-[8px] font-bold border bg-violet-100 text-violet-700">
                            {reg.skillLevel}
                          </Badge>
                        )}
                        {reg.ageGroupLabel && (
                          <Badge className="text-[8px] font-bold border bg-blue-100 text-blue-700">
                            {reg.ageGroupLabel}
                          </Badge>
                        )}
                        <Badge
                          className={`${rs.color} text-[8px] font-bold border`}
                        >
                          {rs.label}
                        </Badge>
                        <Badge
                          className={`${ps.color} text-[8px] font-bold border`}
                        >
                          {ps.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          {reg.createdAt
                            ? new Date(reg.createdAt).toLocaleString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: false,
                              })
                            : ""}
                        </span>
                        <button
                          onClick={() => handleOpenEdit(reg)}
                          className="p-1 rounded-md hover:bg-ink-3 text-muted-foreground hover:text-foreground transition-colors"
                          title="종목/급수/사이즈 변경"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 mb-3">
                      {reg.players?.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 text-[10px] text-secondary-foreground bg-ink-3 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="font-bold text-foreground min-w-[50px]">
                            {p.name}
                          </span>
                          {p.affiliation && (
                            <span className="text-muted-foreground">
                              ({p.affiliation})
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {p.phone}
                          </span>
                          <span>{p.birthDate}</span>
                          {p.giftSize && (
                            <Badge variant="outline" className="text-[8px]">
                              {p.giftSize}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        입금:
                      </span>
                      <div className="flex gap-1">
                        {(["unpaid", "paid", "refunded"] as const).map(
                          status => {
                            const cfg = paymentStatusConfig[status];
                            const isActive = reg.paymentStatus === status;
                            return (
                              <button
                                key={status}
                                onClick={() =>
                                  !isActive &&
                                  updatePaymentMutation.mutate({
                                    registrationId: reg.id,
                                    paymentStatus: status,
                                  })
                                }
                                disabled={
                                  isActive || updatePaymentMutation.isPending
                                }
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${isActive ? `${cfg.color} ring-1 ring-current` : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"} disabled:opacity-60`}
                              >
                                {status === "paid" && (
                                  <DollarSign className="w-2.5 h-2.5 inline mr-0.5" />
                                )}
                                {status === "refunded" && (
                                  <RefreshCw className="w-2.5 h-2.5 inline mr-0.5" />
                                )}
                                {cfg.label}
                              </button>
                            );
                          }
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground mx-1">
                        |
                      </span>
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        접수:
                      </span>
                      <div className="flex gap-1">
                        {(["pending", "confirmed", "cancelled"] as const).map(
                          status => {
                            const cfg = regStatusConfig[status];
                            const isActive = reg.status === status;
                            return (
                              <button
                                key={status}
                                onClick={() =>
                                  !isActive &&
                                  updateStatusMutation.mutate({
                                    registrationId: reg.id,
                                    status,
                                  })
                                }
                                disabled={
                                  isActive || updateStatusMutation.isPending
                                }
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${isActive ? `${cfg.color} ring-1 ring-current` : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"} disabled:opacity-60`}
                              >
                                {cfg.label}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                    {reg.paymentStatus === "paid" && (
                      <div className="mt-2 flex items-center gap-1 text-[9px] text-primary bg-primary/10 rounded-md px-2 py-1">
                        <MessageSquare className="w-3 h-3" /> 입금 확인 SMS가
                        발송되었습니다
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {filteredRegs.length > visibleCount && (
              <div
                ref={observerRef}
                className="flex items-center justify-center py-4"
              >
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-[10px] text-muted-foreground ml-2">
                  {visibleCount} / {filteredRegs.length}팀 표시 중
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Info Tab ─── */}
        {activeTab === "info" && (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">
                기본 정보
              </h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  대회명 *
                </label>
                <input
                  value={infoForm.name}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="대회명"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  설명
                </label>
                <textarea
                  value={infoForm.description}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[60px]"
                  placeholder="대회 설명"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    시작일 *
                  </label>
                  <input
                    type="date"
                    value={infoForm.startDate}
                    onChange={e =>
                      setInfoForm(p => ({ ...p, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    종료일 *
                  </label>
                  <input
                    type="date"
                    value={infoForm.endDate}
                    onChange={e =>
                      setInfoForm(p => ({ ...p, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  장소 *
                </label>
                <input
                  value={infoForm.venue}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, venue: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="장소"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  주소 *
                </label>
                <input
                  value={infoForm.address}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, address: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="주소"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">
                주최/후원 정보
              </h3>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  주최·주관 (쉼표 구분)
                </label>
                <input
                  value={infoForm.organizerHosts}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, organizerHosts: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="예: 리닝코리아, 포항 피클볼 조직위원회"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  후원·협찬 (쉼표 구분)
                </label>
                <input
                  value={infoForm.organizerSponsors}
                  onChange={e =>
                    setInfoForm(p => ({
                      ...p,
                      organizerSponsors: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="예: 포항시 체육회"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">
                참가비 & 기념품
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    참가비 (원)
                  </label>
                  <input
                    type="number"
                    value={infoForm.feePerTeam}
                    onChange={e =>
                      setInfoForm(p => ({
                        ...p,
                        feePerTeam: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    기념품 설명
                  </label>
                  <input
                    value={infoForm.giftDescription}
                    onChange={e =>
                      setInfoForm(p => ({
                        ...p,
                        giftDescription: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="예: 리닝 반팔 티셔츠"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  사이즈 옵션 (쉼표 구분)
                </label>
                <input
                  value={infoForm.sizeOptions}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, sizeOptions: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="예: XS, S, M, L, XL, 2XL, 3XL"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">
                입금 정보
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    은행명
                  </label>
                  <input
                    value={infoForm.bankName}
                    onChange={e =>
                      setInfoForm(p => ({ ...p, bankName: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="예: 카카오뱅크"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    예금주
                  </label>
                  <input
                    value={infoForm.accountHolder}
                    onChange={e =>
                      setInfoForm(p => ({
                        ...p,
                        accountHolder: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="예: 홍길동"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  계좌번호
                </label>
                <input
                  value={infoForm.accountNumber}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, accountNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="예: 3333-12-1234567"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  입금 안내 메모
                </label>
                <input
                  value={infoForm.paymentNote}
                  onChange={e =>
                    setInfoForm(p => ({ ...p, paymentNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-ink-3 rounded-lg text-xs border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="예: 입금자명에 팀명을 기재해주세요"
                />
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground mb-2">옵션</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={infoForm.hasAgeGroup}
                    onChange={e =>
                      setInfoForm(p => ({
                        ...p,
                        hasAgeGroup: e.target.checked,
                      }))
                    }
                    className="rounded border-line-strong"
                  />
                  연령대 구분
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={infoForm.hasSingles}
                    onChange={e =>
                      setInfoForm(p => ({ ...p, hasSingles: e.target.checked }))
                    }
                    className="rounded border-line-strong"
                  />
                  단식 종목 포함
                </label>
              </div>
            </div>

            <button
              onClick={handleInfoSubmit}
              disabled={updateTournamentMutation.isPending}
              className="w-full bg-primary text-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {updateTournamentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateTournamentMutation.isPending
                ? "저장 중..."
                : "대회 정보 저장"}
            </button>

            {/* ─── 관리자 관리 섹션 ─── */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> 대회 관리자
                </h3>
                <button
                  onClick={() => setShowOrganizerModal(true)}
                  className="text-[10px] font-bold text-primary flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              {!organizerList || organizerList.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  등록된 관리자가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {organizerList.map((org: any) => (
                    <div
                      key={org.userId}
                      className="flex items-center justify-between bg-ink-3 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            {org.userName ||
                              org.userEmail ||
                              `ID: ${org.userId}`}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {org.role === "owner" ? "대회 생성자" : "운영자"}
                          </p>
                        </div>
                      </div>
                      {org.role !== "owner" && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `${org.userName || org.userEmail} 관리자를 제거하시겠습니까?`
                              )
                            ) {
                              removeOrganizerMutation.mutate({
                                tournamentId: tournamentId!,
                                userId: org.userId,
                              });
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
                <p className="text-[9px] text-muted-foreground text-center">
                  관리자 추가/제거는 시스템 관리자만 가능합니다
                </p>
              )}
            </div>

            {/* 관리자 추가 모달 */}
            <Dialog
              open={showOrganizerModal}
              onOpenChange={setShowOrganizerModal}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">
                    대회 관리자 추가
                  </DialogTitle>
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
                    <p className="text-[10px] text-muted-foreground text-center py-4">
                      2글자 이상 입력하세요
                    </p>
                  ) : !searchedUsers || searchedUsers.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">
                      검색 결과가 없습니다
                    </p>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {searchedUsers.map((u: any) => {
                        const alreadyAdded = organizerList?.some(
                          (o: any) => o.userId === u.id
                        );
                        return (
                          <button
                            key={u.id}
                            disabled={
                              alreadyAdded || addOrganizerMutation.isPending
                            }
                            onClick={() =>
                              addOrganizerMutation.mutate({
                                tournamentId: tournamentId!,
                                userId: u.id,
                              })
                            }
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                              alreadyAdded
                                ? "opacity-50 cursor-not-allowed bg-ink-3"
                                : "hover:bg-ink-3"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-semibold">
                                {u.name || "이름 없음"}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                {u.email}
                              </p>
                            </div>
                            {alreadyAdded ? (
                              <Badge className="text-[8px] bg-muted text-muted-foreground">
                                이미 등록
                              </Badge>
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
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground">종목 설정</h3>
                <button
                  onClick={() => setEvents(prev => [...prev, emptyEvent()])}
                  className="text-[10px] font-bold text-primary flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              {events.map((ev, i) => (
                <div key={i} className="flex gap-1.5 items-end">
                  {/* 순서 조정 버튼 */}
                  <div className="flex flex-col gap-0.5 pb-0.5">
                    <button
                      onClick={() => {
                        if (i === 0) return;
                        const next = [...events];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setEvents(next);
                      }}
                      disabled={i === 0}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        if (i === events.length - 1) return;
                        const next = [...events];
                        [next[i], next[i + 1]] = [next[i + 1], next[i]];
                        setEvents(next);
                      }}
                      disabled={i === events.length - 1}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                  {/* 순번 표시 */}
                  <div className="text-[9px] text-muted-foreground font-mono pb-1.5 w-4 text-center shrink-0">
                    {i + 1}
                  </div>
                  {/* 필드 그리드 */}
                  <div className="grid grid-cols-12 gap-1.5 items-end flex-1">
                    <div className="col-span-3">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        종목
                      </label>
                      <select
                        value={ev.eventType}
                        onChange={e => {
                          const next = [...events];
                          next[i] = {
                            ...next[i],
                            eventType: e.target
                              .value as EventFormData["eventType"],
                          };
                          setEvents(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                      >
                        <option value="남복">남복</option>
                        <option value="여복">여복</option>
                        <option value="혼복">혼복</option>
                        {infoForm.hasSingles && (
                          <option value="남단">남단</option>
                        )}
                        {infoForm.hasSingles && (
                          <option value="여단">여단</option>
                        )}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        급수
                      </label>
                      <input
                        value={ev.skillLevel}
                        onChange={e => {
                          const next = [...events];
                          next[i] = { ...next[i], skillLevel: e.target.value };
                          setEvents(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                        placeholder="A조"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        최대팀
                      </label>
                      <input
                        type="number"
                        value={ev.maxTeams}
                        onChange={e => {
                          const next = [...events];
                          next[i] = {
                            ...next[i],
                            maxTeams: Number(e.target.value),
                          };
                          setEvents(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        일자
                      </label>
                      <input
                        value={ev.dayLabel}
                        onChange={e => {
                          const next = [...events];
                          next[i] = { ...next[i], dayLabel: e.target.value };
                          setEvents(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                        placeholder="Day1"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {events.length > 1 && (
                        <button
                          onClick={() =>
                            setEvents(prev => prev.filter((_, j) => j !== i))
                          }
                          className="text-red-400 hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {infoForm.hasAgeGroup && (
              <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">
                    연령대 설정
                  </h3>
                  <button
                    onClick={() =>
                      setAgeGroups(prev => [...prev, emptyAgeGroup()])
                    }
                    className="text-[10px] font-bold text-primary flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                </div>
                {ageGroups.map((ag, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-end">
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        코드
                      </label>
                      <input
                        value={ag.code}
                        onChange={e => {
                          const next = [...ageGroups];
                          next[i] = { ...next[i], code: e.target.value };
                          setAgeGroups(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                        placeholder="A"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        라벨
                      </label>
                      <input
                        value={ag.label}
                        onChange={e => {
                          const next = [...ageGroups];
                          next[i] = { ...next[i], label: e.target.value };
                          setAgeGroups(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                        placeholder="20~30대"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        최소
                      </label>
                      <input
                        type="number"
                        value={ag.minAge}
                        onChange={e => {
                          const next = [...ageGroups];
                          next[i] = {
                            ...next[i],
                            minAge: Number(e.target.value),
                          };
                          setAgeGroups(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground block mb-0.5">
                        최대
                      </label>
                      <input
                        type="number"
                        value={ag.maxAge}
                        onChange={e => {
                          const next = [...ageGroups];
                          next[i] = {
                            ...next[i],
                            maxAge: Number(e.target.value),
                          };
                          setAgeGroups(next);
                        }}
                        className="w-full px-1.5 py-1.5 bg-ink-3 rounded text-[10px] border border-line-strong"
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() =>
                          setAgeGroups(prev => prev.filter((_, j) => j !== i))
                        }
                        className="text-red-400 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {ageGroups.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">
                    연령대를 추가해주세요
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleEventsSubmit}
              disabled={setEventsMutation.isPending}
              className="w-full bg-primary text-foreground text-sm font-black py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {setEventsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {setEventsMutation.isPending ? "저장 중..." : "종목 설정 저장"}
            </button>
          </motion.div>
        )}

        {/* ─── Media Tab ─── */}
        {activeTab === "media" && (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            {/* Posters */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> 대회 포스터
                </h3>
                <button
                  onClick={() => posterInputRef.current?.click()}
                  disabled={uploadingPoster}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-[#6d8517] disabled:opacity-50"
                >
                  {uploadingPoster ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
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
              <p className="text-[9px] text-muted-foreground">
                인스타그램 4:5 비율 권장 (1080x1350px). 최대 10MB.
              </p>
              {tournament?.posters && tournament.posters.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {tournament.posters.map((poster: any, i: number) => (
                    <div
                      key={poster.id}
                      className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted border border-line-strong"
                    >
                      <img
                        src={poster.imageUrl}
                        alt={`포스터 ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-line-strong rounded-lg">
                  <ImageIcon className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-[10px] text-muted-foreground">
                    아직 업로드된 포스터가 없습니다
                  </p>
                  <button
                    onClick={() => posterInputRef.current?.click()}
                    className="mt-2 text-[10px] font-bold text-primary underline"
                  >
                    포스터 업로드하기
                  </button>
                </div>
              )}
            </div>

            {/* Size Guide */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground">
                사이즈표 이미지
              </h3>
              {tournament?.sizeGuideImageUrl ? (
                <div className="relative">
                  <img
                    src={tournament.sizeGuideImageUrl}
                    alt="사이즈표"
                    className="w-full rounded-lg border border-line-strong"
                  />
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
                      <span className="text-[10px] text-muted-foreground">
                        사이즈표 이미지 업로드
                      </span>
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
          </motion.div>
        )}

        {/* ─── Bracket Tab ─── */}
        {activeTab === "bracket" && (
          <motion.div
            className="relative space-y-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            {/* 대진 생성 중 오버레이 */}
            {(generateMutation.isPending || regenerateMutation.isPending) && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-bold text-foreground">
                  {generateMutation.isPending
                    ? "대진 생성 중..."
                    : "대진 재생성 중..."}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  잠시만 기다려주세요
                </p>
              </div>
            )}
            {/* 서브탭 */}
            {(() => {
              return (
                <div className="flex gap-1 border-b border-line-strong pb-0">
                  <button
                    onClick={() => setBracketSubTab("settings")}
                    className={`text-[11px] font-bold px-4 py-2 border-b-2 transition-colors ${
                      bracketSubTab === "settings"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    대진 설정
                  </button>
                  <button
                    onClick={() =>
                      hasGeneratedBracket && setBracketSubTab("view")
                    }
                    disabled={!hasGeneratedBracket}
                    className={`text-[11px] font-bold px-4 py-2 border-b-2 transition-colors ${
                      bracketSubTab === "view"
                        ? "border-primary text-primary"
                        : !hasGeneratedBracket
                          ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    대진 조회
                    {!hasGeneratedBracket && (
                      <span className="ml-1 text-[9px]">(미생성)</span>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      hasGeneratedBracket && setBracketSubTab("conflicts")
                    }
                    disabled={!hasGeneratedBracket}
                    className={`text-[11px] font-bold px-4 py-2 border-b-2 transition-colors ${
                      bracketSubTab === "conflicts"
                        ? "border-primary text-primary"
                        : !hasGeneratedBracket
                          ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    대진 충돌 여부
                    {potentialBracketConflicts.length > 0 && (
                      <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        {potentialBracketConflicts.length}
                      </span>
                    )}
                    {!hasGeneratedBracket && (
                      <span className="ml-1 text-[9px]">(미생성)</span>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* ── 설정 서브탭 ── */}
            {bracketSubTab === "settings" && (
              <>
                {/* 대진 생성 */}
                <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">
                      대진 생성
                    </h3>
                    {!["closed", "bracket_published", "in_progress"].includes(
                      tournament?.status ?? ""
                    ) && (
                      <span className="text-[9px] text-muted-foreground">
                        접수 마감 후 활성화
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (tournament?.status === "in_progress") {
                          setShowInProgressAlert(true);
                        } else if (tournamentId) {
                          generateMutation.mutate({ tournamentId });
                        }
                      }}
                      disabled={
                        generateMutation.isPending ||
                        ![
                          "closed",
                          "bracket_published",
                          "in_progress",
                        ].includes(tournament?.status ?? "")
                      }
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-optic-deep transition-colors disabled:opacity-50"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <GitBranch className="w-3 h-3" />
                      )}
                      대진 생성
                    </button>
                    <button
                      onClick={() => setShowRegenerateConfirm(true)}
                      disabled={regenerateMutation.isPending}
                      className="flex items-center gap-1.5 bg-card border border-line-strong text-foreground text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-ink-3 transition-colors disabled:opacity-50"
                    >
                      {regenerateMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      대진 재생성
                    </button>
                    <a
                      href={`/api/tournaments/${tournamentId}/bracket/export`}
                      download={`대진표_${tournament?.name ?? tournamentId}.xlsx`}
                      className="flex items-center gap-1.5 bg-card border border-line-strong text-foreground text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-ink-3 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      엑셀 다운로드
                    </a>
                  </div>
                </div>

                {actualBracketSettingsSummaries.length > 0 && (
                  <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                    <button
                      type="button"
                      onClick={() => setActualBracketSettingsOpen(v => !v)}
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <h3 className="text-xs font-bold text-foreground">
                          실제 대진 적용값
                        </h3>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          생성된 대진 기준
                        </p>
                      </div>
                      {actualBracketSettingsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {actualBracketSettingsOpen && (
                      <div className="space-y-2">
                        {actualBracketSettingsSummaries.map(summary => (
                          <div
                            key={summary.eventId}
                            className="rounded-lg border border-line-strong bg-ink-3 px-3 py-2 space-y-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-foreground">
                                {formatAdminEventLabel(
                                  summary.label,
                                  summary.teamCount
                                )}
                              </span>
                              {summary.matchDate && (
                                <span className="text-[9px] text-muted-foreground">
                                  {summary.matchDate}
                                </span>
                              )}
                              {summary.hasUnsavedDifference && (
                                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                  현재 입력값과 다름
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-line-strong">
                                {formatAdminCourtLabel(summary)}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-line-strong">
                                {formatAdminScoreLabel(summary)}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-line-strong">
                                {formatAdminDeuceLabel(summary)}
                              </span>
                              {summary.teamCount != null &&
                                summary.teamCount > 0 && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-line-strong">
                                    {summary.teamCount}팀
                                  </span>
                                )}
                              {summary.mainAdvanceTeamCount != null &&
                                summary.mainAdvanceTeamCount > 0 && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-line-strong">
                                    본선 {summary.mainAdvanceTeamCount}팀
                                  </span>
                                )}
                              {formatAdminAdvanceRankLabel(summary) && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-card text-foreground border border-line-strong">
                                  {formatAdminAdvanceRankLabel(summary)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 코트 설정 */}
                <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">
                      코트 설정
                    </h3>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] text-muted-foreground whitespace-nowrap">
                        대회 종료 목표
                      </label>
                      <select
                        value={targetEndTime}
                        onChange={e => setTargetEndTime(e.target.value)}
                        className="px-1.5 py-1 bg-ink-3 rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Array.from({ length: 19 }, (_, i) => {
                          const h = String(i + 6).padStart(2, "0");
                          return (
                            <option key={h} value={`${h}:00`}>
                              {h}:00
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        for (const cf of courtForm) {
                          if (
                            !Number(cf.courtCount) ||
                            Number(cf.courtCount) < 1
                          ) {
                            toast.error(
                              `${cf.matchDate}: 코트 수는 1 이상이어야 합니다`
                            );
                            return;
                          }
                          if (
                            !Number(cf.estimatedMinutes) ||
                            Number(cf.estimatedMinutes) < 1
                          ) {
                            toast.error(
                              `${cf.matchDate}: 경기 시간은 1분 이상이어야 합니다`
                            );
                            return;
                          }
                        }
                        if (tournamentId)
                          saveCourtSettingsMutation.mutate({
                            tournamentId,
                            courtSettings: courtForm.map(cf => ({
                              ...cf,
                              courtCount: Number(cf.courtCount),
                              estimatedMinutes: Number(cf.estimatedMinutes),
                              targetEndTime,
                            })),
                          });
                      }}
                      disabled={
                        saveCourtSettingsMutation.isPending ||
                        courtForm.length === 0
                      }
                      className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-optic-deep transition-colors disabled:opacity-50"
                    >
                      {saveCourtSettingsMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      저장
                    </button>
                  </div>
                  {courtForm.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                      대회 날짜를 먼저 설정해주세요
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {courtForm.map((cf, idx) => {
                        const toMinutes = (t: string) => {
                          const [h, m] = t.split(":").map(Number);
                          return h * 60 + m;
                        };
                        const startMin = cf.startTime
                          ? toMinutes(cf.startTime)
                          : 0;
                        const endMin = targetEndTime
                          ? toMinutes(targetEndTime)
                          : 0;
                        const TARGET_MINUTES =
                          endMin > startMin ? endMin - startMin : 0;
                        const qualCount = (
                          (bracketSchedule as any[]) ?? []
                        ).filter(
                          (m: any) =>
                            m.dateStr === cf.matchDate &&
                            m.phase === "qualifying"
                        ).length;
                        const estMin = Number(cf.estimatedMinutes) || 0;
                        const recommended =
                          qualCount > 0 && estMin > 0 && TARGET_MINUTES > 0
                            ? Math.ceil((qualCount * estMin) / TARGET_MINUTES)
                            : null;
                        return (
                          <div key={cf.matchDate} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-bold text-foreground">
                                {cf.matchDate}
                              </p>
                              {recommended !== null ? (
                                <button
                                  onClick={() =>
                                    setCourtForm(prev =>
                                      prev.map((c, i) =>
                                        i === idx
                                          ? {
                                              ...c,
                                              courtCount: String(recommended),
                                            }
                                          : c
                                      )
                                    )
                                  }
                                  className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  추천 {recommended}코트 적용
                                </button>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">
                                  (대진 생성 후 추천)
                                </span>
                              )}
                              {qualCount > 0 && (
                                <span className="text-[9px] text-muted-foreground ml-auto">
                                  예선 {qualCount}경기 · {cf.startTime}~
                                  {targetEndTime} 기준
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[9px] text-muted-foreground block mb-0.5">
                                  코트 수
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={cf.courtCount}
                                  onChange={e =>
                                    setCourtForm(prev =>
                                      prev.map((c, i) =>
                                        i === idx
                                          ? { ...c, courtCount: e.target.value }
                                          : c
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-ink-3 rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-muted-foreground block mb-0.5">
                                  시작 시간
                                </label>
                                <div className="flex gap-1">
                                  <select
                                    value={cf.startTime.split(":")[0]}
                                    onChange={e =>
                                      setCourtForm(prev =>
                                        prev.map((c, i) =>
                                          i === idx
                                            ? {
                                                ...c,
                                                startTime: `${e.target.value}:${c.startTime.split(":")[1]}`,
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className="flex-1 px-1 py-1 bg-ink-3 rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    {Array.from({ length: 19 }, (_, i) => {
                                      const h = String(i + 6).padStart(2, "0");
                                      return (
                                        <option key={h} value={h}>
                                          {h}시
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <select
                                    value={cf.startTime.split(":")[1]}
                                    onChange={e =>
                                      setCourtForm(prev =>
                                        prev.map((c, i) =>
                                          i === idx
                                            ? {
                                                ...c,
                                                startTime: `${c.startTime.split(":")[0]}:${e.target.value}`,
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className="w-14 px-1 py-1 bg-ink-3 rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="00">00분</option>
                                    <option value="30">30분</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] text-muted-foreground block mb-0.5">
                                  경기 시간(분)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={cf.estimatedMinutes}
                                  onChange={e =>
                                    setCourtForm(prev =>
                                      prev.map((c, i) =>
                                        i === idx
                                          ? {
                                              ...c,
                                              estimatedMinutes: e.target.value,
                                            }
                                          : c
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-ink-3 rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => {
                                  const newCount = Number(cf.courtCount);
                                  if (!newCount || newCount < 1) {
                                    toast.error("코트 수를 올바르게 입력하세요");
                                    return;
                                  }
                                  if (!tournamentId) return;
                                  if (!confirm(`${cf.matchDate} 경기를 ${newCount}코트 기준으로 재배정합니다. 완료된 경기는 결과가 유지됩니다. 계속할까요?`)) return;
                                  rescheduleCourtMutation.mutate({
                                    tournamentId,
                                    matchDate: cf.matchDate,
                                    newCourtCount: newCount,
                                  });
                                }}
                                disabled={rescheduleCourtMutation.isPending}
                                className="flex items-center gap-1 text-[9px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-400"
                              >
                                {rescheduleCourtMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : null}
                                코트 수 재배정
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 대진 설정 폼 (saveSettings) */}
                <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">
                      대진 설정
                    </h3>
                    <button
                      onClick={() =>
                        tournamentId &&
                        saveSettingsMutation.mutate({
                          tournamentId,
                          settings: settingsForm,
                        })
                      }
                      disabled={
                        saveSettingsMutation.isPending ||
                        settingsForm.length === 0
                      }
                      className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-optic-deep transition-colors disabled:opacity-50"
                    >
                      {saveSettingsMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      저장
                    </button>
                  </div>

                  {/* 날짜 탭 */}
                  {tournamentDates.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      <button
                        onClick={() => {
                          setSelectedDateTab("");
                          setSelectedEventIndices(new Set());
                        }}
                        className={`text-[10px] font-bold px-3 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                          selectedDateTab === ""
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-ink-3 border-line-strong text-foreground hover:border-primary"
                        }`}
                      >
                        미선택
                      </button>
                      {tournamentDates.map(d => (
                        <button
                          key={d}
                          onClick={() => {
                            setSelectedDateTab(d);
                            setSelectedEventIndices(new Set());
                          }}
                          className={`text-[10px] font-bold px-3 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                            selectedDateTab === d
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-ink-3 border-line-strong text-foreground hover:border-primary"
                          }`}
                        >
                          {d.slice(5).replace("-", "/")}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 일괄 적용 */}
                  <div className="bg-ink-3 rounded-lg border border-line-strong">
                    <button
                      onClick={() => setBulkOpen(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2"
                    >
                      <p className="text-[10px] font-bold text-foreground">
                        일괄 적용
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {bulkOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {bulkOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        <div className="flex justify-end gap-1.5">
                          {[...selectedEventIndices].some(i =>
                            filteredSettingsIndices.includes(i)
                          ) && (
                            <button
                              onClick={() => {
                                const parsed = {
                                  ...bulkForm,
                                  qualifyingScore:
                                    Number(bulkForm.qualifyingScore) || 0,
                                  mainScore: Number(bulkForm.mainScore) || 0,
                                  mainFinalsScore:
                                    bulkForm.mainFinalsScore === ""
                                      ? null
                                      : Number(bulkForm.mainFinalsScore),
                                  finalsFromRound:
                                    bulkForm.finalsFromRound === ""
                                      ? null
                                      : Number(bulkForm.finalsFromRound),
                                  deuceMaxScore:
                                    Number(bulkForm.deuceMaxScore) || 0,
                                };
                                const newSettings = settingsForm.map(
                                  (item, i) =>
                                    selectedEventIndices.has(i) &&
                                    filteredSettingsIndices.includes(i)
                                      ? {
                                          ...item,
                                          ...parsed,
                                          matchDate:
                                            parsed.matchDate || item.matchDate,
                                        }
                                      : item
                                );
                                setSettingsForm(newSettings);
                                if (tournamentId)
                                  saveSettingsMutation.mutate({
                                    tournamentId,
                                    settings: newSettings,
                                  });
                              }}
                              disabled={saveSettingsMutation.isPending}
                              className="text-[9px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-lg hover:bg-optic-deep transition-colors disabled:opacity-50"
                            >
                              선택 적용 (
                              {
                                [...selectedEventIndices].filter(i =>
                                  filteredSettingsIndices.includes(i)
                                ).length
                              }
                              )
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const parsed = {
                                ...bulkForm,
                                qualifyingScore:
                                  Number(bulkForm.qualifyingScore) || 0,
                                mainScore: Number(bulkForm.mainScore) || 0,
                                deuceMaxScore:
                                  Number(bulkForm.deuceMaxScore) || 0,
                              };
                              const newSettings = settingsForm.map((item, i) =>
                                filteredSettingsIndices.includes(i)
                                  ? {
                                      ...item,
                                      ...parsed,
                                      matchDate:
                                        parsed.matchDate || item.matchDate,
                                    }
                                  : item
                              );
                              setSettingsForm(newSettings);
                              if (tournamentId)
                                saveSettingsMutation.mutate({
                                  tournamentId,
                                  settings: newSettings,
                                });
                            }}
                            disabled={saveSettingsMutation.isPending}
                            className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            전체 적용
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              경기일
                            </label>
                            <select
                              value={bulkForm.matchDate}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  matchDate: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">선택</option>
                              {tournamentDates.map(d => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              본선 진출 팀 수
                            </label>
                            <select
                              value={bulkForm.advanceCount}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  advanceCount: Number(e.target.value),
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value={1}>1팀</option>
                              <option value={2}>2팀</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              예선 점수
                            </label>
                            <input
                              type="number"
                              value={bulkForm.qualifyingScore}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  qualifyingScore: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              본선 점수
                            </label>
                            <input
                              type="number"
                              value={bulkForm.mainScore}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  mainScore: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              결승권 점수
                            </label>
                            <input
                              type="number"
                              placeholder="미적용"
                              value={bulkForm.mainFinalsScore}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  mainFinalsScore: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              적용 시작 라운드
                            </label>
                            <select
                              value={bulkForm.finalsFromRound}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  finalsFromRound: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">전체</option>
                              <option value="0">결승</option>
                              <option value="1">준결승(4강)</option>
                              <option value="2">8강</option>
                              <option value="3">16강</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-muted-foreground block mb-0.5">
                              듀스 최대 점수
                            </label>
                            <input
                              type="number"
                              value={bulkForm.deuceMaxScore}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  deuceMaxScore: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bulkForm.deuceEnabled}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  deuceEnabled: e.target.checked,
                                }))
                              }
                              className="w-3 h-3"
                            />
                            듀스 허용
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bulkForm.hasThirdPlace}
                              onChange={e =>
                                setBulkForm(f => ({
                                  ...f,
                                  hasThirdPlace: e.target.checked,
                                }))
                              }
                              className="w-3 h-3"
                            />
                            3위전
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 종목 리스트 (날짜별 순서) */}
                  {settingsForm.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                      종목 정보 없음
                    </p>
                  ) : filteredSettingsIndices.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                      해당 날짜에 배정된 종목 없음
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredSettingsIndices.map((globalIdx, localIdx) => {
                        const s = settingsForm[globalIdx];
                        const event = (tournament?.events as any[])?.find(
                          (e: any) => e.id === s.tournamentEventId
                        );
                        const actualSummary =
                          actualBracketSettingsSummaries.find(
                            summary => summary.eventId === s.tournamentEventId
                          );
                        const isExpanded =
                          expandedSettingsId === s.tournamentEventId;
                        return (
                          <div key={s.tournamentEventId} className="space-y-1">
                            <div
                              draggable
                              onDragStart={() => {
                                dragIdx.current = globalIdx;
                              }}
                              onDragOver={e => {
                                e.preventDefault();
                                setDragOverIdx(globalIdx);
                              }}
                              onDragLeave={() => setDragOverIdx(null)}
                              onDrop={() => {
                                if (
                                  dragIdx.current === null ||
                                  dragIdx.current === globalIdx
                                ) {
                                  setDragOverIdx(null);
                                  return;
                                }
                                const fromLocal =
                                  filteredSettingsIndices.indexOf(
                                    dragIdx.current
                                  );
                                if (fromLocal === -1) {
                                  setDragOverIdx(null);
                                  return;
                                }
                                setSettingsForm(prev => {
                                  const filteredItems =
                                    filteredSettingsIndices.map(i => prev[i]);
                                  const [movedItem] = filteredItems.splice(
                                    fromLocal,
                                    1
                                  );
                                  filteredItems.splice(localIdx, 0, movedItem);
                                  const result = [...prev];
                                  filteredSettingsIndices.forEach((pos, i) => {
                                    result[pos] = {
                                      ...filteredItems[i],
                                      eventOrder: i,
                                    };
                                  });
                                  return result;
                                });
                                setSelectedEventIndices(new Set());
                                dragIdx.current = null;
                                setDragOverIdx(null);
                              }}
                              onDragEnd={() => {
                                dragIdx.current = null;
                                setDragOverIdx(null);
                              }}
                              className={`border rounded-lg px-3 py-2 flex items-center gap-3 transition-colors cursor-default
                            ${selectedEventIndices.has(globalIdx) ? "border-primary bg-primary/5" : "border-line-strong"}
                            ${dragOverIdx === globalIdx ? "border-primary border-dashed bg-primary/10" : ""}
                          `}
                            >
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                              <input
                                type="checkbox"
                                checked={selectedEventIndices.has(globalIdx)}
                                onChange={e =>
                                  setSelectedEventIndices(prev => {
                                    const next = new Set(prev);
                                    e.target.checked
                                      ? next.add(globalIdx)
                                      : next.delete(globalIdx);
                                    return next;
                                  })
                                }
                                className="w-3 h-3 accent-primary shrink-0"
                              />
                              <button
                                className="text-[10px] font-bold text-foreground flex-1 text-left"
                                onClick={() =>
                                  setExpandedSettingsId(
                                    isExpanded ? null : s.tournamentEventId
                                  )
                                }
                              >
                                {formatAdminEventLabel(
                                  event
                                    ? `${event.eventType} ${event.skillLevel}`
                                    : `이벤트 ${s.tournamentEventId}`,
                                  actualSummary?.teamCount
                                )}
                              </button>
                              <span className="text-[9px] text-muted-foreground shrink-0">
                                #{localIdx + 1}
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="ml-7 bg-ink-3 rounded-lg p-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border border-line-strong">
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    경기일
                                  </label>
                                  <select
                                    value={s.matchDate}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                matchDate: e.target.value,
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">선택</option>
                                    {tournamentDates.map(d => (
                                      <option key={d} value={d}>
                                        {d}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    본선 진출 팀 수
                                  </label>
                                  <select
                                    value={s.advanceCount}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                advanceCount: Number(
                                                  e.target.value
                                                ),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value={1}>1팀</option>
                                    <option value={2}>2팀</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    예선 점수
                                  </label>
                                  <input
                                    type="number"
                                    value={s.qualifyingScore}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                qualifyingScore:
                                                  e.target.value === ""
                                                    ? 0
                                                    : Number(e.target.value),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    본선 점수
                                  </label>
                                  <input
                                    type="number"
                                    value={s.mainScore}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                mainScore:
                                                  e.target.value === ""
                                                    ? 0
                                                    : Number(e.target.value),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    결승권 점수
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="미적용"
                                    value={s.mainFinalsScore ?? ""}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                mainFinalsScore:
                                                  e.target.value === ""
                                                    ? null
                                                    : Number(e.target.value),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    적용 시작 라운드
                                  </label>
                                  <select
                                    value={s.finalsFromRound ?? ""}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                finalsFromRound:
                                                  e.target.value === ""
                                                    ? null
                                                    : Number(e.target.value),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">전체</option>
                                    <option value="0">결승</option>
                                    <option value="1">준결승(4강)</option>
                                    <option value="2">8강</option>
                                    <option value="3">16강</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground block mb-0.5">
                                    듀스 최대 점수
                                  </label>
                                  <input
                                    type="number"
                                    value={s.deuceMaxScore}
                                    onChange={e =>
                                      setSettingsForm(prev =>
                                        prev.map((item, i) =>
                                          i === globalIdx
                                            ? {
                                                ...item,
                                                deuceMaxScore:
                                                  e.target.value === ""
                                                    ? 0
                                                    : Number(e.target.value),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="w-full px-1.5 py-1 bg-card rounded text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div className="col-span-2 flex gap-4 pt-0.5">
                                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={s.deuceEnabled}
                                      onChange={e =>
                                        setSettingsForm(prev =>
                                          prev.map((item, i) =>
                                            i === globalIdx
                                              ? {
                                                  ...item,
                                                  deuceEnabled:
                                                    e.target.checked,
                                                }
                                              : item
                                          )
                                        )
                                      }
                                      className="w-3 h-3"
                                    />
                                    듀스 허용
                                  </label>
                                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={s.hasThirdPlace}
                                      onChange={e =>
                                        setSettingsForm(prev =>
                                          prev.map((item, i) =>
                                            i === globalIdx
                                              ? {
                                                  ...item,
                                                  hasThirdPlace:
                                                    e.target.checked,
                                                }
                                              : item
                                          )
                                        )
                                      }
                                      className="w-3 h-3"
                                    />
                                    3위전
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── 대회 충돌 서브탭 ── */}
            {bracketSubTab === "conflicts" && (
              <>
                {(() => {
                  const conflictDates =
                    (publicBracket as any)?.dates ?? tournamentDates;
                  const visibleConflicts = potentialBracketConflicts.filter(
                    conflict => !viewDateTab || conflict.date === viewDateTab
                  );

                  return (
                    <div className="space-y-3">
                      <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-ink-3 border border-line-strong flex items-center justify-center shrink-0">
                              <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-foreground">
                                대진 충돌 여부 확인
                              </h3>
                              <p className="text-[10px] text-muted-foreground truncate">
                                혼복 예선과 남/여복 본선의 같은 시간대 후보 충돌
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`text-[9px] font-bold shrink-0 ${
                              visibleConflicts.length > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-ink-3 text-muted-foreground"
                            }`}
                          >
                            {publicBracketLoading
                              ? "확인 중"
                              : `${visibleConflicts.length}건`}
                          </Badge>
                        </div>

                        {conflictDates.length > 1 && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setViewDateTab("")}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                                !viewDateTab
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-ink-3 border-line-strong text-foreground hover:border-primary"
                              }`}
                            >
                              전체
                            </button>
                            {conflictDates.map((d: string) => (
                              <button
                                key={d}
                                onClick={() => setViewDateTab(d)}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                                  viewDateTab === d
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-ink-3 border-line-strong text-foreground hover:border-primary"
                                }`}
                              >
                                {d.slice(5).replace("-", "/")}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {publicBracketLoading ? (
                        <div className="bg-card rounded-xl p-4 border border-line-strong flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          확인 중
                        </div>
                      ) : !publicBracket ? (
                        <p className="bg-card rounded-xl p-4 border border-line-strong text-[10px] text-muted-foreground">
                          대진 데이터 없음
                        </p>
                      ) : visibleConflicts.length === 0 ? (
                        <p className="bg-card rounded-xl p-4 border border-line-strong text-[10px] text-muted-foreground">
                          감지된 충돌 가능 경기 없음
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {visibleConflicts.map(conflict => (
                            <div
                              key={`${conflict.mainMatchId}_${conflict.mixedMatchId}`}
                              className="bg-card rounded-xl border border-line-strong overflow-hidden"
                            >
                              <div className="px-3 py-2 border-b border-line-strong bg-ink-3/60 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-black text-foreground shrink-0">
                                    {conflict.date.slice(5).replace("-", "/")}{" "}
                                    {conflict.timeStr}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground truncate">
                                    같은 시간대
                                  </span>
                                </div>
                                <div className="flex flex-wrap justify-end gap-1 shrink-0">
                                  {conflict.overlappingPlayers.map(player => (
                                    <span
                                      key={player}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700"
                                    >
                                      {player}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="grid gap-0 sm:grid-cols-2">
                                <div className="px-3 py-2.5 min-w-0 border-b sm:border-b-0 sm:border-r border-line-strong">
                                  <p className="text-[9px] font-bold text-muted-foreground mb-0.5">
                                    남/여복 본선
                                  </p>
                                  <p className="text-[10px] font-bold text-foreground truncate">
                                    {conflict.mainEventLabel}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {conflict.mainCourtNumber
                                      ? `${conflict.mainCourtNumber}코트 · `
                                      : ""}
                                    {conflict.mainMatchLabel}
                                  </p>
                                </div>
                                <div className="px-3 py-2.5 min-w-0">
                                  <p className="text-[9px] font-bold text-muted-foreground mb-0.5">
                                    혼복 예선
                                  </p>
                                  <p className="text-[10px] font-bold text-foreground truncate">
                                    {conflict.mixedEventLabel}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {conflict.mixedCourtNumber
                                      ? `${conflict.mixedCourtNumber}코트 · `
                                      : ""}
                                    {conflict.mixedMatchLabel}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* ── 조회 서브탭 ── */}
            {bracketSubTab === "view" && (
              <>
                {/* 날짜 + 종목 선택 */}
                <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                  {/* 날짜 선택 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-foreground">
                        날짜 선택
                      </h3>
                      {hasGroupChanges && (
                        <button
                          disabled={regenerateMatchesMutation.isPending}
                          onClick={() =>
                            regenerateMatchesMutation.mutate({
                              tournamentId: tournamentId!,
                            })
                          }
                          className="text-[9px] px-2.5 py-1 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1 shrink-0"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          {regenerateMatchesMutation.isPending
                            ? "재생성 중..."
                            : "저장 및 경기 재생성"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tournamentDates.map(d => (
                        <button
                          key={d}
                          onClick={() => {
                            setViewDateTab(d);
                            setBracketEventId(null);
                            setSchedGroupId(null);
                          }}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                            viewDateTab === d
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-ink-3 border-line-strong text-foreground hover:border-primary"
                          }`}
                        >
                          {d.slice(5).replace("-", "/")}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 종목 선택 (날짜 필터) */}
                  {viewDateTab &&
                    (() => {
                      const dateEvents = (
                        (tournament?.events as any[]) ?? []
                      ).filter(
                        (e: any) =>
                          settingsForm.find(s => s.tournamentEventId === e.id)
                            ?.matchDate === viewDateTab
                      );
                      return (
                        <div>
                          <h3 className="text-xs font-bold text-foreground mb-2">
                            종목 선택
                          </h3>
                          {dateEvents.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground">
                              해당 날짜에 배정된 종목 없음
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {dateEvents.map((e: any) =>
                                (() => {
                                  const actualSummary =
                                    actualBracketSettingsSummaries.find(
                                      summary => summary.eventId === e.id
                                    );
                                  return (
                                    <button
                                      key={e.id}
                                      onClick={() => {
                                        setBracketEventId(e.id);
                                        setSchedGroupId(null);
                                      }}
                                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                                        bracketEventId === e.id
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-ink-3 border-line-strong text-foreground hover:border-primary"
                                      }`}
                                    >
                                      {formatAdminEventLabel(
                                        `${e.eventType} ${e.skillLevel}`,
                                        actualSummary?.teamCount
                                      )}
                                    </button>
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>

                {selectedActualBracketSettings && (
                  <div className="bg-card rounded-xl p-4 border border-line-strong space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedActualBracketSettingsOpen(v => !v)
                      }
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-foreground">
                          실제 대진 적용값
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {formatAdminEventLabel(
                            selectedActualBracketSettings.label,
                            selectedActualBracketSettings.teamCount
                          )}
                          {selectedActualBracketSettings.matchDate
                            ? ` · ${selectedActualBracketSettings.matchDate}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedActualBracketSettings.hasUnsavedDifference && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                            현재 입력값과 다름
                          </span>
                        )}
                        {selectedActualBracketSettingsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    {selectedActualBracketSettingsOpen && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                          {formatAdminCourtLabel(selectedActualBracketSettings)}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                          {formatAdminScoreLabel(selectedActualBracketSettings)}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                          {formatAdminDeuceLabel(selectedActualBracketSettings)}
                        </span>
                        {selectedActualBracketSettings.teamCount != null &&
                          selectedActualBracketSettings.teamCount > 0 && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                              {selectedActualBracketSettings.teamCount}팀
                            </span>
                          )}
                        {selectedActualBracketSettings.mainAdvanceTeamCount !=
                          null &&
                          selectedActualBracketSettings.mainAdvanceTeamCount >
                            0 && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                              {`본선 ${selectedActualBracketSettings.mainAdvanceTeamCount}팀`}
                            </span>
                          )}
                        {formatAdminAdvanceRankLabel(
                          selectedActualBracketSettings
                        ) && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-ink-3 text-foreground">
                            {formatAdminAdvanceRankLabel(
                              selectedActualBracketSettings
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 조편성 + 예선 경기 */}
                {bracketEventId && (
                  <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                    <h3 className="text-xs font-bold text-foreground">
                      조편성
                    </h3>
                    {!bracketGroups || bracketGroups.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        조편성 데이터 없음
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {bracketGroups.map((group: any) => {
                          const isSelected = schedGroupId === group.id;
                          const matches = isSelected
                            ? ((groupMatchesData as any[]) ?? [])
                            : [];
                          return (
                            <div
                              key={group.id}
                              className={`border rounded-lg overflow-hidden transition-colors ${isSelected ? "border-primary" : "border-line-strong"}`}
                            >
                              {/* 조 헤더 (클릭하면 경기 토글) */}
                              <button
                                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-ink-3"}`}
                                onClick={() =>
                                  setSchedGroupId(isSelected ? null : group.id)
                                }
                              >
                                <span className="text-[10px] font-bold">
                                  {group.groupLabel ?? `${group.groupNumber}조`}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {isSelected ? "▲" : "▼"}
                                </span>
                              </button>
                              {/* 팀 목록 */}
                              <div className="px-3 pb-2 space-y-0.5">
                                {(group.teams ?? []).map(
                                  (t: any, i: number) => (
                                    <div key={i} className="text-[10px]">
                                      <div className="flex justify-between items-center">
                                        <span className="text-foreground">
                                          {t.teamName ??
                                            `팀 ${t.registrationId}`}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground">
                                            {t.wins ?? 0}승 {t.losses ?? 0}패
                                          </span>
                                          <button
                                            onClick={() =>
                                              setMoveTeamState(
                                                moveTeamState?.regId ===
                                                  t.registrationId
                                                  ? null
                                                  : {
                                                      regId: t.registrationId,
                                                      fromGroupId: group.id,
                                                    }
                                              )
                                            }
                                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                              moveTeamState?.regId ===
                                              t.registrationId
                                                ? "bg-primary/10 border-primary text-primary"
                                                : "border-line-strong text-muted-foreground hover:text-primary"
                                            }`}
                                          >
                                            이동
                                          </button>
                                        </div>
                                      </div>
                                      {/* 조 선택 UI */}
                                      {moveTeamState?.regId ===
                                        t.registrationId && (
                                        <div className="mt-1 flex flex-wrap gap-1 pl-1">
                                          {((bracketGroups as any[]) ?? [])
                                            .filter(
                                              (g: any) => g.id !== group.id
                                            )
                                            .map((g: any) => (
                                              <button
                                                key={g.id}
                                                disabled={
                                                  moveTeamMutation.isPending
                                                }
                                                onClick={() =>
                                                  moveTeamMutation.mutate({
                                                    registrationId:
                                                      t.registrationId,
                                                    fromGroupId: group.id,
                                                    toGroupId: g.id,
                                                  })
                                                }
                                                className="text-[9px] px-2 py-0.5 rounded bg-primary/10 border border-primary text-primary hover:bg-primary/20 disabled:opacity-50"
                                              >
                                                {g.groupNumber}조로 이동
                                              </button>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                              {/* 예선 경기 목록 */}
                              {isSelected && (
                                <div className="border-t border-line-strong mx-3 mb-2">
                                  {matches.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground py-2">
                                      경기 없음
                                    </p>
                                  ) : (
                                    <div className="pt-2">
                                      {/* 순서 저장 버튼 */}
                                      <div className="flex justify-end mb-1.5">
                                        <button
                                          disabled={
                                            reorderMatchesMutation.isPending ||
                                            matches.some(
                                              (m: any) =>
                                                m.status === "completed"
                                            )
                                          }
                                          onClick={() =>
                                            reorderMatchesMutation.mutate({
                                              groupId: schedGroupId!,
                                              orderedMatchIds: localMatchOrder,
                                            })
                                          }
                                          className="text-[9px] px-2 py-1 rounded bg-primary text-primary-foreground font-bold disabled:opacity-40"
                                          title={
                                            matches.some(
                                              (m: any) =>
                                                m.status === "completed"
                                            )
                                              ? "완료된 경기가 있어 순서 변경 불가"
                                              : ""
                                          }
                                        >
                                          {reorderMatchesMutation.isPending
                                            ? "저장 중..."
                                            : "순서 저장"}
                                        </button>
                                      </div>
                                      <Reorder.Group
                                        axis="y"
                                        values={localMatchOrder}
                                        onReorder={setLocalMatchOrder}
                                        className="space-y-1.5"
                                      >
                                        {localMatchOrder.map(
                                          (matchId: number) => {
                                            const m = (matches as any[]).find(
                                              (x: any) => x.id === matchId
                                            );
                                            if (!m) return null;
                                            return (
                                              <Reorder.Item
                                                key={matchId}
                                                value={matchId}
                                                className={`bg-ink-3 rounded-lg px-2.5 py-2 space-y-1 ${m.status !== "completed" ? "cursor-grab active:cursor-grabbing" : ""}`}
                                                drag={m.status !== "completed"}
                                              >
                                                {/* 경기 메타 */}
                                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                                  {m.status !== "completed" && (
                                                    <GripVertical className="w-3 h-3 shrink-0 text-muted-foreground/40" />
                                                  )}
                                                  <span className="font-bold">
                                                    {m.courtNumber != null
                                                      ? `${m.courtNumber}코트`
                                                      : "-"}{" "}
                                                    {m.matchNum}번게임
                                                  </span>
                                                  <span>
                                                    {m.timeStr ?? "-"}
                                                  </span>
                                                  {m.status === "completed" && (
                                                    <span className="font-mono font-bold text-foreground">
                                                      {m.team1Score} :{" "}
                                                      {m.team2Score}
                                                    </span>
                                                  )}
                                                </div>
                                                {/* 팀 */}
                                                <div className="flex items-center gap-1.5 text-[10px]">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-bold truncate">
                                                      {m.team1Name}
                                                    </div>
                                                    {m.team1Players && (
                                                      <div className="text-[9px] truncate">
                                                        {m.team1Players}
                                                      </div>
                                                    )}
                                                  </div>
                                                  {m.team1Result && (
                                                    <span
                                                      className={`text-[9px] font-bold px-1 rounded shrink-0 ${m.team1Result === "승" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                                                    >
                                                      {m.team1Result}
                                                    </span>
                                                  )}
                                                  <span className="text-muted-foreground shrink-0">
                                                    vs
                                                  </span>
                                                  {m.team2Result && (
                                                    <span
                                                      className={`text-[9px] font-bold px-1 rounded shrink-0 ${m.team2Result === "승" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                                                    >
                                                      {m.team2Result}
                                                    </span>
                                                  )}
                                                  <div className="flex-1 min-w-0 text-right">
                                                    <div className="font-bold truncate">
                                                      {m.team2Name}
                                                    </div>
                                                    {m.team2Players && (
                                                      <div className="text-[9px] truncate">
                                                        {m.team2Players}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </Reorder.Item>
                                            );
                                          }
                                        )}
                                      </Reorder.Group>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 본선 대진 */}
                {bracketEventId && (
                  <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                    <h3 className="text-xs font-bold text-foreground">
                      본선 대진
                    </h3>
                    {!mainBracket || mainBracket.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        본선 대진 데이터 없음
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {mainBracket.map((m: any) => (
                          <div
                            key={m.id}
                            className="text-[10px] bg-ink-3 rounded-lg px-3 py-2 flex items-center gap-2"
                          >
                            <span className="font-bold text-primary shrink-0 w-14">
                              {m.roundName}
                            </span>
                            <span className="text-foreground flex-1">
                              {m.team1Label}{" "}
                              <span className="text-muted-foreground">vs</span>{" "}
                              {m.team2Label === "부전승" ? (
                                <span className="text-muted-foreground italic">
                                  부전승
                                </span>
                              ) : (
                                m.team2Label
                              )}
                            </span>
                            {m.team1Score != null && (
                              <span className="font-bold text-foreground shrink-0">
                                {m.team1Score} : {m.team2Score}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 경기 결과 입력 */}
                <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
                  <h3 className="text-xs font-bold text-foreground">
                    경기 결과 입력
                  </h3>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        Match ID
                      </label>
                      <input
                        type="number"
                        value={matchResultForm.matchId}
                        onChange={e =>
                          setMatchResultForm(f => ({
                            ...f,
                            matchId: e.target.value,
                          }))
                        }
                        placeholder="경기 ID"
                        className="w-full px-2 py-1.5 bg-ink-3 rounded-lg text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        점수1
                      </label>
                      <input
                        type="number"
                        value={matchResultForm.score1}
                        onChange={e =>
                          setMatchResultForm(f => ({
                            ...f,
                            score1: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-ink-3 rounded-lg text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        점수2
                      </label>
                      <input
                        type="number"
                        value={matchResultForm.score2}
                        onChange={e =>
                          setMatchResultForm(f => ({
                            ...f,
                            score2: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-ink-3 rounded-lg text-[10px] border border-line-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!matchResultForm.matchId) return;
                        updateMatchResultMutation.mutate({
                          matchId: Number(matchResultForm.matchId),
                          team1Score: Number(matchResultForm.score1),
                          team2Score: Number(matchResultForm.score2),
                        });
                      }}
                      disabled={
                        updateMatchResultMutation.isPending ||
                        !matchResultForm.matchId
                      }
                      className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-optic-deep transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {updateMatchResultMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      저장
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ─── Status Tab ─── */}
        {activeTab === "status" && (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-4">
              <h3 className="text-xs font-bold text-foreground mb-2">
                대회 상태 변경
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-muted-foreground">
                  현재 상태:
                </span>
                <Badge
                  className={`${statusConfig[tournament?.status ?? "draft"]?.color ?? ""} text-[10px] font-bold border`}
                >
                  {statusConfig[tournament?.status ?? "draft"]?.label ??
                    "알 수 없음"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  Object.entries(statusConfig) as [
                    string,
                    { label: string; color: string },
                  ][]
                ).map(([key, cfg]) => {
                  const isActive = tournament?.status === key;
                  const hasBracket =
                    Array.isArray(bracketSchedule) &&
                    bracketSchedule.length > 0;
                  const isDisabled =
                    isActive ||
                    updateTournamentMutation.isPending ||
                    (key === "bracket_published" && !hasBracket);
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        !isDisabled && handleStatusChange(key as any)
                      }
                      disabled={isDisabled}
                      title={
                        key === "bracket_published" && !hasBracket
                          ? "대진 생성 후 선택 가능"
                          : undefined
                      }
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                        isActive
                          ? `${cfg.color} border-current ring-2 ring-current/20`
                          : "bg-ink-3 border-line-strong text-muted-foreground hover:border-primary hover:text-foreground"
                      } disabled:opacity-40`}
                    >
                      <span className="text-sm font-bold">{cfg.label}</span>
                      {isActive && (
                        <span className="text-[9px]">현재 상태</span>
                      )}
                      {key === "bracket_published" &&
                        !hasBracket &&
                        !isActive && (
                          <span className="text-[9px] text-muted-foreground">
                            대진 생성 필요
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-yellow-700 space-y-1">
                    <p className="font-bold">상태 변경 안내</p>
                    <p>
                      <strong>준비 중</strong>: 대회가 아직 공개되지 않은
                      상태입니다.
                    </p>
                    <p>
                      <strong>접수 중</strong>: 참가자가 접수할 수 있는
                      상태입니다.
                    </p>
                    <p>
                      <strong>접수 마감</strong>: 더 이상 접수를 받지 않습니다.
                    </p>
                    <p>
                      <strong>취소</strong>: 대회가 취소되었습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 심판 PIN 설정 */}
            <div className="bg-card rounded-xl p-4 border border-line-strong space-y-3">
              <h3 className="text-xs font-bold text-foreground">
                심판 PIN 설정
              </h3>
              <p className="text-[10px] text-muted-foreground">
                대회 페이지의 심판 로그인에 사용할 숫자 PIN을 설정하세요
                (4~6자리).
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={refereePinInput}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setRefereePinInput(v);
                  }}
                  placeholder="숫자 4~6자리"
                  className="flex-1 px-3 py-2 bg-background border border-line-strong rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => {
                    if (refereePinInput.length < 4) {
                      toast.error("PIN은 4자리 이상이어야 합니다");
                      return;
                    }
                    updateTournamentMutation.mutate({
                      id: tournamentId!,
                      data: { refereePin: refereePinInput },
                    });
                  }}
                  disabled={updateTournamentMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-optic-deep transition-colors disabled:opacity-50"
                >
                  저장
                </button>
              </div>
              {tournament?.refereePin && (
                <p className="text-[10px] text-muted-foreground">
                  현재 PIN:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {tournament.refereePin}
                  </span>
                </p>
              )}
            </div>
          </motion.div>
        )}
        {/* ─── Onsite Tab ─── */}
        {activeTab === "onsite" && (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            {/* 서브탭 */}
            <div className="flex gap-1 bg-ink-3 p-1 rounded-xl">
              {(["manage", "assign"] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setOnsiteSubTab(st)}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${onsiteSubTab === st ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {st === "manage" ? "대진 관리" : "배정 관리"}
                </button>
              ))}
              <button
                onClick={() => refetchPublicBracket()}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {publicBracketLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !publicBracket ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                대진 데이터 없음
              </div>
            ) : onsiteSubTab === "manage" ? (
              (() => {
                const { dates, events, groups, mainByEvent } = publicBracket;
                const dateEvents = events.filter(
                  (e: any) => e.matchDate === onsiteDate
                );
                const eventGroups = groups
                  .filter((g: any) => g.tournamentEventId === onsiteEventId)
                  .sort((a: any, b: any) => a.groupNumber - b.groupNumber);
                const eventMain = mainByEvent.find(
                  (m: any) => m.eventId === onsiteEventId
                );
                const hasMain = (eventMain?.matches?.length ?? 0) > 0;
                const selectedGroup =
                  typeof onsiteView === "number"
                    ? (eventGroups.find((g: any) => g.id === onsiteView) ??
                      null)
                    : null;
                const mainRounds: { roundName: string; matches: any[] }[] = [];
                if (eventMain && onsiteView === "main") {
                  const seen = new Map<string, any[]>();
                  for (const m of eventMain.matches) {
                    if (!seen.has(m.roundName)) seen.set(m.roundName, []);
                    seen.get(m.roundName)!.push(m);
                  }
                  for (const [roundName, matches] of Array.from(seen.entries()))
                    mainRounds.push({ roundName, matches });
                }
                return (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        날짜 선택
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {dates.map((d: string) => (
                          <button
                            key={d}
                            onClick={() => {
                              setOnsiteDate(d);
                              setOnsiteEventId(null);
                              setOnsiteView(null);
                            }}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${onsiteDate === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"}`}
                          >
                            {d.slice(5).replace("-", "/")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {onsiteDate && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          종목 선택
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {dateEvents.map((e: any) => (
                            <button
                              key={e.id}
                              onClick={() => {
                                setOnsiteEventId(e.id);
                                setOnsiteView(null);
                              }}
                              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${onsiteEventId === e.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"}`}
                            >
                              {formatAdminEventLabel(
                                e.label,
                                e.actualSettings?.teamCount
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {onsiteEventId && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          조 / 본선
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {eventGroups.map((g: any) => (
                            <button
                              key={g.id}
                              onClick={() => setOnsiteView(g.id)}
                              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${onsiteView === g.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"}`}
                            >
                              {eventGroups.length === 1
                                ? "풀리그"
                                : `${g.groupNumber}조`}
                            </button>
                          ))}
                          {hasMain && (
                            <button
                              onClick={() => setOnsiteView("main")}
                              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${onsiteView === "main" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"}`}
                            >
                              본선
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedGroup && (
                      <OnsiteGroupTable
                        group={selectedGroup}
                        isSingleGroup={eventGroups.length === 1}
                        onEditMatch={m => {
                          setEditingMatchId(m.id);
                          setEditScore1(String(m.team1Score ?? ""));
                          setEditScore2(String(m.team2Score ?? ""));
                          setEditTeam1Name(m.team1Name);
                          setEditTeam2Name(m.team2Name);
                        }}
                      />
                    )}
                    {onsiteView === "main" && (
                      <div className="space-y-4">
                        {mainRounds.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-8">
                            본선 경기 없음
                          </p>
                        ) : (
                          mainRounds.map(({ roundName, matches }) => (
                            <div key={roundName} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-line-strong" />
                                <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                                  {roundName}
                                </span>
                                <div className="h-px flex-1 bg-line-strong" />
                              </div>
                              {matches.map((m: any) => (
                                <OnsiteMainCard
                                  key={m.id}
                                  match={m}
                                  onEditMatch={m => {
                                    setEditingMatchId(m.id);
                                    setEditScore1(String(m.team1Score ?? ""));
                                    setEditScore2(String(m.team2Score ?? ""));
                                    setEditTeam1Name(m.team1Name);
                                    setEditTeam2Name(m.team2Name);
                                  }}
                                />
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {!onsiteDate && (
                      <div className="text-center py-10">
                        <p className="text-xs text-muted-foreground">
                          날짜를 선택해주세요
                        </p>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              (() => {
                // ── 배정 관리 탭 ──
                const { dates, events, groups, mainByEvent } = publicBracket;
                const activeAssignDate = onsiteAssignDate || dates[0] || "";

                // eventId → { label, matchDate }
                const eventInfoMap = new Map(
                  events.map((e: any) => [
                    e.id,
                    {
                      label: e.label as string,
                      matchDate: e.matchDate as string,
                    },
                  ])
                );

                // 모든 경기 flat 수집 (날짜 포함)
                const allCourtMatches: {
                  id: number;
                  courtNumber: number;
                  courtGameNum: number;
                  team1Name: string;
                  team2Name: string;
                  status: string;
                  phase: string;
                  evLabel: string;
                  matchDate: string;
                }[] = [];
                for (const g of groups) {
                  const evInfo = eventInfoMap.get(g.tournamentEventId);
                  for (const m of g.matches) {
                    if (m.courtNumber != null && m.courtGameNum != null)
                      allCourtMatches.push({
                        id: m.id,
                        courtNumber: m.courtNumber,
                        courtGameNum: m.courtGameNum,
                        team1Name: m.team1Name,
                        team2Name: m.team2Name,
                        status: m.status,
                        phase: "qualifying",
                        evLabel: evInfo?.label ?? "종목",
                        matchDate: evInfo?.matchDate ?? "",
                      });
                  }
                }
                for (const ev of mainByEvent) {
                  const evInfo = eventInfoMap.get(ev.eventId);
                  for (const m of ev.matches) {
                    if (
                      !m.isBye &&
                      m.courtNumber != null &&
                      m.courtGameNum != null
                    )
                      allCourtMatches.push({
                        id: m.id,
                        courtNumber: m.courtNumber,
                        courtGameNum: m.courtGameNum,
                        team1Name: m.team1Label,
                        team2Name: m.team2Label,
                        status: m.status,
                        phase: "main",
                        evLabel: evInfo?.label ?? "종목",
                        matchDate: evInfo?.matchDate ?? "",
                      });
                  }
                }

                // 날짜 필터 + 미완료만
                const dateFiltered = allCourtMatches.filter(
                  m =>
                    m.matchDate === activeAssignDate && m.status !== "completed"
                );
                const dateCourts = Array.from(
                  new Set(dateFiltered.map(m => m.courtNumber))
                ).sort((a, b) => a - b);
                const courtGames =
                  selectedAssignCourt != null
                    ? dateFiltered
                        .filter(m => m.courtNumber === selectedAssignCourt)
                        .sort((a, b) => a.courtGameNum - b.courtGameNum)
                    : [];

                const selectedMatch =
                  selectedMatchId != null
                    ? allCourtMatches.find(m => m.id === selectedMatchId)
                    : null;
                const sameCourtMatches = selectedMatch
                  ? dateFiltered
                      .filter(
                        m =>
                          m.courtNumber === selectedMatch.courtNumber &&
                          m.id !== selectedMatchId
                      )
                      .sort((a, b) => a.courtGameNum - b.courtGameNum)
                  : [];

                return (
                  <>
                    {/* 날짜 선택 */}
                    {dates.length > 1 && (
                      <div className="flex gap-2 flex-wrap">
                        {dates.map((d: string) => (
                          <button
                            key={d}
                            onClick={() => {
                              setOnsiteAssignDate(d);
                              setSelectedAssignCourt(null);
                              setSelectedMatchId(null);
                              setMoveMode(null);
                            }}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${activeAssignDate === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"}`}
                          >
                            {d.slice(5).replace("-", "/")}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 코트 선택 */}
                    {dateCourts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        배정된 미완료 경기 없음
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          코트 선택
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {dateCourts.map(court => (
                            <button
                              key={court}
                              onClick={() => {
                                setSelectedAssignCourt(
                                  court === selectedAssignCourt ? null : court
                                );
                                setSelectedMatchId(null);
                                setMoveMode(null);
                              }}
                              className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors ${selectedAssignCourt === court ? "bg-primary text-primary-foreground border-primary" : "bg-card border-line-strong text-foreground hover:border-primary"}`}
                            >
                              {court}코트
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 선택 코트의 경기 목록 */}
                    {selectedAssignCourt != null &&
                      (courtGames.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          {selectedAssignCourt}코트 미완료 경기 없음
                        </p>
                      ) : (
                        <div className="bg-card rounded-xl border border-line-strong overflow-hidden">
                          <div className="px-3 py-2.5 bg-ink-3 border-b border-line-strong flex items-center gap-2">
                            <span className="text-sm font-extrabold text-foreground">
                              {selectedAssignCourt}코트
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {courtGames.length}경기 남음
                            </span>
                          </div>
                          <div className="divide-y divide-line-strong">
                            {courtGames.map(m => {
                              const isSelected = selectedMatchId === m.id;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    setSelectedMatchId(
                                      isSelected ? null : m.id
                                    );
                                    setMoveMode(null);
                                    setTargetCourt("");
                                    setTargetPos("");
                                    setSwapTargetId(null);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-ink-3/50"}`}
                                >
                                  <span
                                    className={`text-xs font-black w-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                                  >
                                    {m.courtGameNum}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate text-foreground">
                                      {m.team1Name} vs {m.team2Name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {m.evLabel} ·{" "}
                                      {m.phase === "qualifying"
                                        ? "예선"
                                        : "본선"}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[10px] text-primary font-bold shrink-0">
                                      선택됨
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                    {/* 선택된 경기 액션 패널 — 고정 바텀시트 */}
                    {selectedMatch && (
                      <>
                        {/* 백드롭 */}
                        <div
                          className="fixed inset-0 z-30 bg-black/40"
                          onClick={() => {
                            setSelectedMatchId(null);
                            setMoveMode(null);
                            setSwapTargetId(null);
                            setTargetCourt("");
                            setTargetPos("");
                          }}
                        />
                        {/* 바텀시트 */}
                        <div className="fixed bottom-0 inset-x-0 z-40">
                          <div className="max-w-[480px] mx-auto">
                            <div className="bg-card rounded-t-2xl border-t-2 border-primary shadow-2xl overflow-hidden">
                              {/* 핸들 + 헤더 */}
                              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-line-strong">
                                <div className="w-8 h-1 bg-muted-foreground/30 rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
                                <div className="mt-1">
                                  <p className="text-sm font-extrabold text-foreground">
                                    {selectedMatch.courtNumber}코트{" "}
                                    {selectedMatch.courtGameNum}번게임
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {selectedMatch.team1Name} vs{" "}
                                    {selectedMatch.team2Name}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedMatchId(null);
                                    setMoveMode(null);
                                    setSwapTargetId(null);
                                    setTargetCourt("");
                                    setTargetPos("");
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-full bg-ink-3 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="px-4 py-4 space-y-3">
                                {/* 액션 선택 */}
                                {!moveMode && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setMoveMode("swap")}
                                      className="flex-1 py-3 rounded-xl border-2 border-line-strong bg-card text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-colors"
                                    >
                                      순번 교체
                                    </button>
                                    <button
                                      onClick={() => setMoveMode("court")}
                                      className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-[0.98] transition-all"
                                    >
                                      코트 이동
                                    </button>
                                  </div>
                                )}
                                {/* 순번 교체 */}
                                {moveMode === "swap" && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-foreground">
                                      교체할 경기 선택{" "}
                                      <span className="text-muted-foreground font-normal">
                                        ({selectedMatch.courtNumber}코트)
                                      </span>
                                    </p>
                                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                      {sameCourtMatches.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-3">
                                          같은 코트에 다른 경기 없음
                                        </p>
                                      ) : (
                                        sameCourtMatches.map(m => (
                                          <button
                                            key={m.id}
                                            onClick={() =>
                                              setSwapTargetId(
                                                swapTargetId === m.id
                                                  ? null
                                                  : m.id
                                              )
                                            }
                                            className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${swapTargetId === m.id ? "bg-primary/10 border-primary text-primary" : "bg-ink-3 border-transparent text-foreground hover:border-primary/40"}`}
                                          >
                                            <span className="font-black">
                                              {m.courtGameNum}번
                                            </span>{" "}
                                            · {m.team1Name} vs {m.team2Name}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        onClick={() => {
                                          setMoveMode(null);
                                          setSwapTargetId(null);
                                        }}
                                        className="flex-1 py-3 rounded-xl border-2 border-line-strong text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        뒤로
                                      </button>
                                      <button
                                        onClick={() =>
                                          swapTargetId &&
                                          swapMatchMutation.mutate({
                                            matchId1: selectedMatchId!,
                                            matchId2: swapTargetId,
                                          })
                                        }
                                        disabled={
                                          !swapTargetId ||
                                          swapMatchMutation.isPending
                                        }
                                        className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
                                      >
                                        {swapMatchMutation.isPending
                                          ? "교체 중..."
                                          : "순번 교체"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {/* 코트 이동 */}
                                {moveMode === "court" && (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-foreground">
                                          목표 코트
                                        </p>
                                        <input
                                          type="number"
                                          min={1}
                                          value={targetCourt}
                                          onChange={e =>
                                            setTargetCourt(e.target.value)
                                          }
                                          placeholder="예: 2"
                                          className="w-full px-3 py-2.5 bg-ink-3 border-2 border-transparent rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-foreground">
                                          목표 게임 번호
                                        </p>
                                        <input
                                          type="number"
                                          min={1}
                                          value={targetPos}
                                          onChange={e =>
                                            setTargetPos(e.target.value)
                                          }
                                          placeholder="예: 8"
                                          className="w-full px-3 py-2.5 bg-ink-3 border-2 border-transparent rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                                        />
                                      </div>
                                    </div>
                                    {targetCourt && targetPos && (
                                      <p className="text-xs text-muted-foreground bg-ink-3 rounded-xl px-3 py-2">
                                        <span className="text-primary font-bold">
                                          {targetCourt}코트 {targetPos}번
                                        </span>{" "}
                                        위치로 이동 · 이후 경기 번호가 자동
                                        조정됩니다
                                      </p>
                                    )}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setMoveMode(null);
                                          setTargetCourt("");
                                          setTargetPos("");
                                        }}
                                        className="flex-1 py-3 rounded-xl border-2 border-line-strong text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        뒤로
                                      </button>
                                      <button
                                        onClick={() => {
                                          const tc = parseInt(targetCourt),
                                            tp = parseInt(targetPos);
                                          if (!tc || !tp) {
                                            toast.error(
                                              "코트 번호와 게임 번호를 입력해주세요"
                                            );
                                            return;
                                          }
                                          moveMatchMutation.mutate({
                                            matchId: selectedMatchId!,
                                            targetCourtNumber: tc,
                                            targetSlotOrder: tp,
                                          });
                                        }}
                                        disabled={
                                          !targetCourt ||
                                          !targetPos ||
                                          moveMatchMutation.isPending
                                        }
                                        className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
                                      >
                                        {moveMatchMutation.isPending
                                          ? "이동 중..."
                                          : "이동 확정"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* 하단 안전 영역 */}
                              <div className="h-safe-bottom pb-2" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()
            )}
          </motion.div>
        )}
      </div>

      {/* ─── Edit Match Result Modal ─── */}
      {editingMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="bg-card rounded-2xl border border-line-strong w-full max-w-sm shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-line-strong">
              <h2 className="text-sm font-extrabold text-foreground">
                경기 결과 수정
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                점수를 수정하면 관련 대진이 업데이트됩니다
              </p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-1.5 truncate">
                    {editTeam1Name}
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={editScore1}
                    onChange={e => setEditScore1(e.target.value)}
                    className="w-full text-center text-2xl font-black bg-ink-3 border border-line-strong rounded-xl py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
                <span className="text-lg font-black text-muted-foreground shrink-0">
                  :
                </span>
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground mb-1.5 truncate">
                    {editTeam2Name}
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={editScore2}
                    onChange={e => setEditScore2(e.target.value)}
                    className="w-full text-center text-2xl font-black bg-ink-3 border border-line-strong rounded-xl py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex border-t border-line-strong">
              <button
                onClick={() => {
                  setEditingMatchId(null);
                  setEditScore1("");
                  setEditScore2("");
                  setEditTeam1Name("");
                  setEditTeam2Name("");
                }}
                className="flex-1 py-3.5 text-sm font-bold text-muted-foreground hover:bg-ink-3 transition-colors"
              >
                취소
              </button>
              <div className="w-px bg-line-strong" />
              <button
                onClick={() => {
                  const s1 = parseInt(editScore1);
                  const s2 = parseInt(editScore2);
                  if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
                    toast.error("올바른 점수를 입력해주세요");
                    return;
                  }
                  if (s1 === s2) {
                    toast.error("동점은 유효하지 않습니다");
                    return;
                  }
                  adminUpdateResult.mutate({
                    matchId: editingMatchId,
                    team1Score: s1,
                    team2Score: s2,
                  });
                }}
                disabled={adminUpdateResult.isPending}
                className="flex-1 py-3.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {adminUpdateResult.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Registration Modal ─── */}
      <Dialog
        open={!!editingReg}
        onOpenChange={open => !open && setEditingReg(null)}
      >
        <DialogContent className="max-w-[400px] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              접수 정보 수정{" "}
              <span className="text-muted-foreground font-mono text-xs">
                {editingReg?.registrationNumber}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* 종목/급수 선택 */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                종목 / 급수
              </label>
              <Select value={editEventId} onValueChange={setEditEventId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="종목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {tournament?.events?.map((ev: any) => (
                    <SelectItem
                      key={ev.id}
                      value={String(ev.id)}
                      className="text-xs"
                    >
                      {ev.eventType} {ev.skillLevel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 나이대 선택 */}
            {tournament?.hasAgeGroup && tournament?.ageGroups?.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  나이대
                </label>
                <Select
                  value={editAgeGroupId}
                  onValueChange={setEditAgeGroupId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="나이대 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      없음
                    </SelectItem>
                    {tournament.ageGroups.map((ag: any) => (
                      <SelectItem
                        key={ag.id}
                        value={String(ag.id)}
                        className="text-xs"
                      >
                        {ag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 선수별 정보 수정 */}
            {editingReg?.players?.map((p: any, idx: number) => (
              <div
                key={p.id}
                className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border"
              >
                <div className="text-[10px] font-bold text-muted-foreground">
                  선수 {idx + 1}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    이름
                  </label>
                  <Input
                    value={editPlayers[p.id]?.name || ""}
                    onChange={e =>
                      setEditPlayers(prev => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], name: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="이름"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    생년월일
                  </label>
                  <Input
                    value={editPlayers[p.id]?.birthDate || ""}
                    onChange={e =>
                      setEditPlayers(prev => ({
                        ...prev,
                        [p.id]: {
                          ...prev[p.id],
                          birthDate: formatBirthEdit(e.target.value),
                        },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    전화번호
                  </label>
                  <Input
                    value={editPlayers[p.id]?.phone || ""}
                    onChange={e =>
                      setEditPlayers(prev => ({
                        ...prev,
                        [p.id]: {
                          ...prev[p.id],
                          phone: formatPhoneEdit(e.target.value),
                        },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="010-0000-0000"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    소속
                  </label>
                  <Input
                    value={editPlayers[p.id]?.affiliation || ""}
                    onChange={e =>
                      setEditPlayers(prev => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], affiliation: e.target.value },
                      }))
                    }
                    className="h-8 text-xs"
                    placeholder="클럽명 또는 소속"
                  />
                </div>
                {/* 사이즈 */}
                {sizeOptionsList.length > 0 && (
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                      사이즈
                    </label>
                    <Select
                      value={editSizes[p.id] || ""}
                      onValueChange={v =>
                        setEditSizes(prev => ({ ...prev, [p.id]: v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="사이즈 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeOptionsList.map((size: string) => (
                          <SelectItem
                            key={size}
                            value={size}
                            className="text-xs"
                          >
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={handleSaveEdit}
              disabled={
                updateRegEventMutation.isPending ||
                updatePlayerInfoMutation.isPending
              }
              className="w-full bg-primary text-foreground text-sm font-black py-3 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {updateRegEventMutation.isPending ||
              updatePlayerInfoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateRegEventMutation.isPending ||
              updatePlayerInfoMutation.isPending
                ? "저장 중..."
                : "변경 저장"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 대진 재생성 확인 다이얼로그 */}
      <Dialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">대진 재생성</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            기존 대진 데이터가 모두 삭제되고 다시 생성됩니다. 계속하시겠습니까?
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowRegenerateConfirm(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-line-strong hover:bg-ink-3 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => {
                setShowRegenerateConfirm(false);
                tournamentId && regenerateMutation.mutate({ tournamentId });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity"
            >
              재생성
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 대진 생성 불가 안내 다이얼로그 */}
      <Dialog open={showInProgressAlert} onOpenChange={setShowInProgressAlert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">대진 생성 불가</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            대회 진행중에는 대진을 생성할 수 없습니다.
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowInProgressAlert(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
            >
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 현장 탭: 조별리그 표 ────────────────────────────────

function OnsiteGroupTable({
  group,
  isSingleGroup,
  onEditMatch,
}: {
  group: any;
  isSingleGroup?: boolean;
  onEditMatch?: (m: {
    id: number;
    team1Score: number | null;
    team2Score: number | null;
    team1Name: string;
    team2Name: string;
  }) => void;
}) {
  const teams = group.teams as any[];
  return (
    <div className="bg-card rounded-xl border border-line-strong overflow-hidden">
      <div className="px-3 py-2.5 bg-ink-3 border-b border-line-strong flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          {isSingleGroup ? "풀리그" : `${group.groupNumber}조`}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {teams.length}팀
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse min-w-max">
          <thead>
            <tr className="bg-ink-3/40">
              <th className="text-left px-2.5 py-2 font-bold text-muted-foreground border-r border-line-strong sticky left-0 bg-ink-3/80 min-w-[68px]">
                팀
              </th>
              {teams.map((t: any) => (
                <th
                  key={t.registrationId}
                  className="px-2 py-2 font-bold text-muted-foreground border-r border-line-strong text-center min-w-[52px]"
                >
                  <span className="truncate block max-w-[52px] mx-auto">
                    {t.teamName}
                  </span>
                </th>
              ))}
              <th className="px-2.5 py-2 font-bold text-muted-foreground border-r border-line-strong text-center whitespace-nowrap">
                승패
              </th>
              <th className="px-2.5 py-2 font-bold text-muted-foreground border-r border-line-strong text-center whitespace-nowrap">
                득실
              </th>
              <th className="px-2.5 py-2 font-bold text-muted-foreground text-center">
                순위
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((row: any, ri: number) => {
              const ptsNet = row.ptsFor - row.ptsAgainst;
              return (
                <tr
                  key={row.registrationId}
                  className={`border-t border-line-strong ${ri % 2 === 1 ? "bg-ink-3/20" : ""}`}
                >
                  <td className="px-2.5 py-2 font-bold text-foreground border-r border-line-strong sticky left-0 bg-background truncate max-w-[80px]">
                    {row.teamName}
                  </td>
                  {teams.map((col: any) => {
                    if (row.registrationId === col.registrationId) {
                      return (
                        <td
                          key={col.registrationId}
                          className="px-2 py-2 border-r border-line-strong text-center bg-ink-3/40"
                        >
                          <span className="text-muted-foreground font-bold">
                            X
                          </span>
                        </td>
                      );
                    }
                    const key = `${row.registrationId}_${col.registrationId}`;
                    const cell = group.pairGrid[key];
                    if (!cell) {
                      return (
                        <td
                          key={col.registrationId}
                          className="px-2 py-2 border-r border-line-strong text-center text-muted-foreground"
                        >
                          -
                        </td>
                      );
                    }
                    const rowWon = cell.s1 > cell.s2;
                    return (
                      <td
                        key={col.registrationId}
                        className="px-2 py-2 border-r border-line-strong text-center font-mono"
                      >
                        <span
                          className={`font-bold ${rowWon ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {cell.s1}
                        </span>
                        <span className="text-muted-foreground">:</span>
                        <span
                          className={`font-bold ${!rowWon ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {cell.s2}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-2.5 py-2 border-r border-line-strong text-center font-bold text-foreground whitespace-nowrap">
                    {row.wins}승 {row.losses}패
                  </td>
                  <td className="px-2.5 py-2 border-r border-line-strong text-center whitespace-nowrap">
                    <span
                      className={`font-bold text-[11px] ${ptsNet > 0 ? "text-primary" : ptsNet < 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {ptsNet > 0 ? `+${ptsNet}` : ptsNet === 0 ? "0" : ptsNet}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-center font-bold">
                    {row.finalRank ? (
                      <span
                        className={
                          row.finalRank === 1
                            ? "text-yellow-500"
                            : row.finalRank === 2
                              ? "text-gray-400"
                              : "text-foreground"
                        }
                      >
                        {row.finalRank}위
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 경기 결과 목록 */}
      {group.matches.length > 0 && (
        <div className="border-t border-line-strong px-3 py-3 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground">
            경기 결과
          </p>
          {group.matches.map((m: any) => {
            const isCompleted = m.status === "completed";
            return (
              <div key={m.id} className="bg-ink-3 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5">
                  <span className="font-bold">
                    {m.courtNumber != null ? `${m.courtNumber}코트` : "-"}
                    {m.courtGameNum != null ? ` ${m.courtGameNum}번` : ""}
                  </span>
                  <span>{m.timeStr ?? "-"}</span>
                  {isCompleted && (
                    <>
                      <span className="ml-auto font-mono font-bold text-foreground text-xs">
                        {m.team1Score} : {m.team2Score}
                      </span>
                      {onEditMatch && (
                        <button
                          onClick={() =>
                            onEditMatch({
                              id: m.id,
                              team1Score: m.team1Score,
                              team2Score: m.team2Score,
                              team1Name: m.team1Name,
                              team2Name: m.team2Name,
                            })
                          }
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-ink-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex-1 truncate font-bold ${m.team1Result === "승" ? "text-primary" : ""}`}
                  >
                    {m.team1Name}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    vs
                  </span>
                  <span
                    className={`flex-1 truncate font-bold text-right ${m.team2Result === "승" ? "text-primary" : ""}`}
                  >
                    {m.team2Name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 현장 탭: 본선 경기 카드 ──────────────────────────────

function OnsiteMainCard({
  match: m,
  onEditMatch,
}: {
  match: any;
  onEditMatch?: (m: {
    id: number;
    team1Score: number | null;
    team2Score: number | null;
    team1Name: string;
    team2Name: string;
  }) => void;
}) {
  const isCompleted = m.status === "completed";

  if (m.isBye) {
    const advancingLabel =
      m.team1Label !== "부전승" ? m.team1Label : m.team2Label;
    return (
      <div className="bg-card rounded-xl border border-dashed border-line-strong px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground font-bold">
            자동 진출
          </span>
          <span className="text-sm font-bold text-foreground">
            {advancingLabel}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          부전승
        </span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-line-strong overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-ink-3/50 border-b border-line-strong">
        <span className="text-[10px] font-bold text-muted-foreground">
          {m.courtNumber != null ? `${m.courtNumber}코트` : "-"}
          {m.courtGameNum != null ? ` ${m.courtGameNum}번` : ""}
        </span>
        {m.timeStr && (
          <span className="text-[10px] text-muted-foreground">{m.timeStr}</span>
        )}
        <span
          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isCompleted
              ? "bg-green-500/15 text-green-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isCompleted ? "종료" : "예정"}
        </span>
        {isCompleted && onEditMatch && (
          <button
            onClick={() =>
              onEditMatch({
                id: m.id,
                team1Score: m.team1Score,
                team2Score: m.team2Score,
                team1Name: m.team1Label,
                team2Name: m.team2Label,
              })
            }
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-ink-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="px-3 py-3 flex items-center gap-3">
        <div className="flex-1 flex flex-col items-center gap-1">
          <p
            className={`text-sm font-bold text-center leading-tight ${m.team1Result === "승" ? "text-primary" : "text-foreground"}`}
          >
            {m.team1Label}
          </p>
          {m.team1Result && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.team1Result === "승" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {m.team1Result}
            </span>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-center gap-1.5 min-w-[64px]">
          {isCompleted ? (
            <>
              <span
                className={`text-2xl font-black ${(m.team1Score ?? 0) > (m.team2Score ?? 0) ? "text-primary" : "text-muted-foreground"}`}
              >
                {m.team1Score}
              </span>
              <span className="text-muted-foreground text-sm">:</span>
              <span
                className={`text-2xl font-black ${(m.team2Score ?? 0) > (m.team1Score ?? 0) ? "text-primary" : "text-muted-foreground"}`}
              >
                {m.team2Score}
              </span>
            </>
          ) : (
            <span className="text-lg font-black text-muted-foreground/30">
              vs
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <p
            className={`text-sm font-bold text-center leading-tight ${m.team2Result === "승" ? "text-primary" : "text-foreground"}`}
          >
            {m.team2Label}
          </p>
          {m.team2Result && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.team2Result === "승" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {m.team2Result}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
