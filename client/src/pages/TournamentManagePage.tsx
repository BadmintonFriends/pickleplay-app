import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Users, Download, Loader2, Shield,
  Search, Phone, DollarSign, RefreshCw, MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
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

export default function TournamentManagePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/tournament/:id/manage");
  const tournamentId = params?.id ? Number(params.id) : null;

  const [searchQuery, setSearchQuery] = useState("");

  const isAllowed = user?.role === "admin" || user?.role === "super_admin" || user?.role === "organizer";

  // 대회 정보 조회 (organizer 소유권 확인용)
  const { data: tournament, isLoading: tournamentLoading } = trpc.tournament.detail.useQuery(
    { id: tournamentId! },
    { enabled: !!tournamentId && isAllowed }
  );

  // organizer인 경우 본인 대회만 접근 가능
  const isOwner = useMemo(() => {
    if (!user || !tournament) return false;
    if (user.role === "admin" || user.role === "super_admin") return true;
    if (user.role === "organizer" && tournament.organizerId === user.id) return true;
    return false;
  }, [user, tournament]);

  // 접수 목록 조회
  const { data: regData, refetch: refetchRegs } = trpc.admin.tournamentRegistrations.useQuery(
    { tournamentId: tournamentId! },
    { enabled: !!tournamentId && isOwner }
  );

  // Mutations
  const updatePaymentMutation = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => { toast.success("입금 상태 변경 완료 (SMS 알림 전송됨)"); refetchRegs(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.admin.updateRegistrationStatus.useMutation({
    onSuccess: () => { toast.success("접수 상태 변경 완료"); refetchRegs(); },
    onError: (err: any) => toast.error(err.message),
  });

  // Excel export
  const handleExcelExport = async () => {
    if (!regData || regData.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }
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
          (reg as any).eventType ?? "",
          (reg as any).skillLevel ?? "",
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
      const tName = tournament?.name ?? "대회";
      XLSX.writeFile(wb, `${tName}_접수명단.xlsx`);
      toast.success("엑셀 파일이 다운로드되었습니다");
    } catch (err) {
      toast.error("엑셀 내보내기 실패");
    }
  };

  // Loading
  if (authLoading || tournamentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="w-12 h-12 text-red-300 mb-3" />
        <h2 className="text-base font-bold text-foreground mb-1">로그인 필요</h2>
        <p className="text-xs text-muted-foreground mb-4">접수 관리를 위해 로그인해주세요</p>
        <button onClick={() => navigate(`/login?returnTo=/tournament/${tournamentId}/manage`)} className="bg-primary text-foreground text-sm font-bold px-6 py-2.5 rounded-xl">
          로그인
        </button>
      </div>
    );
  }

  // Not allowed (not admin/organizer)
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

  // Not owner of this tournament (organizer trying to access other's tournament)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-ink text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="w-8 h-8 rounded-full bg-card/10 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">{tournament?.name ?? "대회"} - 접수 관리</h1>
          <p className="text-[10px] text-white/50">{user?.name ?? user?.email}</p>
        </div>
        <Badge className="bg-primary text-foreground text-[10px] font-bold">
          {user?.role === "organizer" ? "운영자" : "관리자"}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        <motion.div className="space-y-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          {/* Search + Export */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 소속, 전화번호, 접수번호 검색..."
                className="w-full pl-10 pr-3 py-2.5 bg-card rounded-xl text-xs text-foreground placeholder:text-muted-foreground border border-line-strong focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 bg-primary text-white text-[10px] font-bold px-3 py-2.5 rounded-xl hover:bg-optic-deep transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>

          {/* Stats */}
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

          {/* Registration List */}
          {!regData ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : filteredRegs.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "접수 내역이 없습니다"}
              </p>
            </div>
          ) : (
            filteredRegs.map((reg: any) => {
              const ps = paymentStatusConfig[reg.paymentStatus] || paymentStatusConfig.unpaid;
              const rs = regStatusConfig[reg.status] || regStatusConfig.pending;
              return (
                <div key={reg.id} className="bg-card rounded-xl p-4 border border-line-strong">
                  {/* Header Row */}
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

                  {/* Event Info */}
                  {((reg as any).eventType || (reg as any).skillLevel) && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Badge variant="outline" className="text-[8px] font-bold">{(reg as any).eventType}</Badge>
                      <Badge variant="outline" className="text-[8px]">{(reg as any).skillLevel}</Badge>
                    </div>
                  )}

                  {/* Players */}
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <span className="text-[9px] text-muted-foreground font-semibold">입금:</span>
                    <div className="flex gap-1">
                      {(["unpaid", "paid", "refunded"] as const).map(status => {
                        const cfg = paymentStatusConfig[status];
                        const isActive = reg.paymentStatus === status;
                        return (
                          <button
                            key={status}
                            onClick={() => !isActive && updatePaymentMutation.mutate({ registrationId: reg.id, paymentStatus: status })}
                            disabled={isActive || updatePaymentMutation.isPending}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                              isActive ? `${cfg.color} ring-1 ring-current` : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"
                            } disabled:opacity-60`}
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
                          <button
                            key={status}
                            onClick={() => !isActive && updateStatusMutation.mutate({ registrationId: reg.id, status })}
                            disabled={isActive || updateStatusMutation.isPending}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                              isActive ? `${cfg.color} ring-1 ring-current` : "bg-card text-muted-foreground border-line-strong hover:bg-ink-3"
                            } disabled:opacity-60`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SMS Notice for paid */}
                  {reg.paymentStatus === "paid" && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-primary bg-primary/10 rounded-md px-2 py-1">
                      <MessageSquare className="w-3 h-3" />
                      입금 확인 SMS가 발송되었습니다
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}
