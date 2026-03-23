/*
 * CourtsPage — PicklePlay 코트 화면
 * 디자인: Clean Sport Utility
 * - 검색바 + 필터 칩
 * - 히어로 지도 배너
 * - 코트 카드 목록 (슬롯, 가격, 평점, 라이브 용량)
 * - 파트너 매칭 CTA
 */
import AppHeader from "@/components/AppHeader";
import { Search, SlidersHorizontal, Star, MapPin, Navigation, Clock } from "lucide-react";
import { motion } from "framer-motion";

const HERO_COURTS = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/hero-courts-FbYNhChEfY5c4b7aad6Cn3.webp";
const INDOOR_COURT = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/indoor-court-iz6SgKFnxedoJfL48eVfzZ.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function CourtsPage() {
  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader showCart />

      {/* 검색바 */}
      <motion.div className="px-4 pb-2" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="코트 또는 지역 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8E632]/50 focus:border-[#C8E632] transition-all"
          />
        </div>
      </motion.div>

      {/* 필터 칩 */}
      <motion.div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <button className="flex items-center gap-1.5 bg-[#C8E632] text-[#1a1a2e] text-xs font-semibold px-3.5 py-2 rounded-full whitespace-nowrap shadow-sm">
          <SlidersHorizontal className="w-3.5 h-3.5" /> 필터
        </button>
        <button className="bg-white text-gray-600 text-xs font-medium px-3.5 py-2 rounded-full border border-gray-200 whitespace-nowrap hover:border-gray-400 transition-colors">
          실력: 3.0 - 4.5
        </button>
        <button className="bg-white text-gray-600 text-xs font-medium px-3.5 py-2 rounded-full border border-gray-200 whitespace-nowrap hover:border-gray-400 transition-colors">
          거리: 5km 이내
        </button>
      </motion.div>

      {/* 히어로 지도 배너 */}
      <motion.div className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="relative rounded-2xl overflow-hidden h-44">
          <img src={HERO_COURTS} alt="주변 코트" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-3.5 left-3.5 text-white">
            <h2 className="text-lg font-bold leading-tight">주변 활성 코트</h2>
            <p className="text-[11px] text-white/80 mt-0.5">서울시 내 12개 코트 발견</p>
          </div>
          <button className="absolute bottom-3.5 right-3.5 bg-[#C8E632] text-[#1a1a2e] text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#bdd62e] transition-colors flex items-center gap-1.5 shadow-md">
            <MapPin className="w-4 h-4" />
            지도 보기
          </button>
        </div>
      </motion.div>

      {/* 코트 카드 1 - 더키친클럽 */}
      <motion.section className="px-4 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                  인기
                </span>
                <span className="text-[11px] text-gray-400">0.8 km</span>
              </div>
              <h3 className="text-base font-bold text-[#1a1a2e]">더 키친 클럽</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> 서울시 강남구
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-[#1a1a2e]">
                ₩24,000<span className="text-[10px] font-normal text-gray-400">/시간</span>
              </p>
              <div className="flex items-center gap-0.5 justify-end mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-[#1a1a2e]">4.9</span>
              </div>
            </div>
          </div>

          {/* 오늘 가능 시간 */}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-2">
            오늘 예약 가능
          </p>
          <div className="flex gap-2 mb-3.5">
            {[
              { time: "오전 10:00", courts: "3코트", active: false },
              { time: "오전 11:30", courts: "1코트 남음", active: true },
              { time: "오후 2:00", courts: "5코트", active: false },
            ].map((slot) => (
              <button
                key={slot.time}
                className={`flex flex-col items-center px-3 py-2 rounded-xl text-center border transition-all ${
                  slot.active
                    ? "bg-[#1a1a2e] text-white border-[#1a1a2e] shadow-md"
                    : "bg-gray-50 text-[#1a1a2e] border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="text-xs font-bold">{slot.time}</span>
                <span className={`text-[10px] mt-0.5 ${slot.active ? "text-white/70" : "text-gray-400"}`}>
                  {slot.courts}
                </span>
              </button>
            ))}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a2e] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#2a2a3e] transition-colors">
              <Search className="w-3.5 h-3.5" /> 매치 찾기
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[#1a1a2e] text-xs font-semibold py-2.5 rounded-xl border-2 border-[#1a1a2e] hover:bg-gray-50 transition-colors">
              코트 예약
            </button>
          </div>
        </div>
      </motion.section>

      {/* 코트 카드 2 - 선셋파크 */}
      <motion.section className="px-4 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                  공공
                </span>
                <span className="text-[11px] text-gray-400">2.4 km</span>
              </div>
              <h3 className="text-base font-bold text-[#1a1a2e]">선셋파크 코트</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> 서울시 마포구
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-green-600">무료</p>
              <div className="flex items-center gap-0.5 justify-end mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-[#1a1a2e]">4.2</span>
              </div>
            </div>
          </div>

          {/* 실시간 혼잡도 */}
          <div className="bg-gray-50 rounded-xl p-3 mt-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">실시간 혼잡도</span>
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">혼잡</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-1.5">
              <div
                className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: "78%" }}
              />
            </div>
            <p className="text-[10px] text-gray-400">
              예상 대기시간: <span className="font-bold text-[#1a1a2e]">25분</span>
            </p>
          </div>

          <button className="w-full flex items-center justify-center gap-1.5 bg-white text-[#1a1a2e] text-xs font-semibold py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <Navigation className="w-3.5 h-3.5" /> 길찾기
          </button>
        </div>
      </motion.section>

      {/* 코트 카드 3 - 딩크돔 */}
      <motion.section className="px-4 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <img src={INDOOR_COURT} alt="딩크돔 실내" className="w-full h-36 object-cover" />
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-[#1a1a2e]">딩크돔 실내</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> 서울시 송파구 · 4.1 km
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 mb-3">
              {["실내", "에어컨", "프로샵"].map((tag) => (
                <span key={tag} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-lg font-bold text-[#1a1a2e] mb-3">
              ₩35,000<span className="text-xs font-normal text-gray-400">/시간</span>
            </p>
            <button className="w-full bg-[#C8E632] text-[#1a1a2e] text-xs font-bold py-2.5 rounded-xl hover:bg-[#bdd62e] transition-colors">
              예약 가능 확인
            </button>
          </div>
        </div>
      </motion.section>

      {/* 파트너 매칭 CTA */}
      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <div className="bg-[#1a1a2e] rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-[#C8E632] leading-tight">
            파트너를 찾고
            <br />
            계신가요?
          </h3>
          <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
            PicklePlay 매칭 풀에 참여하세요.
            <br />
            같은 DUPR 레이팅의 선수와
            <br />
            원하는 시간에 매칭해드립니다.
          </p>
          <button className="mt-4 bg-[#C8E632] text-[#1a1a2e] text-sm font-bold px-7 py-3 rounded-full hover:bg-[#bdd62e] transition-colors uppercase tracking-wide">
            지금 매치 찾기
          </button>
        </div>
      </motion.section>
    </div>
  );
}
