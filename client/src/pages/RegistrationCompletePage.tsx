/*
 * RegistrationCompletePage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Trophy, User, Calendar, Phone,
  CreditCard, Copy, ChevronRight, Loader2, Home,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function RegistrationCompletePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/tournament/:id/register/complete");
  const tournamentId = params?.id ? Number(params.id) : 0;

  const registrationsQuery = trpc.registration.myRegistrations.useQuery(undefined, { enabled: isAuthenticated });
  const tournamentQuery = trpc.tournament.detail.useQuery({ id: tournamentId }, { enabled: tournamentId > 0 });

  if (authLoading) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const registrations = registrationsQuery.data ?? [];
  const latestReg = registrations.find((r: any) => r.tournamentId === tournamentId);
  const tournament = tournamentQuery.data;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("복사되었습니다"));
  };

  const bankInfoText = tournament
    ? [tournament.bankName, tournament.accountNumber, tournament.accountHolder].filter(Boolean).join(" ")
    : "";

  return (
    <div className="bg-background min-h-screen pb-10">
      <AppHeader />

      <div className="px-4 pt-4 space-y-4">
        {/* Success Banner */}
        <div className="bg-gradient-to-br from-court-green to-court-green/80 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-white opacity-90" />
          <h1 className="text-xl font-bold mb-1 text-white">참가 신청 완료!</h1>
          <p className="text-sm text-white/80">
            대회 참가 신청이 정상적으로 접수되었습니다.
          </p>
        </div>

        {/* Registration Info */}
        {latestReg ? (
          <Card className="border-line-strong bg-card rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">접수 정보</h2>
              </div>

              <div className="bg-ink-3 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">접수번호</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-mono">
                      {latestReg.registrationNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(latestReg.registrationNumber ?? "")}
                      className="w-6 h-6 rounded bg-ink flex items-center justify-center hover:bg-line-strong transition-colors"
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-line" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">대회명</span>
                  <span className="text-sm font-medium text-foreground">
                    {(latestReg as any).tournamentName || tournament?.name || "-"}
                  </span>
                </div>

                <div className="border-t border-line" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">종목</span>
                  <span className="text-sm font-medium text-foreground">
                    {(latestReg as any).eventType ?? ""}
                    {(latestReg as any).skillLevel ? ` (${(latestReg as any).skillLevel})` : ""}
                  </span>
                </div>

                <div className="border-t border-line" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">접수 상태</span>
                  <Badge className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                    입금대기
                  </Badge>
                </div>
              </div>

              {/* Players */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  참가 선수
                </h3>
                <div className="space-y-2">
                  {(latestReg as any).players?.map((p: any, idx: number) => (
                    <div key={idx} className="bg-ink-3 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{p.birthDate}</span>
                          <Phone className="w-3 h-3 ml-1" />
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : registrationsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-line-strong bg-card rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">접수 정보를 불러오는 중입니다...</p>
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        {bankInfoText && (
          <Card className="border-line-strong bg-card rounded-2xl border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">입금 안내</h2>
              </div>
              <div className="bg-primary/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-foreground">입금 계좌</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{bankInfoText}</span>
                    <button
                      onClick={() => copyToClipboard(bankInfoText)}
                      className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                    >
                      <Copy className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                </div>
                {tournament?.feePerTeam && tournament.feePerTeam > 0 && (
                  <>
                    <div className="border-t border-primary/20" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary-foreground">참가비</span>
                      <span className="text-sm font-bold text-foreground">
                        {tournament.feePerTeam.toLocaleString()}원
                      </span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                참가비 입금 후 관리자 확인이 완료되면 참가가 확정됩니다.
                입금 시 <span className="font-medium text-foreground">참가자 이름</span>으로 입금해주세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="w-full bg-primary hover:bg-optic-deep text-primary-foreground h-12 rounded-xl font-bold"
          >
            <Trophy className="w-4 h-4 mr-2" />
            대회 상세 보기
          </Button>
          <Button
            onClick={() => navigate("/mypage")}
            variant="outline"
            className="w-full h-12 rounded-xl border-line-strong text-secondary-foreground"
          >
            <User className="w-4 h-4 mr-2" />
            마이페이지에서 접수 내역 확인
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full h-12 rounded-xl text-muted-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
