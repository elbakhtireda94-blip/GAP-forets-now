// Types et données pour les demandes de déverrouillage PDFCP

import { ScopeLevel } from '@/lib/rbac';
import { ValidationStatus } from './pdfcp_entry_types';

export type UnlockRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UnlockRequest {
  id: string;
  pdfcp_id: string;
  pdfcp_name: string;
  requester_user_id: string;
  requester_name: string;
  requester_email: string;
  requester_scope_level: ScopeLevel;
  territoire: string; // commune / dpanef / dranef selon le profil
  current_validation_status: ValidationStatus;
  reason: string;
  status: UnlockRequestStatus;
  created_at: string;
  // Traitement Admin
  handled_by_admin_id: string | null;
  handled_by_admin_name: string | null;
  handled_at: string | null;
  admin_comment: string | null;
}

export interface AdminNotification {
  id: string;
  type: 'UNLOCK_REQUEST' | 'INFO' | 'WARNING';
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  related_entity_id: string | null;
}

// Mock data store pour les demandes (en mode démo)
let unlockRequests: UnlockRequest[] = [];
let adminNotifications: AdminNotification[] = [];

// API locale pour les demandes
export const UnlockRequestsAPI = {
  getAll: (): UnlockRequest[] => [...unlockRequests],
  
  getPending: (): UnlockRequest[] => 
    unlockRequests.filter(r => r.status === 'PENDING'),
  
  getPendingCount: (): number => 
    unlockRequests.filter(r => r.status === 'PENDING').length,
  
  getByPdfcpId: (pdfcpId: string): UnlockRequest[] =>
    unlockRequests.filter(r => r.pdfcp_id === pdfcpId),
  
  hasPendingRequest: (pdfcpId: string): boolean =>
    unlockRequests.some(r => r.pdfcp_id === pdfcpId && r.status === 'PENDING'),
  
  create: (request: Omit<UnlockRequest, 'id' | 'status' | 'created_at' | 'handled_by_admin_id' | 'handled_by_admin_name' | 'handled_at' | 'admin_comment'>): UnlockRequest => {
    const newRequest: UnlockRequest = {
      ...request,
      id: `REQ_${Date.now()}`,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      handled_by_admin_id: null,
      handled_by_admin_name: null,
      handled_at: null,
      admin_comment: null,
    };
    unlockRequests.push(newRequest);
    
    // Créer une notification Admin
    const notification: AdminNotification = {
      id: `NOTIF_${Date.now()}`,
      type: 'UNLOCK_REQUEST',
      title: 'Demande de déverrouillage PDFCP',
      message: `${request.requester_name} (${request.requester_scope_level}) demande le déverrouillage du PDFCP "${request.pdfcp_name}". Motif: ${request.reason.substring(0, 100)}...`,
      link: `/admin/unlock-requests`,
      is_read: false,
      created_at: new Date().toISOString(),
      related_entity_id: newRequest.id,
    };
    adminNotifications.push(notification);
    
    return newRequest;
  },
  
  approve: (requestId: string, adminId: string, adminName: string): UnlockRequest | null => {
    const request = unlockRequests.find(r => r.id === requestId);
    if (!request) return null;
    
    request.status = 'APPROVED';
    request.handled_by_admin_id = adminId;
    request.handled_by_admin_name = adminName;
    request.handled_at = new Date().toISOString();
    
    return request;
  },
  
  reject: (requestId: string, adminId: string, adminName: string, comment: string): UnlockRequest | null => {
    const request = unlockRequests.find(r => r.id === requestId);
    if (!request) return null;
    
    request.status = 'REJECTED';
    request.handled_by_admin_id = adminId;
    request.handled_by_admin_name = adminName;
    request.handled_at = new Date().toISOString();
    request.admin_comment = comment;
    
    return request;
  },
};

// API pour les notifications Admin
export const AdminNotificationsAPI = {
  getAll: (): AdminNotification[] => [...adminNotifications],
  
  getUnread: (): AdminNotification[] => 
    adminNotifications.filter(n => !n.is_read),
  
  getUnreadCount: (): number =>
    adminNotifications.filter(n => !n.is_read).length,
  
  markAsRead: (notificationId: string): void => {
    const notif = adminNotifications.find(n => n.id === notificationId);
    if (notif) notif.is_read = true;
  },
  
  markAllAsRead: (): void => {
    adminNotifications.forEach(n => n.is_read = true);
  },
};

// Labels pour l'affichage
export const UNLOCK_STATUS_LABELS: Record<UnlockRequestStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
};

export const UNLOCK_STATUS_COLORS: Record<UnlockRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
};
