/*
 * HomePage — PicklePlay 홈 화면
 * 디자인: Clean Sport Utility
 * - 인사말 + 다음 경기 카드
 * - 빠른 메뉴 (코트 예약, 매치 찾기, 장비 쇼핑)
 * - 라이브 코트 현황
 * - 커뮤니티 하이라이트
 */
import AppHeader from "@/components/AppHeader";
import { MapPin, Clock, Search, Plus, ShoppingBag, ChevronRight, MessageSquare, ThumbsUp, Navigation } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const HERO_COURTS = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/hero-courts-FbYNhChEfY5c4b7aad6Cn3.webp";
const COMMUNITY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/community-league-MVrak7nsqS83bUFUbbzaTT.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function HomePage() {
  const [, navigate] = useLocation();

  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader showCart />

      {/* 인사말 섹션 */}
      <motion.section
        className="px-4 pt-2 pb-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
      >
        <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">안녕하세요, 민수님</p>
        <h1 className="text-[26px] font-bold text-[#1a1a2e] leading-tight mt-0.5">
          다음 경기
          <br />
          <span className="text-[#8ab500] italic">준비되셨나요?</span>
        </h1>
      </motion.section>

      {/* 다음 경기 카드 */}
      <motion.section
        className="px-4 pb-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
      >
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-3">
            <span className="inline-flex items-center gap-1 bg-[#C8E632] text-[#1a1a2e] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              <span className="w-1.5 h-1.5 bg-[#1a1a2e] rounded-full animate-pulse" />
              예정된 경기
            </span>
            <h3 className="text-lg font-bold text-[#1a1a2e] mt-2.5">단식 대결</h3>
            <p className="text-sm text-gray-500 mt-0.5">vs. 김태현 &ldquo;The Wall&rdquo;</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">시간</p>
                <p className="text-sm font-semibold text-[#1a1a2e]">오늘, 오후 4:30</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">코트</p>
                <p className="text-sm font-semibold text-[#1a1a2e]">04번 코트 (센터)</p>
              </div>
            </div>
            <button className="mt-1 bg-[#1a1a2e] text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-[#2a2a3e] transition-colors flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              길찾기
            </button>
          </div>
        </div>
      </motion.section>

      {/* 빠른 메뉴 */}
      <section className="px-4 pb-4 space-y-2.5">
        {[
          {
            icon: Plus,
            title: "코트 예약",
            desc: "가까운 코트를 찾아 예약하세요",
            bg: "bg-[#C8E632]",
            hoverBg: "hover:bg-[#bdd62e]",
            iconBg: "bg-white/40",
            path: "/courts",
            delay: 2,
          },
          {
            icon: Search,
            title: "매치 찾기",
            desc: "비슷한 실력의 상대를 매칭해드려요",
            bg: "bg-[#d4e5f7]",
            hoverBg: "hover:bg-[#c4d5e7]",
            iconBg: "bg-white/50",
            path: "/matches",
            delay: 3,
          },
          {
            icon: ShoppingBag,
            title: "장비 쇼핑",
            desc: "프로가 사용하는 장비를 만나보세요",
            bg: "bg-[#fde68a]",
            hoverBg: "hover:bg-[#fcd34d]",
            iconBg: "bg-white/50",
            path: "/shop",
            delay: 4,
          },
        ].map((item) => (
          <motion.button
            key={item.title}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-start gap-3 ${item.bg} rounded-2xl p-4 ${item.hoverBg} transition-colors text-left active:scale-[0.98]`}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={item.delay}
          >
            <div className={`w-8 h-8 ${item.iconBg} rounded-full flex items-center justify-center shrink-0`}>
              <item.icon className="w-4 h-4 text-[#1a1a2e]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1a2e]">{item.title}</p>
              <p className="text-xs text-[#1a1a2e]/60 mt-0.5">{item.desc}</p>
            </div>
          </motion.button>
        ))}
      </section>

      {/* 라이브 코트 현황 */}
      <motion.section
        className="px-4 pb-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={5}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#1a1a2e]">실시간 코트 현황</h2>
            <p className="text-xs text-gray-400 mt-0.5">선셋파크 피클볼장</p>
          </div>
          <button
            onClick={() => navigate("/courts")}
            className="text-xs font-semibold text-gray-500 flex items-center gap-0.5 hover:text-[#1a1a2e] transition-colors"
          >
            전체보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {[
            { num: "01", name: "북쪽 코트", next: "오후 2:00", open: true },
            { num: "02", name: "북쪽 코트", next: "오후 3:30", open: false },
            { num: "03", name: "남쪽 코트", next: "오후 4:00", open: true },
            { num: "04", name: "센터 코트", next: "오후 5:00", open: false },
          ].map((court) => (
            <div
              key={court.num}
              className="min-w-[130px] bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-[#1a1a2e]">{court.num}</span>
                {court.open && (
                  <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase">
                    OPEN
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-[#1a1a2e]">{court.name}</p>
              <p className="text-[10px] text-gray-400 mt-1">다음: {court.next}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 커뮤니티 하이라이트 */}
      <section className="px-4 pb-6">
        <h2 className="text-base font-bold text-[#1a1a2e] mb-3">커뮤니티 하이라이트</h2>

        {/* 리그 업데이트 */}
        <motion.div
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-3"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={6}
        >
          <img
            src={HERO_COURTS}
            alt="시티 오픈 대회"
            className="w-full h-40 object-cover"
          />
          <div className="p-3.5">
            <span className="text-[10px] font-bold bg-[#C8E632] text-[#1a1a2e] px-2 py-0.5 rounded-full uppercase">
              리그 소식
            </span>
            <h3 className="text-sm font-bold text-[#1a1a2e] mt-2">
              시티 오픈 등록이 월요일에 시작됩니다!
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              이번 시즌 최대 규모 대회에 200명 이상의 선수가 참가합니다.
            </p>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> 42 댓글
              </span>
            </div>
          </div>
        </motion.div>

        {/* 프로 팁 */}
        <motion.div
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={7}
        >
          <img
            src={COMMUNITY_IMG}
            alt="프로 팁"
            className="w-full h-40 object-cover"
          />
          <div className="p-3.5">
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase">
              프로 팁
            </span>
            <h3 className="text-sm font-bold text-[#1a1a2e] mt-2">
              키친 라인 마스터하기
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              코치 사라가 네트 앞에서 공격적으로 플레이하는 비법을 공유합니다.
            </p>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" /> 128 좋아요
              </span>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
