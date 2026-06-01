/*
 * TournamentPage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트
 */
import AppHeader from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";
import { Calendar, MapPin, Clock, Trophy, ExternalLink, CheckCircle2, Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const INDOOR_COURT = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/indoor-court-iz6SgKFnxedoJfL48eVfzZ.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function TournamentPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: tournaments, isLoading } = trpc.tournament.list.useQuery();

  const handleRegisterClick = (tournamentId: number) => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/tournament/${tournamentId}/register`);
      return;
    }
    navigate(`/tournament/${tournamentId}/register`);
  };

  return (
    <div className="bg-background min-h-screen">
      <AppHeader />

      {/* 페이지 타이틀 */}
      <motion.div className="px-5 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1
          className="text-xl text-foreground"
          style={{ fontFamily: "'Archivo Black', sans-serif", fontStyle: "italic", textTransform: "uppercase", letterSpacing: "-0.02em" }}
        >
          TOURNAMENT<span className="text-primary">.</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">전국 피클볼 대회 일정을 확인하세요</p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* 대회 카드 목록 */}
          {tournaments && tournaments.length > 0 ? (
            tournaments.map((t: any, idx: number) => (
              <motion.section
                key={t.id}
                className="px-4 pb-4"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 1}
              >
                <div className="bg-card rounded-2xl overflow-hidden border border-line-strong">
                  {/* 대회 이미지 */}
                  <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                    <img src={t.posterUrl || INDOOR_COURT} alt={t.name} className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                        공식 대회
                      </span>
                      {t.status === "open" && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                          접수 중
                        </span>
                      )}
                      {t.status === "bracket_published" && (
                        <span className="text-[10px] font-bold bg-blue-500 text-white px-2.5 py-1 rounded-full">
                          대진표 공개
                        </span>
                      )}
                      {t.status === "in_progress" && (
                        <span className="text-[10px] font-bold bg-purple-500 text-white px-2.5 py-1 rounded-full">
                          진행중
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h2 className="text-lg font-extrabold text-white leading-tight">{t.name}</h2>
                    </div>
                  </div>

                  {/* 대회 상세 정보 */}
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Calendar className="w-4 h-4 text-primary" strokeWidth={2.2} />
                        </div>
                        <div>
                          <p className="text-overline text-muted-foreground">대회 일시</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {t.startDate === t.endDate ? t.startDate : `${t.startDate} ~ ${t.endDate}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4 text-primary" strokeWidth={2.2} />
                        </div>
                        <div>
                          <p className="text-overline text-muted-foreground">장소</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{t.venue}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.address}</p>
                        </div>
                      </div>

                      {t.status === "open" && (
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-primary" strokeWidth={2.2} />
                          </div>
                          <div>
                            <p className="text-overline text-muted-foreground">참가 신청</p>
                            <p className="text-sm font-bold text-primary mt-0.5">접수 중</p>
                            <p className="text-xs text-muted-foreground mt-0.5">지금 바로 참가 신청하세요!</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CTA 버튼 */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => navigate(`/tournament/${t.id}`)}
                        className="flex-1 bg-secondary text-secondary-foreground text-xs font-bold py-3 rounded-xl hover:bg-ink-3 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        상세 보기
                      </button>
                      {t.status === "open" && (
                        <button
                          onClick={() => handleRegisterClick(t.id)}
                          className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-3 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          {isAuthenticated ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> 참가 신청</>
                          ) : (
                            <><LogIn className="w-3.5 h-3.5" /> 로그인 후 신청</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" strokeWidth={2.2} />
              <p className="text-xs text-muted-foreground">등록된 대회가 없습니다</p>
            </div>
          )}

          {/* 더 많은 대회 예정 */}
          <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <div className="bg-card rounded-2xl p-5 text-center border border-dashed border-line-strong">
              <div className="w-14 h-14 rounded-full bg-ink-3 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-muted-foreground" strokeWidth={2.2} />
              </div>
              <h3 className="text-sm font-bold text-muted-foreground">더 많은 대회가 준비 중입니다</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                전국 각지의 피클볼 대회 정보를
                <br />
                계속 업데이트할 예정입니다.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Clock className="w-3.5 h-3.5" />
                새로운 대회를 기대해주세요
              </div>
            </div>
          </motion.section>
        </>
      )}
    </div>
  );
}
