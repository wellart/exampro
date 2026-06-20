import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface OfflineIndicatorProps {
  onStatusChange?: (isOnline: boolean) => void;
  syncTrigger?: boolean;
}

export default function OfflineIndicator({ onStatusChange, syncTrigger }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Check pending offline submissions in localStorage
  const updatePendingCount = () => {
    try {
      const offlineQueue = localStorage.getItem("pending_offline_submissions");
      if (offlineQueue) {
        const queue = JSON.parse(offlineQueue);
        setPendingCount(Array.isArray(queue) ? queue.length : 0);
      } else {
        setPendingCount(0);
      }
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    updatePendingCount();
  }, [syncTrigger]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (onStatusChange) onStatusChange(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (onStatusChange) onStatusChange(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic ping check just in case the WiFi is connected but internet is broken
    const interval = setInterval(() => {
      fetch("/api/health")
        .then((res) => {
          if (res.ok) {
            if (!isOnline) {
              setIsOnline(true);
              if (onStatusChange) onStatusChange(true);
              triggerSync();
            }
          } else {
            if (isOnline) {
              setIsOnline(false);
              if (onStatusChange) onStatusChange(false);
            }
          }
        })
        .catch(() => {
          if (isOnline) {
            setIsOnline(false);
            if (onStatusChange) onStatusChange(false);
          }
        });
      
      updatePendingCount();
    }, 12000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const triggerSync = async () => {
    const offlineQueue = localStorage.getItem("pending_offline_submissions");
    if (!offlineQueue) return;

    try {
      const queue = JSON.parse(offlineQueue);
      if (!Array.isArray(queue) || queue.length === 0) return;

      setIsSyncing(true);
      console.log(`Menyinkronkan ${queue.length} submisi offline...`);

      const remaining: any[] = [];

      for (const item of queue) {
        try {
          const res = await fetch(`/api/exams/${item.examId}/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...item,
              isOfflineSync: true, // Tagged as sync submission
            }),
          });

          if (!res.ok) {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem("pending_offline_submissions", JSON.stringify(remaining));
      } else {
        localStorage.removeItem("pending_offline_submissions");
      }

      updatePendingCount();

      // Fire a system notification on successful online synchronization
      if (remaining.length === 0 && Notification.permission === "granted") {
        new Notification("Ujian Selesai Disinkronkan!", {
          body: "Submisi ujian offline berhasil dikirim ke server pusat secara otomatis.",
          icon: "/favicon.ico",
        });
      }
    } catch (e) {
      console.error("Gagal menyinkronkan data offline:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 font-sans">
      {isOnline ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 leading-none">
          <Wifi className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
          ONLINE
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-550/15 text-amber-400 border border-amber-400/30 leading-none animate-pulse">
          <WifiOff className="w-2.5 h-2.5 text-amber-400" />
          OFFLINE
        </span>
      )}

      {pendingCount > 0 && (
        <button
          onClick={triggerSync}
          disabled={isSyncing || !isOnline}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-tight cursor-pointer leading-none ${
            isOnline
              ? "bg-blue-500/15 text-blue-400 hover:bg-blue-550/25 border border-blue-400/30"
              : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
          }`}
          title={isOnline ? "Klik untuk paksa sinkronisasi" : "Menunggu koneksi sebelum sinkronisasi"}
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? "animate-spin" : ""}`} />
          {pendingCount} SYNCS
        </button>
      )}
    </div>
  );
}
