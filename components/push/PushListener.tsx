"use client";

import { useEffect } from "react";

/**
 * PushListener
 * ----------------------------------------------------------------------------
 * Renders nothing. On mount, opens an EventSource connection to
 * /api/push/stream and, for every incoming push, shows a native browser
 * Notification (if permission has been granted) while this tab is open.
 *
 * This is intentionally the only piece of push-related client code —
 * everything else (formatting, broadcasting, connection registry) lives in
 * lib/push/. Mount this once near the root of the authenticated app so it
 * stays connected for as long as the dashboard is open, mirroring how
 * <AIAssistant /> is already mounted once in the admin layout.
 */
export function PushListener() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("EventSource" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // Permission prompt dismissed/blocked — notifications simply won't show; not fatal.
      });
    }

    const eventSource = new EventSource("/api/push/stream");

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { title: string; body: string };
        if (Notification.permission === "granted") {
          new Notification(payload.title, { body: payload.body });
        }
      } catch (err) {
        console.warn("[push] Received malformed push payload:", err);
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects on its own; just log for visibility.
      console.warn("[push] Connection to /api/push/stream interrupted — browser will retry automatically.");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return null;
}