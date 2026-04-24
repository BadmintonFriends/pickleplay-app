import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AppHeader from "@/components/AppHeader";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, Users, Trophy, ChevronRight,
  ExternalLink, FileText, Clock, AlertCircle, CheckCircle2,
  ChevronLeft, Image as ImageIcon, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "준비 중", color: "text-gray-600", bg: "bg-gray-100" },
  open: { label: "접수 중", color: "text-green-700", bg: "bg-green-100" },
  closed: { label: "접수 마감", color: "text-red-700", bg: "bg-red-100" },
  cancelled: { label: "취소됨", color: "text-gray-500", bg: "bg-gray-100" },
};

export default function TournamentDetailPage() {
  const [, params] = useRoute("/tournament/:id");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const tournamentId = Number(params?.id);
  const [posterIndex, setPosterIndex] = useState(0);

  const { data: tournament, isLoading } = trpc.tournament.detail.useQuery(
    { id: tournamentId },
    { enabled: !!tournamentId }
  );

  if (isLoading) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#C8E632] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-500">대회를 찾을 수 없습니다</p>
          <button onClick={() => navigate("/tournament")} className="mt-4 text-xs text-[#8BA61E] font-semibold">
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
      // 비로그인 사용자에게 로그인 안내 후 리다이렉트
      navigate(`/login?returnTo=/tournament/${tournamentId}/register`);
      return;
    }
    navigate(`/tournament/${tournamentId}/register`);
  };

  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader />

      {/* Back + Title */}
      <motion.div className="px-4 pt-1 pb-3 flex items-center gap-2" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <button onClick={() => navigate("/tournament")} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
          <ChevronLeft className="w-4 h-4 text-[#1a1a2e]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#1a1a2e] truncate">{tournament.name}</h1>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </motion.div>

      {/* Poster Carousel */}
      {tournament.posters && tournament.posters.length > 0 && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/5" }}>
            <img
              src={tournament.posters[posterIndex]?.imageUrl}
              alt={`포스터 ${posterIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {tournament.posters.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {tournament.posters.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setPosterIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === posterIndex ? "bg-white w-5" : "bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* Info Card */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C8E632]/15 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[#8BA61E]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">대회 일시</p>
              <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">
                {tournament.startDate === tournament.endDate
                  ? tournament.startDate
                  : `${tournament.startDate} ~ ${tournament.endDate}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">장소</p>
              <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">{tournament.venue}</p>
              <p className="text-xs text-gray-400 mt-0.5">{tournament.address}</p>
            </div>
          </div>

          {tournament.feePerTeam > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">참가비</p>
                <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">
                  팀당 {tournament.feePerTeam.toLocaleString()}원
                </p>
              </div>
            </div>
          )}

          {tournament.giftDescription && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">참가 기념품</p>
                <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">{tournament.giftDescription}</p>
                {sizeOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sizeOptions.map((s: string) => (
                      <span key={s} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* Organizer Info */}
      {organizerInfo && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {organizerInfo.hosts?.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-bold text-[#1a1a2e] mb-2">주최 · 주관</h3>
                <div className="space-y-1.5">
                  {organizerInfo.hosts.map((h: string) => (
                    <div key={h} className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-[#8BA61E]" />
                      <span className="text-xs font-medium text-gray-700">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {organizerInfo.sponsors?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#1a1a2e] mb-2">후원 · 협찬</h3>
                <div className="space-y-1.5">
                  {organizerInfo.sponsors.map((s: string) => (
                    <div key={s} className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-medium text-gray-700">{s}</span>
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">종목별 접수 현황</h3>
          {tournament.events.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">종목 정보가 아직 등록되지 않았습니다</p>
          ) : (
            <div className="space-y-3">
              {tournament.events.map((event: any) => {
                const pct = event.maxTeams > 0 ? Math.min((event.currentTeams / event.maxTeams) * 100, 100) : 0;
                const isFull = event.currentTeams >= event.maxTeams;
                return (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold border-[#C8E632] text-[#8BA61E]">
                          {event.eventType}
                        </Badge>
                        <span className="text-xs font-bold text-[#1a1a2e]">{event.skillLevel}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isFull ? "text-red-500" : "text-[#8BA61E]"}`}>
                        {event.currentTeams}/{event.maxTeams}팀
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {event.dayLabel && (
                      <p className="text-[10px] text-gray-400 mt-1">{event.dayLabel}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* Documents */}
      {tournament.documents && tournament.documents.length > 0 && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">공문 · 문서</h3>
            <div className="space-y-2">
              {tournament.documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <FileText className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1a2e] truncate">{doc.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {doc.fileSize > 0 ? `${(doc.fileSize / 1024 / 1024).toFixed(1)}MB` : "PDF"}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CTA: Register - 로그인 안내 포함 */}
      {tournament.status === "open" && (
        <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          {!isAuthenticated ? (
            <div className="space-y-2.5">
              <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2.5 border border-blue-100">
                <LogIn className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-800">참가 신청을 위해 로그인이 필요합니다</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    이미 계정이 있으시면 로그인, 처음이시면 회원가입을 진행해주세요.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/login?returnTo=/tournament/${tournamentId}/register`)}
                  className="bg-[#C8E632] text-[#1a1a2e] text-sm font-black py-3.5 rounded-xl hover:bg-[#b8d62a] transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </button>
                <button
                  onClick={() => navigate(`/register?returnTo=/tournament/${tournamentId}/register`)}
                  className="bg-[#1a1a2e] text-white text-sm font-black py-3.5 rounded-xl hover:bg-[#2a2a3e] transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Users className="w-4 h-4" />
                  회원가입
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleRegisterClick}
              className="w-full bg-[#C8E632] text-[#1a1a2e] text-sm font-black py-3.5 rounded-xl hover:bg-[#b8d62a] transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              참가 신청하기
            </button>
          )}
        </motion.section>
      )}

      {/* Location button */}
      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
        <button
          onClick={() => window.open(`https://map.naver.com/p/search/${encodeURIComponent(tournament.venue)}`, "_blank")}
          className="w-full bg-[#1a1a2e] text-white text-xs font-bold py-3 rounded-xl hover:bg-[#2a2a3e] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          장소 보기
        </button>
      </motion.section>
    </div>
  );
}
