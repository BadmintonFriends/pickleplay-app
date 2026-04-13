/*
 * TournamentPage — PicklePlay 대회 화면
 * 디자인: Clean Sport Utility
 * - 리닝코리아 포항 전국 피클볼 대회 정보
 * - 4월 중 참가신청 오픈 예정
 * - 향후 더 많은 대회 커밍쑨
 */
import AppHeader from "@/components/AppHeader";
import { Calendar, MapPin, Clock, Users, Trophy, Bell, ChevronRight, ExternalLink, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const TOURNAMENT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/tournament-banner-LBX7yPMXvLrn8gFavKRakn.webp";
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
  const handleNotify = () => {
    toast.success("알림 신청이 완료되었습니다!", {
      description: "참가신청 오픈 시 알려드리겠습니다.",
    });
  };

  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader />

      {/* 페이지 타이틀 */}
      <motion.div className="px-4 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl font-bold text-[#1a1a2e]">대회</h1>
        <p className="text-xs text-gray-400 mt-0.5">전국 피클볼 대회 일정을 확인하세요</p>
      </motion.div>

      {/* 메인 대회 카드 - 리닝코리아 포항 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* 대회 이미지 */}
          <div className="relative h-44 overflow-hidden">
            <img src={INDOOR_COURT} alt="만인당실내체육관" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/70 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 flex gap-1.5">
              <span className="text-[10px] font-bold bg-[#C8E632] text-[#1a1a2e] px-2.5 py-1 rounded-full">
                공식 대회
              </span>
              <span className="text-[10px] font-bold bg-white/90 text-[#1a1a2e] px-2.5 py-1 rounded-full">
                전국 규모
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <h2 className="text-lg font-black text-white leading-tight">
                리닝코리아 포항 전국
                <br />
                피클볼 대회
              </h2>
            </div>
          </div>

          {/* 대회 상세 정보 */}
          <div className="p-4">
            {/* 정보 항목들 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C8E632]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-[#8BA61E]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">대회 일시</p>
                  <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">2026년 6월 14일 (일)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">장소</p>
                  <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">만인당실내체육관</p>
                  <p className="text-xs text-gray-400 mt-0.5">경북 포항시 남구 희망대로 814</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">참가 신청</p>
                  <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">4월 중 오픈 예정</p>
                  <p className="text-xs text-gray-400 mt-0.5">상세 일정은 추후 공지됩니다</p>
                </div>
              </div>
            </div>

            {/* 참가신청 상태 배너 */}
            <div className="mt-4 bg-amber-50 border border-amber-200/50 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-800">참가신청 준비 중</p>
                <p className="text-[11px] text-amber-600 mt-0.5">4월 중 참가신청이 오픈됩니다</p>
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="mt-4">
              <button
                onClick={() => {
                  window.open("https://map.naver.com/p/search/만인당실내체육관", "_blank");
                }}
                className="w-full bg-[#1a1a2e] text-white text-xs font-bold py-3 rounded-xl hover:bg-[#2a2a3e] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                장소 보기
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 주최/주관 */}
      <motion.section className="px-4 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">주최 · 주관</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1a1a2e]">리닝코리아</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C8E632]/15 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#8BA61E]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1a1a2e]">포항 전국 피클볼 조직 위원회</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 후원/협찬 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">후원 · 협찬</h3>
          <div className="space-y-2.5">
            {[
              "포항시 체육회",
              "대한피클볼 협회",
              "포항시 피클볼 협회",
              "포항 피클볼 클럽",
            ].map((name) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xs font-bold text-[#1a1a2e]">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* 더 많은 대회 커밍쑨 */}
      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
        <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-5 text-center border border-gray-200/50 border-dashed">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Trophy className="w-6 h-6 text-gray-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-500">더 많은 대회가 준비 중입니다</h3>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            전국 각지의 피클볼 대회 정보를
            <br />
            6월 정식 오픈과 함께 제공할 예정입니다.
          </p>
          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8BA61E]">
            <Clock className="w-3.5 h-3.5" />
            2026년 6월 오픈 예정
          </div>
        </div>
      </motion.section>
    </div>
  );
}
