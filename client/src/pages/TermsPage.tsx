import AppHeader from "@/components/AppHeader";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      <AppHeader />
      <div className="px-4 pt-1 pb-3 flex items-center gap-2">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
          <ChevronLeft className="w-4 h-4 text-[#1a1a2e]" />
        </button>
        <h1 className="text-lg font-bold text-[#1a1a2e]">이용약관</h1>
      </div>

      <div className="px-4 pb-10">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 prose prose-sm max-w-none text-gray-700">
          <h2 className="text-base font-bold text-[#1a1a2e] mt-0">제1조 (목적)</h2>
          <p>
            이 약관은 피클플레이(PicklePlay, 이하 "서비스")가 제공하는 피클볼 대회 참가 신청 및 관련 서비스의 이용 조건과 절차, 
            이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-base font-bold text-[#1a1a2e]">제2조 (정의)</h2>
          <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>"서비스"란 피클플레이가 운영하는 웹사이트 및 모바일 애플리케이션을 통해 제공하는 피클볼 대회 참가 신청, 대회 정보 제공 등 일체의 서비스를 말합니다.</li>
            <li>"이용자"란 이 약관에 따라 서비스에 가입하여 서비스를 이용하는 자를 말합니다.</li>
            <li>"회원"이란 서비스에 회원가입을 한 자로서, 서비스가 제공하는 정보와 서비스를 이용할 수 있는 자를 말합니다.</li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">제3조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>서비스는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 이 약관을 변경할 수 있으며, 변경된 약관은 제1항과 같은 방법으로 공지합니다.</li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">제4조 (회원가입)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이용자는 서비스가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
            <li>회원가입은 핸드폰 번호 인증을 통해 이루어지며, 이름, 성별, 생년월일 등의 정보를 제공해야 합니다.</li>
            <li>서비스는 다음 각 호에 해당하는 신청에 대해서는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>가입 신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                <li>타인의 명의를 이용한 경우</li>
                <li>허위의 정보를 기재하거나, 서비스가 제시하는 내용을 기재하지 않은 경우</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">제5조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스는 다음과 같은 업무를 수행합니다.
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>피클볼 대회 정보 제공</li>
                <li>대회 참가 신청 접수 및 관리</li>
                <li>기타 서비스가 정하는 업무</li>
              </ul>
            </li>
            <li>서비스는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 서비스의 내용을 변경할 수 있습니다.</li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">제6조 (대회 참가 신청)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 서비스에서 제공하는 대회 참가 신청 양식에 따라 참가 신청을 할 수 있습니다.</li>
            <li>참가 신청 후 참가비 입금이 확인되어야 참가가 확정됩니다.</li>
            <li>참가 신청 취소는 대회 규정에 따르며, 환불 정책은 각 대회별로 상이할 수 있습니다.</li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">제7조 (회원의 의무)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 서비스 이용 시 관계법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
            <li>회원은 서비스의 이용권한, 기타 이용계약상의 지위를 타인에게 양도, 증여할 수 없습니다.</li>
            <li>회원은 정확한 개인정보를 제공하여야 하며, 변경사항이 있을 경우 즉시 수정하여야 합니다.</li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">제8조 (면책조항)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>서비스는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
          </ol>

          <h2 className="text-base font-bold text-[#1a1a2e]">부칙</h2>
          <p>이 약관은 2026년 4월 24일부터 시행합니다.</p>
        </div>
      </div>
    </div>
  );
}
