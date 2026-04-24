import AppHeader from "@/components/AppHeader";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPage() {
  const [, navigate] = useLocation();

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      <AppHeader />
      <div className="px-4 pt-1 pb-3 flex items-center gap-2">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
          <ChevronLeft className="w-4 h-4 text-[#1a1a2e]" />
        </button>
        <h1 className="text-lg font-bold text-[#1a1a2e]">개인정보처리방침</h1>
      </div>

      <div className="px-4 pb-10">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 prose prose-sm max-w-none text-gray-700">
          <h2 className="text-base font-bold text-[#1a1a2e] mt-0">1. 개인정보의 수집 및 이용 목적</h2>
          <p>
            피클플레이(PicklePlay, 이하 "서비스")는 다음의 목적을 위하여 개인정보를 처리합니다. 
            처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리</li>
            <li>대회 참가 신청 처리: 참가 신청 접수, 참가비 입금 확인, 대회 운영 및 안내</li>
            <li>서비스 제공: 피클볼 대회 정보 제공, 맞춤 서비스 제공</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">2. 수집하는 개인정보 항목</h2>
          <p>서비스는 회원가입 및 서비스 이용을 위해 다음과 같은 개인정보를 수집합니다.</p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold">구분</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold">수집 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-3 py-2">회원가입 (필수)</td>
                  <td className="border border-gray-200 px-3 py-2">이름, 핸드폰 번호, 성별, 생년월일</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-3 py-2">대회 참가 신청 (필수)</td>
                  <td className="border border-gray-200 px-3 py-2">참가자 이름, 생년월일, 전화번호, 기념품 사이즈</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-3 py-2">자동 수집</td>
                  <td className="border border-gray-200 px-3 py-2">서비스 이용 기록, 접속 로그, 접속 IP 정보</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-base font-bold text-[#1a1a2e]">3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
            <li>대회 참가 기록: 대회 종료 후 1년간 보관</li>
            <li>관련 법령에 의한 보존: 전자상거래법 등 관련 법령에서 정한 기간</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">4. 개인정보의 제3자 제공</h2>
          <p>
            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자가 사전에 동의한 경우</li>
            <li>대회 운영을 위해 대회 주최측에 참가자 정보를 제공하는 경우 (이름, 연락처, 생년월일)</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">5. 개인정보의 파기 절차 및 방법</h2>
          <p>
            서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
            <li>종이에 출력된 개인정보: 분쇄기로 분쇄하거나 소각하여 파기</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">6. 정보주체의 권리·의무 및 행사방법</h2>
          <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리정지 요구</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">7. 개인정보의 안전성 확보 조치</h2>
          <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>개인정보의 암호화: 이용자의 개인정보는 암호화되어 저장·관리됩니다.</li>
            <li>해킹 등에 대비한 기술적 대책: 보안프로그램을 설치하고 주기적으로 갱신·점검합니다.</li>
            <li>접근 제한: 개인정보를 처리하는 데이터베이스에 대한 접근권한을 부여·제한합니다.</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">8. 개인정보 보호책임자</h2>
          <p>
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 
            아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>담당자: 피클플레이 운영팀</li>
            <li>연락처: 서비스 내 문의하기를 이용해주세요</li>
          </ul>

          <h2 className="text-base font-bold text-[#1a1a2e]">부칙</h2>
          <p>이 개인정보처리방침은 2026년 4월 24일부터 시행합니다.</p>
        </div>
      </div>
    </div>
  );
}
