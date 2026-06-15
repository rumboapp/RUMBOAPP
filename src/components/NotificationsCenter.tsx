/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Notification } from '../types';
import { Bell, Check, Trash, AlertTriangle, Info, Calendar } from 'lucide-react';

interface NotificationsCenterProps {
  agencyId: string;
}

export default function NotificationsCenter({ agencyId }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifs = () => {
    const list = db.getNotifications(agencyId);
    setNotifications(list);
  };

  useEffect(() => {
    fetchNotifs();

    // POLLING REQUISITO 6: "polling cada 30s sobre tabla notifications"
    const interval = setInterval(() => {
      fetchNotifs();
    }, 30000);

    // Also sync on custom DB update events
    window.addEventListener('rumbo_db_updated', fetchNotifs);

    return () => {
      clearInterval(interval);
      window.removeEventListener('rumbo_db_updated', fetchNotifs);
    };
  }, [agencyId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    db.markAllAsRead(agencyId);
    fetchNotifs();
  };

  const handleRead = (id: string) => {
    db.markNotificationAsRead(id);
    fetchNotifs();
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        id="btn-notif-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-pine hover:bg-sky/60 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-pine/30"
        title="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover content */}
      {isOpen && (
        <>
          {/* Backdrop for easy dismiss */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 overflow-hidden transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-850 flex items-center gap-2">
                <Bell className="w-4 h-4 text-pine" />
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-pine hover:text-pine-hover font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Marcar leídas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 px-4 text-center text-gray-405">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
                  <p className="text-sm">No tienes notificaciones aún</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 flex gap-3 transition-colors ${
                      n.read ? 'bg-white opacity-80' : 'bg-orange-50/40 hover:bg-orange-50/70'
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.kind === 'departure_created' ? (
                        <div className="p-1 px-1.5 bg-green-150 rounded-lg text-green-700">
                          <Calendar className="w-4 h-4" />
                        </div>
                      ) : n.kind === 'weather_alert' ? (
                        <div className="p-1 px-1.5 bg-yellow-101 rounded-lg text-yellow-600">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1 px-1.5 bg-sky rounded-lg text-ocean">
                          <Info className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <p className={`text-xs font-semibold ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <button
                            onClick={() => handleRead(n.id)}
                            className="text-[10px] text-pine hover:underline cursor-pointer"
                          >
                            Leído
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                      <span className="text-[9px] text-gray-400 mt-1 block">
                        {new Date(n.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
