import React from 'react';
import { Bell, Check, CheckCheck, ClipboardList, CalendarCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNowIST } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  onNavigate?: (tab: string) => void;
}

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate?: (tab: string) => void;
  onClose?: () => void;
}> = ({ notification, onMarkAsRead, onNavigate, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'task_assigned':
        return <ClipboardList className="h-4 w-4 text-primary" />;
      case 'leave_approved':
        return <CalendarCheck className="h-4 w-4 text-success" />;
      case 'leave_rejected':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (onNavigate) {
      if (notification.type === 'task_assigned') {
        onNavigate('tasks');
      } else if (notification.type === 'leave_approved' || notification.type === 'leave_rejected') {
        onNavigate('leave-permission');
      }
    }
    onClose?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors rounded-lg",
        notification.is_read 
          ? "bg-background hover:bg-muted/50" 
          : "bg-primary/5 hover:bg-primary/10"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          !notification.is_read && "text-primary"
        )}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNowIST(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </button>
  );
};

const NotificationList: React.FC<{
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate?: (tab: string) => void;
  onClose?: () => void;
  unreadCount: number;
}> = ({ notifications, loading, onMarkAsRead, onMarkAllAsRead, onNavigate, onClose, unreadCount }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {unreadCount > 0 && (
        <div className="flex justify-end p-2 border-b">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onNavigate={onNavigate}
              onClose={onClose}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const TriggerButton = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {TriggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} new</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100%-4rem)]">
            <NotificationList
              notifications={notifications}
              loading={loading}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onNavigate={onNavigate}
              onClose={() => setOpen(false)}
              unreadCount={unreadCount}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="max-h-[400px]">
          <NotificationList
            notifications={notifications}
            loading={loading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onNavigate={onNavigate}
            onClose={() => setOpen(false)}
            unreadCount={unreadCount}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
