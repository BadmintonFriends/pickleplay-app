import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/mixpanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import AppHeader from "@/components/AppHeader";
import NicknameModal from "@/components/NicknameModal";
import { Input } from "@/components/ui/input";
import {
  PenSquare, Search, Heart, MessageCircle, Pin,
  EyeOff, X, Bell, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function SocialPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const postsQuery = trpc.community.post.list.useInfiniteQuery(
    { limit: 15, search: activeSearch || undefined },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
    }
  );

  const unreadQuery = trpc.community.notification.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Infinite scroll observer
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
          postsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [postsQuery.hasNextPage, postsQuery.isFetchingNextPage]);

  const handleSearch = () => {
    setActiveSearch(searchQuery);
  };

  const handleWrite = () => {
    if (!user) {
      window.location.href = getLoginUrl("/social/write");
      return;
    }
    if (!user.nickname) {
      setNicknameModalOpen(true);
      return;
    }
    track("Social - Write Click");
    navigate("/social/write");
  };

  const allPinnedNotices = postsQuery.data?.pages[0]?.pinnedNotices ?? [];
  const allPosts = postsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <AppHeader />

      {/* Sub header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-line">
        <div className="flex items-center justify-between px-4 h-12">
          <h2 className="text-lg font-bold text-foreground">커뮤니티</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            {user && (
              <button
                onClick={() => navigate("/social/notifications")}
                className="p-2 rounded-lg hover:bg-muted transition-colors relative"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {(unreadQuery.data?.count ?? 0) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 pb-3 flex gap-2">
            <Input
              placeholder="검색어를 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 bg-muted border-0 text-sm"
              autoFocus
            />
            {activeSearch && (
              <button
                onClick={() => { setSearchQuery(""); setActiveSearch(""); }}
                className="p-2 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pinned notices */}
      {allPinnedNotices.length > 0 && (
        <div className="border-b border-line">
          {allPinnedNotices.map((notice) => (
            <button
              key={notice.id}
              onClick={() => navigate(`/social/post/${notice.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <Pin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate flex-1 text-left">
                {notice.title}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Posts feed */}
      <div className="flex-1">
        {postsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{activeSearch ? "검색 결과가 없습니다" : "아직 게시글이 없습니다"}</p>
            <p className="text-xs mt-1">첫 번째 글을 작성해보세요!</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {allPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => navigate(`/social/post/${post.id}`)}
                isAdmin={user?.role === "admin" || user?.role === "super_admin"}
              />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-10" />
        {postsQuery.isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* FAB - Write button */}
      <button
        onClick={handleWrite}
        className="fixed bottom-20 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity z-40"
        style={{ right: "max(1rem, calc(50% - 240px + 1rem))" }}
      >
        <PenSquare className="w-6 h-6" />
      </button>

      {/* Nickname Modal */}
      <NicknameModal
        open={nicknameModalOpen}
        onClose={() => setNicknameModalOpen(false)}
        onSuccess={() => {
          setNicknameModalOpen(false);
          navigate("/social/write");
        }}
      />
    </div>
  );
}

// ─── Post Card Component ───────────────────────────────
function PostCard({ post, onClick, isAdmin }: {
  post: any;
  onClick: () => void;
  isAdmin: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko });

  if (post.isHidden && !isAdmin) {
    return (
      <div className="px-4 py-4 opacity-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">관리자가 비공개처리한 게시글입니다</span>
        </div>
      </div>
    );
  }

  return (
    <button onClick={onClick} className="w-full text-left px-4 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {/* Notice badge */}
          <div className="flex items-center gap-1 mb-0.5">
            {post.isNotice && (
              <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                공지
              </span>
            )}
            {post.isHidden && isAdmin && (
              <span className="inline-block text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                비공개
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground line-clamp-1">{post.title}</h3>

          {/* Content preview */}
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.content}</p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span>{post.authorName}</span>
            <span>{timeAgo}</span>
            <span className="flex items-center gap-0.5">
              <Heart className={cn("w-3 h-3", post.isLiked && "fill-red-500 text-red-500")} />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircle className="w-3 h-3" />
              {post.commentCount}
            </span>
          </div>
        </div>

        {/* Thumbnail */}
        {post.thumbnailUrl && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
            <img
              src={post.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </button>
  );
}
