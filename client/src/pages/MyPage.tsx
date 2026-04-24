import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  User,
  Edit3,
  Check,
  X,
  Trophy,
  Calendar,
  Phone,
  ChevronRight,
  Loader2,
  LogOut,
  FileText,
  Shield,
} from "lucide-react";
import { useLocation } from "wouter";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "입금대기", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "참가확정", color: "bg-green-100 text-green-800" },
  cancelled: { label: "취소됨", color: "bg-red-100 text-red-800" },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  unpaid: { label: "미입금", color: "bg-orange-100 text-orange-800" },
  paid: { label: "입금완료", color: "bg-blue-100 text-blue-800" },
  refunded: { label: "환불", color: "bg-gray-100 text-gray-600" },
};

export default function MyPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [editBirthDate, setEditBirthDate] = useState("");

  const profileQuery = trpc.user.profile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const registrationsQuery = trpc.registration.myRegistrations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("프로필이 수정되었습니다");
      profileQuery.refetch();
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(err.message || "프로필 수정에 실패했습니다");
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setEditName(profileQuery.data.name || "");
      setEditGender(profileQuery.data.gender || "male");
      setEditBirthDate(profileQuery.data.birthDate || "");
    }
  }, [profileQuery.data]);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      name: editName,
      gender: editGender,
      birthDate: editBirthDate,
    });
  };

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "-";
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  if (authLoading) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-gray-500 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <Button
            onClick={() => navigate("/login?returnTo=/mypage")}
            className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white"
          >
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const registrations = registrationsQuery.data ?? [];

  return (
    <div className="bg-[#f8f9fa] min-h-screen pb-24">
      <AppHeader />

      {/* Back button */}
      <div className="px-4 pt-1 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
          <ChevronLeft className="w-4 h-4 text-[#1a1a2e]" />
        </button>
        <h1 className="text-lg font-bold text-[#1a1a2e]">마이페이지</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Profile Card */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2a2a4e] px-5 py-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#C8E632] flex items-center justify-center text-[#1a1a2e] font-bold text-xl">
              {profile?.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg truncate">{profile?.name || "이름 없음"}</h2>
              <p className="text-gray-300 text-sm">{formatPhone(profile?.phone)}</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Edit3 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          <CardContent className="p-5">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">이름</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="이름을 입력해주세요"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">성별</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditGender("male")}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        editGender === "male"
                          ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      남성
                    </button>
                    <button
                      onClick={() => setEditGender("female")}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        editGender === "female"
                          ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">생년월일</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="1990-01-01"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(formatBirthDate(e.target.value))}
                    maxLength={10}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending || !editName}
                    className="flex-1 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    저장
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        setEditName(profile.name || "");
                        setEditGender(profile.gender || "male");
                        setEditBirthDate(profile.birthDate || "");
                      }
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-500">성별</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">
                    {profile?.gender === "male" ? "남성" : profile?.gender === "female" ? "여성" : "-"}
                  </span>
                </div>
                <div className="border-t" />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-500">생년월일</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">{profile?.birthDate || "-"}</span>
                </div>
                <div className="border-t" />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-500">가입일</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("ko-KR") : "-"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#1a1a2e] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#C8E632]" />
              대회 접수 내역
            </h3>
            <span className="text-xs text-gray-400">{registrations.length}건</span>
          </div>

          {registrationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : registrations.length === 0 ? (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="py-10 text-center">
                <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">아직 접수한 대회가 없습니다</p>
                <Button
                  onClick={() => navigate("/tournament")}
                  variant="outline"
                  size="sm"
                  className="text-[#1a1a2e] border-[#1a1a2e]"
                >
                  대회 둘러보기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg: any) => {
                const status = statusLabels[reg.status] || statusLabels.pending;
                const payment = paymentLabels[reg.paymentStatus] || paymentLabels.unpaid;
                return (
                  <Card
                    key={reg.id}
                    className="border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/tournament/${reg.tournamentId}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1a1a2e] truncate">
                            {reg.tournamentName || `대회 #${reg.tournamentId}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            접수번호: {reg.registrationNumber}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${status.color} text-xs px-2 py-0.5 rounded-full font-medium`}>
                          {status.label}
                        </Badge>
                        <Badge className={`${payment.color} text-xs px-2 py-0.5 rounded-full font-medium`}>
                          {payment.label}
                        </Badge>
                        {reg.eventType && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full">
                            {reg.eventType === "doubles" ? "복식" : "단식"}
                          </Badge>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-2.5">
                        {reg.players?.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-400">|</span>
                            <span>{p.birthDate}</span>
                            <span className="text-gray-400">|</span>
                            <span>{p.phone}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(reg.createdAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => navigate("/terms")}
            className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 flex-1 text-left">이용약관</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => navigate("/privacy")}
            className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
          >
            <Shield className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 flex-1 text-left">개인정보처리방침</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-500 flex-1 text-left">로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
}
