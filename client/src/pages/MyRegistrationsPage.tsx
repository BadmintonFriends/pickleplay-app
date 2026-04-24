import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AppHeader from "@/components/AppHeader";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  Clock, XCircle, CreditCard, Loader2, Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

const statusMap: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "접수 대기", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  confirmed: { label: "접수 확정", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  cancelled: { label: "취소됨", icon: XCircle, color: "text-gray-400", bg: "bg-gray-50" },
};

const paymentMap: Record<string, { label: string; color: string; bg: string }> = {
  unpaid: { label: "미입금", color: "text-red-600", bg: "bg-red-50" },
  paid: { label: "입금완료", color: "text-green-600", bg: "bg-green-50" },
  refunded: { label: "환불", color: "text-gray-500", bg: "bg-gray-50" },
};

export default function MyRegistrationsPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { data: registrations, isLoading, refetch } = trpc.registration.myRegistrations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const cancelMutation = trpc.registration.cancel.useMutation({
    onSuccess: () => {
      toast.success("접수가 취소되었습니다");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#C8E632] animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C8E632]/15 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-[#8BA61E]" />
          </div>
          <h2 className="text-base font-bold text-[#1a1a2e] mb-1">로그인이 필요합니다</h2>
          <p className="text-xs text-gray-400 mb-6">접수 내역을 확인하려면 로그인해주세요</p>
          <button
            onClick={() => navigate("/login?returnTo=/my-registrations")}
            className="bg-[#C8E632] text-[#1a1a2e] text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-[#b8d62a] transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] min-h-screen pb-8">
      <AppHeader />

      {/* Header */}
      <motion.div className="px-4 pt-1 pb-4 flex items-center gap-2" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
          <ChevronLeft className="w-4 h-4 text-[#1a1a2e]" />
        </button>
        <h1 className="text-lg font-bold text-[#1a1a2e]">내 접수 내역</h1>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#C8E632] animate-spin" />
        </div>
      ) : !registrations || registrations.length === 0 ? (
        <motion.div className="flex flex-col items-center justify-center py-16 px-6 text-center" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <AlertCircle className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm font-bold text-gray-400">접수 내역이 없습니다</p>
          <p className="text-xs text-gray-300 mt-1">대회에 참가 신청을 해보세요</p>
          <button
            onClick={() => navigate("/tournament")}
            className="mt-4 bg-[#C8E632] text-[#1a1a2e] text-xs font-bold px-5 py-2 rounded-xl"
          >
            대회 둘러보기
          </button>
        </motion.div>
      ) : (
        <div className="px-4 space-y-3">
          {registrations.map((reg: any, idx: number) => {
            const st = statusMap[reg.status] ?? statusMap.pending;
            const pay = paymentMap[reg.paymentStatus] ?? paymentMap.unpaid;
            const StIcon = st.icon;
            return (
              <motion.div
                key={reg.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 1}
              >
                {/* Registration Number & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-400">{reg.registrationNumber}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pay.bg} ${pay.color}`}>
                      {pay.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex items-center gap-1`}>
                      <StIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Tournament Name */}
                <p className="text-xs text-gray-400 mb-1">대회 ID: {reg.tournamentId}</p>

                {/* Players */}
                <div className="space-y-1.5 mt-2">
                  {reg.players?.map((p: any, pi: number) => (
                    <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-[#C8E632]/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#8BA61E]">{pi + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1a1a2e]">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.phone} · {p.birthDate}</p>
                      </div>
                      {p.giftSize && (
                        <Badge variant="outline" className="text-[9px]">{p.giftSize}</Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {reg.status !== "cancelled" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/tournament/${reg.tournamentId}`)}
                      className="flex-1 bg-gray-100 text-gray-600 text-[10px] font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      대회 상세
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("정말 접수를 취소하시겠습니까?")) {
                          cancelMutation.mutate({ id: reg.id });
                        }
                      }}
                      className="flex-1 bg-red-50 text-red-500 text-[10px] font-bold py-2 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      접수 취소
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
