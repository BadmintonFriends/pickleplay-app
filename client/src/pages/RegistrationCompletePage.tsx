import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Trophy,
  User,
  Calendar,
  Phone,
  CreditCard,
  Copy,
  ChevronRight,
  Loader2,
  Home,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function RegistrationCompletePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/tournament/:id/register/complete");
  const tournamentId = params?.id ? Number(params.id) : 0;

  // Get the latest registration for this tournament
  const registrationsQuery = trpc.registration.myRegistrations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const tournamentQuery = trpc.tournament.detail.useQuery(
    { id: tournamentId },
    { enabled: tournamentId > 0 }
  );

  if (authLoading) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const registrations = registrationsQuery.data ?? [];
  const latestReg = registrations.find((r: any) => r.tournamentId === tournamentId);
  const tournament = tournamentQuery.data;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("복사되었습니다");
    });
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen pb-10">
      <AppHeader />

      <div className="px-4 pt-4 space-y-4">
        {/* Success Banner */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-center text-white">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-bold mb-1">참가 신청 완료!</h1>
          <p className="text-sm text-green-100">
            대회 참가 신청이 정상적으로 접수되었습니다.
          </p>
        </div>

        {/* Registration Info */}
        {latestReg ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-[#C8E632]" />
                <h2 className="text-base font-bold text-[#1a1a2e]">접수 정보</h2>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">접수번호</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1a2e] font-mono">
                      {latestReg.registrationNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(latestReg.registrationNumber)}
                      className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <Copy className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">대회명</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">
                    {latestReg.tournamentName || tournament?.name || "-"}
                  </span>
                </div>

                <div className="border-t border-gray-200" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">종목</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">
                    {latestReg.eventType === "doubles" ? "복식" : "단식"}
                    {latestReg.skillLevel ? ` (${latestReg.skillLevel})` : ""}
                  </span>
                </div>

                <div className="border-t border-gray-200" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">접수 상태</span>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    입금대기
                  </Badge>
                </div>
              </div>

              {/* Players */}
              <div>
                <h3 className="text-sm font-bold text-[#1a1a2e] mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  참가 선수
                </h3>
                <div className="space-y-2">
                  {latestReg.players?.map((p: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C8E632]/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-[#1a1a2e]">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a2e]">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
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
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-gray-500">접수 정보를 불러오는 중입니다...</p>
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        {tournament?.bankInfo && (
          <Card className="border-0 shadow-sm rounded-2xl border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <h2 className="text-base font-bold text-[#1a1a2e]">입금 안내</h2>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">입금 계좌</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1a2e]">{tournament.bankInfo}</span>
                    <button
                      onClick={() => copyToClipboard(tournament.bankInfo!)}
                      className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors"
                    >
                      <Copy className="w-3 h-3 text-blue-600" />
                    </button>
                  </div>
                </div>
                {tournament.entryFee && (
                  <>
                    <div className="border-t border-blue-200" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">참가비</span>
                      <span className="text-sm font-bold text-[#1a1a2e]">{tournament.entryFee}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                참가비 입금 후 관리자 확인이 완료되면 참가가 확정됩니다.
                입금 시 <span className="font-medium">참가자 이름</span>으로 입금해주세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="w-full bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white h-12 rounded-xl"
          >
            <Trophy className="w-4 h-4 mr-2" />
            대회 상세 보기
          </Button>
          <Button
            onClick={() => navigate("/mypage")}
            variant="outline"
            className="w-full h-12 rounded-xl border-gray-300"
          >
            <User className="w-4 h-4 mr-2" />
            마이페이지에서 접수 내역 확인
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full h-12 rounded-xl text-gray-500"
          >
            <Home className="w-4 h-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
