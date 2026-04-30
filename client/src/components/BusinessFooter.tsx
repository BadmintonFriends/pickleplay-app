/**
 * BusinessFooter — 사업자 정보 푸터
 * 전자상거래법 준수를 위한 사업자 정보 상시 노출
 */
export default function BusinessFooter() {
  return (
    <footer className="border-t border-line px-6 py-6 mt-8">
      <div className="text-[10px] text-muted-foreground space-y-0.5 leading-relaxed">
        <p className="font-medium text-[11px] text-muted-foreground/80 mb-1">
          주식회사 이음플레이 (IUMPlay Co.,Ltd.)
        </p>
        <p>대표자: 박정우 | 사업자등록번호: 694-86-04159</p>
        <p>법인등록번호: 284111-0050150</p>
        <p>개업연월일: 2026.01.15</p>
        <p>소재지: 경기도 남양주시 별내면 청학로응달길 51-10, 1층, 2층</p>
      </div>
    </footer>
  );
}
