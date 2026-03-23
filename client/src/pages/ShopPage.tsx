/*
 * ShopPage — PicklePlay 샵 화면
 * 디자인: Clean Sport Utility
 * - 히어로 배너 (신제품 패들)
 * - 카테고리 그리드
 * - 베스트셀러 상품 목록
 */
import AppHeader from "@/components/AppHeader";
import { Star, ShoppingCart, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const PADDLE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/paddle-hero-iTNBPcWJYZYmDurw99mTKy.webp";

const products = [
  {
    id: 1,
    name: "에이펙스 프로 카본 X",
    price: "₩189,000",
    rating: 4.8,
    reviews: 204,
    badge: "4.5 DUPR 추천",
    badgeColor: "bg-[#C8E632] text-[#1a1a2e]",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/paddle-hero-iTNBPcWJYZYmDurw99mTKy.webp",
    bgColor: "bg-amber-50",
  },
  {
    id: 2,
    name: "플라이트 코트 V2",
    price: "₩120,000",
    rating: 4.6,
    reviews: 89,
    badge: "인기",
    badgeColor: "bg-amber-100 text-amber-700",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&q=80",
    bgColor: "bg-gray-50",
  },
  {
    id: 3,
    name: "파워 프로 볼 12팩",
    price: "₩34,900",
    rating: 4.7,
    reviews: 423,
    badge: null,
    badgeColor: "",
    image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&h=400&fit=crop&q=80",
    bgColor: "bg-teal-50",
  },
  {
    id: 4,
    name: "딩크 마스터 티셔츠",
    price: "₩28,000",
    originalPrice: "₩45,000",
    rating: 4.5,
    reviews: 56,
    badge: "세일",
    badgeColor: "bg-red-100 text-red-600",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&q=80",
    bgColor: "bg-slate-50",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function ShopPage() {
  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader showSearch showCart />

      {/* 히어로 배너 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="relative rounded-2xl overflow-hidden h-56">
          <img src={PADDLE_HERO} alt="신제품 패들" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute bottom-5 left-4 text-white">
            <span className="text-[10px] font-bold bg-[#C8E632] text-[#1a1a2e] px-2.5 py-0.5 rounded-full uppercase">
              한정판
            </span>
            <h2 className="text-2xl font-bold mt-2 leading-tight">
              신제품 패들
              <br />
              컬렉션
            </h2>
            <p className="text-[11px] text-white/70 mt-1.5 leading-relaxed max-w-[200px]">
              완벽한 딩크를 위한 카본 파이버 기술의 진화를 경험하세요.
            </p>
            <button className="mt-3 bg-[#C8E632] text-[#1a1a2e] text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#bdd62e] transition-colors uppercase tracking-wider">
              지금 보기
            </button>
          </div>
        </div>
      </motion.section>

      {/* 카테고리 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#1a1a2e]">장비 카테고리</h2>
          <button className="text-xs font-semibold text-gray-500 flex items-center gap-0.5 uppercase tracking-wide hover:text-[#1a1a2e] transition-colors">
            전체보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { name: "패들", emoji: "🏓" },
            { name: "볼", emoji: "🟡" },
            { name: "의류", emoji: "👕" },
            { name: "액세서리", emoji: "🎒" },
          ].map((cat) => (
            <button
              key={cat.name}
              className="bg-white rounded-xl p-3 flex flex-col items-center gap-1.5 border border-gray-100 shadow-sm hover:border-[#C8E632] hover:shadow-md transition-all active:scale-95"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-[11px] font-semibold text-[#1a1a2e]">{cat.name}</span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* 베스트셀러 */}
      <section className="px-4 pb-6">
        <div className="mb-3">
          <h2 className="text-base font-bold text-[#1a1a2e]">베스트셀러</h2>
          <p className="text-xs text-gray-400 mt-0.5">프로 선수들이 신뢰하는 대회급 장비</p>
        </div>

        <div className="space-y-3">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={idx + 2}
            >
              <div className={`relative w-full h-48 ${product.bgColor} flex items-center justify-center overflow-hidden`}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {product.badge && (
                  <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${product.badgeColor}`}>
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#1a1a2e] truncate">{product.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-gray-500">
                        {product.rating} ({product.reviews})
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-[#1a1a2e]">{product.price}</p>
                    {"originalPrice" in product && product.originalPrice && (
                      <p className="text-xs text-gray-400 line-through">{product.originalPrice}</p>
                    )}
                  </div>
                </div>
                <button className="w-full mt-3 flex items-center justify-center gap-1.5 bg-[#C8E632] text-[#1a1a2e] text-xs font-bold py-2.5 rounded-xl hover:bg-[#bdd62e] transition-colors active:scale-[0.98]">
                  <ShoppingCart className="w-3.5 h-3.5" /> 장바구니 담기
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
