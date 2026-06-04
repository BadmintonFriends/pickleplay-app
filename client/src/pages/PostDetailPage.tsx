import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/mixpanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import NicknameModal from "@/components/NicknameModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Heart, MessageCircle, Share2, MoreHorizontal,
  Flag, EyeOff, Eye, Trash2, Pin, PinOff, Send, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: number } | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDesc, setReportDesc] = useState("");
  const [imageViewerIdx, setImageViewerIdx] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const postQuery = trpc.community.post.detail.useQuery({ id: postId }, { enabled: !!postId });
  const commentsQuery = trpc.community.comment.list.useQuery({ postId }, { enabled: !!postId });

  const likeMutation = trpc.community.post.toggleLike.useMutation({
    onSuccess: (data) => {
      if (data.liked) track("Post - Like", { post_id: postId });
      utils.community.post.detail.invalidate({ id: postId });
      utils.community.post.list.invalidate();
    },
  });

  const commentMutation = trpc.community.comment.create.useMutation({
    onSuccess: () => {
      track("Post - Comment", { post_id: postId });
      setCommentText("");
      utils.community.comment.list.invalidate({ postId });
      utils.community.post.detail.invalidate({ id: postId });
      utils.community.post.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.community.post.delete.useMutation({
    onSuccess: () => {
      toast.success("게시글이 삭제되었습니다");
      navigate("/social");
    },
    onError: (err) => toast.error(err.message),
  });

  const hideMutation = trpc.community.post.hide.useMutation({
    onSuccess: () => {
      toast.success("비공개 처리되었습니다");
      utils.community.post.detail.invalidate({ id: postId });
    },
  });

  const unhideMutation = trpc.community.post.unhide.useMutation({
    onSuccess: () => {
      toast.success("공개 처리되었습니다");
      utils.community.post.detail.invalidate({ id: postId });
    },
  });

  const pinMutation = trpc.community.post.togglePin.useMutation({
    onSuccess: () => {
      utils.community.post.detail.invalidate({ id: postId });
      utils.community.post.list.invalidate();
    },
  });

  const reportMutation = trpc.community.report.create.useMutation({
    onSuccess: () => {
      toast.success("신고가 접수되었습니다");
      setReportOpen(false);
      setReportTarget(null);
      setReportReason("");
      setReportDesc("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCommentMutation = trpc.community.comment.delete.useMutation({
    onSuccess: () => {
      utils.community.comment.list.invalidate({ postId });
      utils.community.post.detail.invalidate({ id: postId });
    },
  });

  const hideCommentMutation = trpc.community.comment.hide.useMutation({
    onSuccess: () => utils.community.comment.list.invalidate({ postId }),
  });

  const unhideCommentMutation = trpc.community.comment.unhide.useMutation({
    onSuccess: () => utils.community.comment.list.invalidate({ postId }),
  });

  const post = postQuery.data;
  const comments = commentsQuery.data?.items ?? [];
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const isAuthor = user && post && user.id === post.authorId;

  const handleLike = () => {
    if (!user) { window.location.href = getLoginUrl(`/social/post/${postId}`); return; }
    likeMutation.mutate({ postId });
  };

  const handleComment = () => {
    if (!user) { window.location.href = getLoginUrl(`/social/post/${postId}`); return; }
    if (!user.nickname) { setNicknameModalOpen(true); return; }
    if (!commentText.trim()) return;
    commentMutation.mutate({ postId, content: commentText.trim() });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title, text: post?.content?.slice(0, 100), url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("링크가 복사되었습니다");
    }
  };

  const handleReport = (type: "post" | "comment", id: number) => {
    if (!user) { window.location.href = getLoginUrl(`/social/post/${postId}`); return; }
    setReportTarget({ type, id });
    setReportOpen(true);
    setMenuOpen(false);
  };

  const submitReport = () => {
    if (!reportTarget || !reportReason) return;
    reportMutation.mutate({
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      reason: reportReason as any,
      description: reportDesc || undefined,
    });
  };

  if (postQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
        <p>게시글을 찾을 수 없습니다</p>
        <Button variant="ghost" onClick={() => navigate("/social")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-line">
        <div className="flex items-center justify-between px-2 h-12">
          <button onClick={() => navigate("/social")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-muted">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-muted">
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-line-strong rounded-xl shadow-xl z-50 w-44 py-1 overflow-hidden">
                    {isAuthor && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate(`/social/post/${postId}/edit`); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        수정하기
                      </button>
                    )}
                    {(isAuthor || isSuperAdmin) && (
                      <button
                        onClick={() => { setMenuOpen(false); deleteMutation.mutate({ id: postId }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" /> 삭제하기
                      </button>
                    )}
                    {isAdmin && !post.isHidden && (
                      <button
                        onClick={() => { setMenuOpen(false); hideMutation.mutate({ id: postId, reason: "관리자 판단에 의한 비공개" }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <EyeOff className="w-4 h-4" /> 비공개 처리
                      </button>
                    )}
                    {isAdmin && post.isHidden && (
                      <button
                        onClick={() => { setMenuOpen(false); unhideMutation.mutate({ id: postId }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> 공개 전환
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { setMenuOpen(false); pinMutation.mutate({ id: postId }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        {post.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        {post.isPinned ? "고정 해제" : "상단 고정"}
                      </button>
                    )}
                    {user && !isAuthor && (
                      <button
                        onClick={() => handleReport("post", postId)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 text-orange-400"
                      >
                        <Flag className="w-4 h-4" /> 신고하기
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden notice */}
      {post.isHidden && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-400">
            {isAdmin ? `비공개 처리됨: ${post.hiddenReason || "사유 없음"}` : "관리자가 비공개처리한 게시글입니다"}
          </span>
        </div>
      )}

      {/* Post content */}
      <div className="px-4 pt-4">
        {/* Author info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {post.authorName?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{post.authorName}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
            </p>
          </div>
          {post.isNotice && (
            <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">공지</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-foreground mb-2">{post.title}</h1>

        {/* Content */}
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4">
          {post.content}
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className={cn(
            "grid gap-2 mb-4",
            post.images.length === 1 && "grid-cols-1",
            post.images.length === 2 && "grid-cols-2",
            post.images.length >= 3 && "grid-cols-3",
          )}>
            {post.images.map((img: any, idx: number) => (
              <button
                key={img.id}
                onClick={() => setImageViewerIdx(idx)}
                className={cn(
                  "rounded-xl overflow-hidden bg-muted",
                  post.images.length === 1 ? "aspect-video" : "aspect-square"
                )}
              >
                <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-4 py-3 border-t border-b border-line">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Heart className={cn("w-5 h-5", post.isLiked && "fill-red-500 text-red-500")} />
            <span>{post.likeCount}</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="w-5 h-5" />
            <span>{post.commentCount}</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="px-4 pt-3">
        <h3 className="text-sm font-bold text-foreground mb-3">댓글 {comments.length}</h3>
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">아직 댓글이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment: any) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isAdmin={isAdmin}
                isSuperAdmin={isSuperAdmin}
                currentUserId={user?.id}
                onReport={() => handleReport("comment", comment.id)}
                onDelete={() => deleteCommentMutation.mutate({ id: comment.id, postId })}
                onHide={() => hideCommentMutation.mutate({ id: comment.id, reason: "관리자 판단" })}
                onUnhide={() => unhideCommentMutation.mutate({ id: comment.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment input */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-background border-t border-line px-4 py-3 z-40">
        <div className="flex gap-2">
          <Textarea
            placeholder={user ? (user.nickname ? "댓글을 입력하세요" : "닉네임을 먼저 설정해주세요") : "로그인 후 댓글을 작성할 수 있습니다"}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[40px] max-h-[100px] bg-muted border-0 text-sm resize-none"
            rows={1}
            disabled={!user || !user.nickname}
          />
          <Button
            onClick={handleComment}
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image viewer modal */}
      {imageViewerIdx !== null && post.images && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setImageViewerIdx(null)}>
          <button className="absolute top-4 right-4 p-2 text-white z-10" onClick={() => setImageViewerIdx(null)}>
            <X className="w-6 h-6" />
          </button>
          {imageViewerIdx > 0 && (
            <button
              className="absolute left-2 p-2 text-white z-10"
              onClick={(e) => { e.stopPropagation(); setImageViewerIdx(imageViewerIdx - 1); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {imageViewerIdx < post.images.length - 1 && (
            <button
              className="absolute right-2 p-2 text-white z-10"
              onClick={(e) => { e.stopPropagation(); setImageViewerIdx(imageViewerIdx + 1); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img
            src={post.images[imageViewerIdx].imageUrl}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 text-white text-sm">
            {imageViewerIdx + 1} / {post.images.length}
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 border border-line-strong shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">신고하기</h3>
              <button onClick={() => setReportOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { value: "spam", label: "스팸/광고" },
                { value: "abuse", label: "욕설/비방" },
                { value: "inappropriate", label: "부적절한 콘텐츠" },
                { value: "misinformation", label: "허위 정보" },
                { value: "other", label: "기타" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReportReason(r.value)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors",
                    reportReason === r.value
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reportReason === "other" && (
              <Textarea
                placeholder="신고 사유를 입력해주세요"
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="mb-4 bg-muted border-0 text-sm"
                rows={3}
              />
            )}
            <Button
              onClick={submitReport}
              className="w-full h-10 text-sm font-bold"
              disabled={!reportReason || reportMutation.isPending}
            >
              신고 접수
            </Button>
          </div>
        </div>
      )}

      {/* Nickname Modal */}
      <NicknameModal
        open={nicknameModalOpen}
        onClose={() => setNicknameModalOpen(false)}
        onSuccess={() => setNicknameModalOpen(false)}
      />
    </div>
  );
}

// ─── Comment Item ───────────────────────────────
function CommentItem({ comment, isAdmin, isSuperAdmin, currentUserId, onReport, onDelete, onHide, onUnhide }: {
  comment: any;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserId?: number;
  onReport: () => void;
  onDelete: () => void;
  onHide: () => void;
  onUnhide: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthor = currentUserId === comment.authorId;

  if (comment.isHidden && !isAdmin) {
    return (
      <div className="py-2 opacity-50 flex items-center gap-2 text-muted-foreground">
        <EyeOff className="w-3 h-3" />
        <span className="text-xs">관리자가 비공개처리한 댓글입니다</span>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
          {comment.authorName?.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{comment.authorName}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
            </span>
            {comment.isHidden && isAdmin && (
              <span className="text-[9px] text-red-400 bg-red-400/10 px-1 py-0.5 rounded">비공개</span>
            )}
            <div className="relative ml-auto">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded hover:bg-muted">
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-line-strong rounded-lg shadow-xl z-50 w-32 py-1">
                    {(isAuthor || isSuperAdmin) && (
                      <button
                        onClick={() => { setMenuOpen(false); onDelete(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-red-400"
                      >
                        삭제
                      </button>
                    )}
                    {isAdmin && !comment.isHidden && (
                      <button
                        onClick={() => { setMenuOpen(false); onHide(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted"
                      >
                        비공개 처리
                      </button>
                    )}
                    {isAdmin && comment.isHidden && (
                      <button
                        onClick={() => { setMenuOpen(false); onUnhide(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted"
                      >
                        공개 전환
                      </button>
                    )}
                    {currentUserId && !isAuthor && (
                      <button
                        onClick={() => { setMenuOpen(false); onReport(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-orange-400"
                      >
                        신고
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
        </div>
      </div>
    </div>
  );
}
