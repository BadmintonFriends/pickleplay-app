import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Bell, BellOff, Heart, MessageCircle, Pin,
  EyeOff, Flag, CheckCheck, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const NOTIFICATION_ICONS: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  notice: Pin,
  hidden: EyeOff,
  report_result: Flag,
};

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const notificationsQuery = trpc.community.notification.list.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  const markReadMutation = trpc.community.notification.markRead.useMutation({
    onSuccess: () => {
      utils.community.notification.list.invalidate();
      utils.community.notification.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.community.notification.markRead.useMutation({
    onSuccess: () => {
      utils.community.notification.list.invalidate();
      utils.community.notification.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      markReadMutation.mutate({ id: notification.id });
    }
    // Navigate to related post
    if (notification.relatedPostId) {
      navigate(`/social/post/${notification.relatedPostId}`);
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({});
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground px-4">
        <Bell className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">로그인이 필요합니다</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => { window.location.href = getLoginUrl("/social/notifications"); }}
        >
          로그인
        </Button>
      </div>
    );
  }

  const notifications = notificationsQuery.data?.items ?? [];
  const hasUnread = notifications.some((n: any) => !n.isRead);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-line">
        <div className="flex items-center justify-between px-2 h-12">
          <button onClick={() => navigate("/social")} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-sm font-bold text-foreground">알림</h2>
          <div className="w-10">
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                className="p-2 rounded-lg hover:bg-muted"
                title="모두 읽음 처리"
              >
                <CheckCheck className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1">
        {notificationsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellOff className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {notifications.map((notification: any) => {
              const IconComponent = NOTIFICATION_ICONS[notification.type] || Bell;
              const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: ko,
              });

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 hover:bg-muted/30 transition-colors flex gap-3",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    !notification.isRead ? "bg-primary/10" : "bg-muted"
                  )}>
                    <IconComponent className={cn(
                      "w-4 h-4",
                      !notification.isRead ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold",
                        !notification.isRead ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.body}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                      {timeAgo}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
