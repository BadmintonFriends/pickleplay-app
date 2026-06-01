/*
 * TournamentDetailPage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, Users, Trophy, ChevronRight,
  ExternalLink, FileText, Clock, AlertCircle, CheckCircle2,
  ChevronLeft, Image as ImageIcon, LogIn, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { getEventColor } from "@/lib/eventColors";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "준비 중", color: "text-muted-foreground", bg: "bg-muted" },
  open: { label: "접수 중", color: "text-primary", bg: "bg-primary/20" },
  closed: { label: "접수 마감", color: "text-destructive", bg: "bg-destructive/20" },
  bracket_published: { label: "대진표 공개", color: "text-blue-700", bg: "bg-blue-100" },
  in_progress: { label: "대회 진행중", color: "text-purple-700", bg: "bg-purple-100" },
  cancelled: { label: "취소됨", color: "text-muted-foreground", bg: "bg-muted" },
};

export default function TournamentDetailPage() {
  const [, params] = useRoute("/tournament/:id");
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const tournamentId = Number(params?.id);
  const [posterIndex, setPosterIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const { data: tournament, isLoading } = trpc.tournament.detail.useQuery(
    { id: tournamentId },
    { enabled: !!tournamentId }
  );

  const isRoleAdmin = user?.role === "admin" || user?.role === "super_admin";
  const { data: managedTournamentIds } = trpc.admin.getUserManagedTournaments.useQuery(
    undefined,
    { enabled: isAuthenticated && !isRoleAdmin }
  );
  const canManage = isRoleAdmin || (managedTournamentIds?.includes(tournamentId) ?? false);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" strokeWidth={2.2} />
          <p className="text-sm font-bold text-muted-foreground">대회를 찾을 수 없습니다</p>
          <button onClick={() => navigate("/tournament")} className="mt-4 text-xs text-primary font-semibold">
            대회 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[tournament.status] ?? statusConfig.draft;
  const organizerInfo = tournament.organizerInfo ? JSON.parse(tournament.organizerInfo) : null;
  const sizeOptions: string[] = tournament.sizeOptions ? JSON.parse(tournament.sizeOptions) : [];

  const handleRegisterClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/tournament/${tournamentId}/register`);
      return;
    }
    navigate(`/tournament/${tournamentId}/register`);
  };

  return (
    <div className="bg-background">
      <AppHeader />

      {/* Back + Title */}
      <motion.div className="px-4 pt-1 pb-3 flex items-center gap-2" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <button onClick={() => navigate("/tournament")} className="w-8 h-8 rounded-full bg-card border border-line-strong flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-foreground truncate">{tournament.name}</h1>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </motion.div>

      {/* Poster Carousel */}
      {tournament.posters && tournament.posters.length > 0 && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            style={{ aspectRatio: "4/5" }}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={tournament.posters[posterIndex]?.imageUrl}
              alt={`포스터 ${posterIndex + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              크게 보기
            </div>
            {tournament.posters.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {tournament.posters.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setPosterIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === posterIndex ? "bg-primary w-5" : "bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* 대진표 확인 + 심판 로그인 버튼 */}
      {(tournament.status === "bracket_published" || tournament.status === "in_progress") && (
        <motion.section className="px-4 pb-2 space-y-2" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}/bracket`)}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-blue-600 transition-colors active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            대진표 확인
          </button>
          {tournament.status === "in_progress" && isAuthenticated && (
            <button
              onClick={() => navigate(`/tournament/${tournamentId}/referee/login`)}
              className="w-full flex items-center justify-center gap-2 bg-card border border-line-strong text-foreground font-bold text-sm py-3.5 rounded-2xl hover:border-primary transition-colors active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              심판 로그인
            </button>
          )}
        </motion.section>
      )}

      {/* Info Card */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-card rounded-2xl p-4 border border-line-strong space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-overline text-muted-foreground">대회 일시</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {tournament.startDate === tournament.endDate
                  ? tournament.startDate
                  : `${tournament.startDate} ~ ${tournament.endDate}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-overline text-muted-foreground">장소</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{tournament.venue}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tournament.address}</p>
            </div>
          </div>

          {tournament.feePerTeam > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-primary" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-overline text-muted-foreground">참가비</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  팀당 {tournament.feePerTeam.toLocaleString()}원
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  입금은 팀 단위로, 입금자명에 파트너 2명 이름 모두 기재<br/>
                  (예: 홍길동김철수)
                </p>
              </div>
            </div>
          )}

          {tournament.giftDescription && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-primary" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-overline text-muted-foreground">참가 기념품</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{tournament.giftDescription}</p>
                {sizeOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sizeOptions.map((s: string) => (
                      <span key={s} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
                {tournament.sizeGuideImageUrl && (
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[10px] text-primary font-semibold hover:underline mt-1.5 flex items-center gap-1"
                  >
                    사이즈표 보기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* Organizer Info */}
      {organizerInfo && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="bg-card rounded-2xl p-4 border border-line-strong">
            {organizerInfo.hosts?.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-bold text-foreground mb-2">주최 · 주관</h3>
                <div className="space-y-1.5">
                  {organizerInfo.hosts.map((h: string) => (
                    <div key={h} className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-primary" strokeWidth={2.2} />
                      <span className="text-xs font-medium text-secondary-foreground">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {organizerInfo.sponsors?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">후원 · 협찬</h3>
                <div className="space-y-1.5">
                  {organizerInfo.sponsors.map((s: string) => (
                    <div key={s} className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.2} />
                      <span className="text-xs font-medium text-secondary-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* Events & Registration Status */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
        <div className="bg-card rounded-2xl p-4 border border-line-strong">
          <h3 className="text-sm font-bold text-foreground mb-3">종목별 접수 현황</h3>
          {tournament.events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">종목 정보가 아직 등록되지 않았습니다</p>
          ) : (
            <div className="space-y-3">
              {tournament.events.map((event: any) => {
                const pct = event.maxTeams > 0 ? Math.min((event.currentTeams / event.maxTeams) * 100, 100) : 0;
                const isFull = event.currentTeams >= event.maxTeams;
                const ec = getEventColor(event.eventType);
                return (
                  <div key={event.id} className={`p-3 rounded-xl ${ec.bgSubtle} border ${ec.border}/30`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold ${ec.border} ${ec.text}`}>
                          {event.eventType}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">{event.skillLevel}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isFull ? "text-destructive" : ec.text}`}>
                        {event.currentTeams}/{event.maxTeams}팀
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {event.dayLabel && (
                      <p className="text-[10px] text-muted-foreground mt-1">{event.dayLabel}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* Official Document Link */}
      {tournament.officialDocUrl && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <a
            href={tournament.officialDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-line-strong hover:bg-muted transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">대회 공문 보기</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">공식 대회 요강 및 세부 규정 확인</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        </motion.section>
      )}

      {/* Documents */}
      {tournament.documents && tournament.documents.length > 0 && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <div className="bg-card rounded-2xl p-4 border border-line-strong">
            <h3 className="text-sm font-bold text-foreground mb-3">공문 · 문서</h3>
            <div className="space-y-2">
              {tournament.documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-ink-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <FileText className="w-5 h-5 text-destructive shrink-0" strokeWidth={2.2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{doc.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.fileSize > 0 ? `${(doc.fileSize / 1024 / 1024).toFixed(1)}MB` : "PDF"}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CTA: Register */}
      {tournament.status === "open" && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          {!isAuthenticated ? (
            <div className="space-y-2.5">
              <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2.5 border border-primary/20">
                <LogIn className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">참가 신청을 위해 로그인이 필요합니다</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    이미 계정이 있으시면 로그인, 처음이시면 회원가입을 진행해주세요.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/login?returnTo=/tournament/${tournamentId}/register`)}
                  className="bg-primary text-primary-foreground text-sm font-extrabold py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </button>
                <button
                  onClick={() => navigate(`/register?returnTo=/tournament/${tournamentId}/register`)}
                  className="bg-secondary text-secondary-foreground text-sm font-extrabold py-3.5 rounded-xl hover:bg-ink-3 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Users className="w-4 h-4" />
                  회원가입
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleRegisterClick}
              className="w-full bg-primary text-primary-foreground text-sm font-extrabold py-3.5 rounded-xl hover:bg-optic-deep transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              참가 신청하기
            </button>
          )}
        </motion.section>
      )}

      {/* Manage button - only for organizer/admin */}
      {isAuthenticated && canManage && (
        <motion.section className="px-4 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <button
            onClick={() => navigate(`/tournament/${tournamentId}/manage`)}
            className="w-full bg-ink text-white text-xs font-bold py-3 rounded-xl hover:bg-ink-3 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] border border-line-strong"
          >
            <Users className="w-3.5 h-3.5" />
            접수 관리
          </button>
        </motion.section>
      )}

      {/* Location button */}
      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
        <button
          onClick={() => window.open(`https://map.naver.com/p/search/${encodeURIComponent(tournament.venue)}`, "_blank")}
          className="w-full bg-secondary text-secondary-foreground text-xs font-bold py-3 rounded-xl hover:bg-ink-3 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          장소 보기
        </button>
      </motion.section>

      {/* Poster Lightbox Modal */}
      {lightboxOpen && tournament.posters && tournament.posters.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>

          {/* Counter */}
          {tournament.posters.length > 1 && (
            <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {posterIndex + 1} / {tournament.posters.length}
            </div>
          )}

          {/* Image */}
          <img
            src={tournament.posters[posterIndex]?.imageUrl}
            alt={`\ud3ec\uc2a4\ud130 ${posterIndex + 1}`}
            className="max-w-[95vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Prev/Next buttons */}
          {tournament.posters.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setPosterIndex((prev: number) => (prev - 1 + tournament.posters.length) % tournament.posters.length); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPosterIndex((prev: number) => (prev + 1) % tournament.posters.length); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Size Guide Modal */}
      {sizeGuideOpen && tournament.sizeGuideImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSizeGuideOpen(false)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSizeGuideOpen(false)}
              className="absolute -top-3 -right-3 bg-foreground text-background rounded-full p-1.5 shadow-lg z-10 hover:opacity-80 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={tournament.sizeGuideImageUrl}
              alt="사이즈표"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
