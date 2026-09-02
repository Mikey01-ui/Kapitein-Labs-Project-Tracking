import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ExternalLink, Inbox, X } from "lucide-react";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";

interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  link: string | null;
  createdAt: string;
}

export function NotificationInbox() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<{ notifications: Notification[] }>("/notifications");
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const bellButton = document.querySelector(".bell-button-trigger");
        if (bellButton && !bellButton.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Button Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bell-button-trigger relative p-2 text-[#888888] hover:text-white transition-colors duration-150 rounded-full hover:bg-white/5 focus:outline-none cursor-pointer"
        title="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-[#c8ff00] animate-pulse-slow" : "text-[#888888]"} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c8ff00] text-[9px] font-black text-[#080808] shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Render the drawer and backdrop inside React Portal */}
      {createPortal(
        <>
          {isOpen && (
            <div 
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] transition-opacity duration-300"
            />
          )}

          <div
            ref={sidebarRef}
            className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-[#111111] border-l border-dashed border-[#222222] z-[9995] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#0c0c0c] border-b border-dashed border-[#222222] flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Bell size={13} className="text-[#c8ff00]" />
                Notifications Panel
              </span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-black uppercase tracking-wider text-[#c8ff00] hover:underline flex items-center gap-1 transition cursor-pointer"
                  >
                    <Check size={10} />
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#888888] hover:text-white rounded hover:bg-white/5 transition focus:outline-none cursor-pointer"
                  title="Close Sidebar"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable Feed */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#888888]/60 p-6">
                  <Inbox size={36} className="mb-2 text-[#888888]/40" />
                  <p className="text-xs font-semibold text-[#888888]">All caught up!</p>
                  <p className="text-[10px] text-[#666666] mt-0.5">You have no new notifications.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#222222]">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-5 flex flex-col gap-1 transition-colors relative group ${
                        notification.isRead ? "bg-transparent hover:bg-white/5" : "bg-[#c8ff00]/5 hover:bg-[#c8ff00]/10"
                      }`}
                    >
                      {!notification.isRead && (
                        <span className="absolute top-5 left-2.5 h-1.5 w-1.5 rounded-full bg-[#c8ff00]" />
                      )}

                      <div className="pl-3.5 pr-8 flex flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-bold text-white leading-tight">
                            {notification.title}
                          </span>
                          <span className="text-[9px] text-[#888888] font-bold whitespace-nowrap flex-shrink-0 mt-0.5">
                            {getRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#888888] leading-relaxed mt-1">
                          {notification.message}
                        </p>

                        {notification.link && (
                          <a
                            href={notification.link}
                            onClick={() => setIsOpen(false)}
                            className="mt-2 text-[9px] font-black uppercase tracking-wider text-[#c8ff00] hover:underline flex items-center gap-0.5 w-fit"
                          >
                            View Details
                            <ExternalLink size={8} />
                          </a>
                        )}
                      </div>

                      {!notification.isRead && (
                        <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1 text-[#888888] hover:text-[#c8ff00] rounded hover:bg-white/5 transition focus:outline-none cursor-pointer"
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default NotificationInbox;
