/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Notification } from '../types';
import { Bell, Check, Calendar, AlertTriangle, Info } from 'lucide-react';

interface NotificationsCenterProps {
  agencyId: string;
}

export default function NotificationsCenter({ agencyId }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifs = async () => {
    const list = await db.getNotifications(agencyId);
    setNotifications(list);
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(() => fetchNotifs(), 30000);
    window.addEventListener('rumbo_db_updated', fetchNotifs);
    return () => { clearInterval(interval); window.removeEventListener('rumbo_db_updated', fetchNotifs); };
  }, [agencyId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    await db.markAllAsRead(agencyId);
    await fetchNotifs();
  };

  const handleRead = async (id: string) => {
    await db.markNotificationAsRead(id);
    await fetchNotifs();
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-white md:text-gray-600 hover:text-white md:hover:text-pine rounded-full transition-all">
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">{unreadCount}</span>}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-150 shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-pine flex items-center gap-2"><Bell className="w-4 h-4" /> Notificaciones</h3>
              {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] font-bold text-ocean hover:text-pine cursor-pointer">Marcar todas leídas</button>}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs"><Info className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Sin notificaciones</p></div>
              ) : notifications.map((n) => (
                <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-all ${!n.read ? 'bg-sky/10' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {n.kind === 'weather_alert' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <Calendar className="w-4 h-4 text-ocean" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-gray-400">{new Date(n.created_at).toLocaleDateString('es-AR')}</span>
                        {!n.read && <button onClick={() => handleRead(n.id)} className="text-[10px] text-ocean font-bold hover:text-pine flex items-center gap-0.5"><Check className="w-3 h-3" /> Leído</button>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
