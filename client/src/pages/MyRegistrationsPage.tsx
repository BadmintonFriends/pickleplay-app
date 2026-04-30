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
  pending: { label: "접수 대기", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  confirmed: { label: "접수 확정", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  cancelled: { label: "취소됨", icon: XCircle, color: "text-muted-foreground", bg: "bg-ink-3" },
};

const paymentMap: Record<string, { label: string; color: string; bg: string }> = {
  unpaid: { label: "미입금", color: "text-destructive", bg: "bg-destructive/10" },
  paid: { label: "입금완료", color: "text-primary", bg: "bg-primary/10" },
  refunded: { label: "환불", color: "text-muted-foreground", bg: "bg-ink-3" },
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
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">로그인이 필요합니다</h2>
          <p className="text-xs text-muted-foreground mb-6">접수 내역을 확인하려면 로그인해주세요</p>
          <button
            onClick={() => navigate("/login?returnTo=/my-registrations")}
            className="bg-primary text-foreground text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-optic-deep transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-8">
      <AppHeader />

      {/* Header */}
      <motion.div className="px-4 pt-1 pb-4 flex items-center gap-2" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-card flex items-center justify-center ">
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">내 접수 내역</h1>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : !registrations || registrations.length === 0 ? (
        <motion.div className="flex flex-col items-center justify-center py-16 px-6 text-center" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-bold text-muted-foreground">접수 내역이 없습니다</p>
          <p className="text-xs text-muted-foreground mt-1">대회에 참가 신청을 해보세요</p>
          <button
            onClick={() => navigate("/tournament")}
            className="mt-4 bg-primary text-foreground text-xs font-bold px-5 py-2 rounded-xl"
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
                className="bg-card rounded-2xl p-4  border border-line-strong"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 1}
              >
                {/* Registration Number & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{reg.registrationNumber}</span>
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

                {/* Tournament Name & Event */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-muted-foreground">대회 ID: {reg.tournamentId}</p>
                  {reg.eventType && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-full border-primary/30 text-primary">
                      {reg.eventType} {reg.skillLevel}
                    </Badge>
                  )}
                </div>

                {/* Players */}
                <div className="space-y-1.5 mt-2">
                  {reg.players?.map((p: any, pi: number) => (
                    <div key={p.id} className="flex items-center gap-2 bg-ink-3 rounded-lg px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{pi + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.phone} · {p.birthDate}</p>
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
                      className="flex-1 bg-muted text-secondary-foreground text-[10px] font-bold py-2 rounded-lg hover:bg-ink-3 transition-colors"
                    >
                      대회 상세
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("정말 접수를 취소하시겠습니까?")) {
                          cancelMutation.mutate({ id: reg.id });
                        }
                      }}
                      className="flex-1 bg-destructive/10 text-destructive text-[10px] font-bold py-2 rounded-lg hover:bg-destructive/20 transition-colors"
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
