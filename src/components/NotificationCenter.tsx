import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, Info, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
  critical: { icon: XCircle, className: 'text-destructive bg-destructive/10' },
  warning: { icon: AlertTriangle, className: 'text-amber-600 bg-amber-100' },
  info: { icon: Info, className: 'text-blue-600 bg-blue-100' },
};

const TYPE_LABELS: Record<string, string> = {
  cancellation_concerte: 'Annulation Concerté',
  cancellation_cp: 'Annulation CP',
  cancellation_execute: 'Annulation Exécuté',
  validation: 'Validation',
  info: 'Information',
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return dateString;
  }
};

const NotificationItem: React.FC<{
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (pdfcpId: string) => void;
}> = ({ notification, onRead, onNavigate }) => {
  const severity = SEVERITY_CONFIG[notification.severity] || SEVERITY_CONFIG.info;
  const Icon = severity.icon;

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    if (notification.pdfcp_id) {
      onNavigate(notification.pdfcp_id);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('mt-0.5 p-1 rounded-full shrink-0', severity.className)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{notification.title}</span>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
          {notification.cancellation_reason && (
            <div className="mt-1 text-xs bg-destructive/5 border border-destructive/10 rounded px-2 py-1 text-destructive">
              <span className="font-medium">Motif : </span>
              {notification.cancellation_reason}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {TYPE_LABELS[notification.notification_type] || notification.notification_type}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDate(notification.created_at)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [open, setOpen] = useState(false);

  // Don't render if notifications hook has no user (not authenticated)
  if (isLoading && notifications.length === 0) return null;

  const handleNavigate = (pdfcpId: string) => {
    setOpen(false);
    navigate(`/pdfcp/${pdfcpId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-foreground hover:bg-primary-foreground/20"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onRead={markAsRead}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
