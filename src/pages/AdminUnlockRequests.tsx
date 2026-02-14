import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Unlock,
  X,
  Check,
  Clock,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  FileText,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  UnlockRequest,
  UnlockRequestsAPI,
  UNLOCK_STATUS_LABELS,
  UNLOCK_STATUS_COLORS,
} from '@/data/unlock_requests';
import { STATUS_LABELS } from '@/data/pdfcp_entry_types';
import validationData from '@/data/pdfcp_validation.json';
import { PdfcpValidation } from '@/data/pdfcp_entry_types';

const AdminUnlockRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UnlockRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  // Charger les demandes triées par created_at DESC
  const loadRequests = () => {
    const allRequests = UnlockRequestsAPI.getAll();
    // Trier par created_at DESC
    allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRequests(allRequests);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Statistiques
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  // Approuver une demande
  const handleApprove = (request: UnlockRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedRequest || !user) return;

    const updated = UnlockRequestsAPI.approve(
      selectedRequest.id,
      user.id,
      user.name
    );

    if (updated) {
      // Note: En production, ceci déclencherait aussi le rollback du validation_status
      toast({
        title: 'Demande approuvée',
        description: `Le PDFCP "${selectedRequest.pdfcp_name}" sera déverrouillé.`,
      });
      loadRequests();
    }

    setShowApproveDialog(false);
    setSelectedRequest(null);
  };

  // Rejeter une demande
  const handleReject = (request: UnlockRequest) => {
    setSelectedRequest(request);
    setRejectComment('');
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (!selectedRequest || !user || !rejectComment.trim()) {
      toast({
        title: 'Commentaire obligatoire',
        description: 'Veuillez expliquer la raison du rejet.',
        variant: 'destructive',
      });
      return;
    }

    const updated = UnlockRequestsAPI.reject(
      selectedRequest.id,
      user.id,
      user.name,
      rejectComment.trim()
    );

    if (updated) {
      toast({
        title: 'Demande rejetée',
        description: `La demande de déverrouillage a été rejetée.`,
      });
      loadRequests();
    }

    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectComment('');
  };

  // Vérifier les permissions
  if (user?.scope_level !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title="Accès refusé" showBack />
        <main className="flex-1 container mx-auto p-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-red-800 mb-2">Accès refusé</h2>
              <p className="text-red-600">
                Cette page est réservée aux administrateurs nationaux.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/menu')}>
                Retour au menu
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Demandes de déverrouillage" subtitle="Administration PDFCP" showBack />
      <main className="flex-1 container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Unlock className="h-6 w-6" />
                Demandes de déverrouillage
              </h1>
              <p className="text-muted-foreground text-sm">
                Gestion des demandes de déverrouillage PDFCP
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadRequests}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4 text-center">
              <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-800">{pendingCount}</div>
              <div className="text-sm text-amber-600">En attente</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 text-center">
              <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-800">{approvedCount}</div>
              <div className="text-sm text-green-600">Approuvées</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-center">
              <X className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-800">{rejectedCount}</div>
              <div className="text-sm text-red-600">Rejetées</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des demandes */}
        <Card>
          <CardHeader>
            <CardTitle>Toutes les demandes</CardTitle>
            <CardDescription>
              {requests.length === 0
                ? 'Aucune demande de déverrouillage'
                : `${requests.length} demande(s) enregistrée(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Unlock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune demande de déverrouillage pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PDFCP</TableHead>
                      <TableHead>Demandeur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut actuel</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{request.pdfcp_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{request.requester_email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.requester_scope_level}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {STATUS_LABELS[request.current_validation_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate" title={request.reason}>
                            {request.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={UNLOCK_STATUS_COLORS[request.status]}>
                            {UNLOCK_STATUS_LABELS[request.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'PENDING' ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleApprove(request)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approuver et déverrouiller
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleReject(request)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rejeter
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {request.handled_by_admin_name && (
                                <>Traité par {request.handled_by_admin_name}</>
                              )}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog pour voir le motif */}
        {selectedRequest && (
          <Dialog open={!!selectedRequest && !showApproveDialog && !showRejectDialog} onOpenChange={() => setSelectedRequest(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Détail de la demande</DialogTitle>
                <DialogDescription>
                  Demande de déverrouillage pour {selectedRequest.pdfcp_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Motif</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedRequest.reason}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog d'approbation */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approuver le déverrouillage</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Vous êtes sur le point d'approuver la demande de déverrouillage pour le PDFCP{' '}
                  <strong>"{selectedRequest?.pdfcp_name}"</strong>.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Le PDFCP sera remis au statut "Brouillon" et redeviendra éditable.
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Motif du demandeur :</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest?.reason}</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Approuver et déverrouiller
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de rejet */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter la demande</DialogTitle>
              <DialogDescription>
                Expliquez pourquoi cette demande de déverrouillage est rejetée.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Motif du demandeur :</p>
                <p className="text-sm text-muted-foreground">{selectedRequest?.reason}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reject-comment">
                  Commentaire de rejet <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reject-comment"
                  placeholder="Expliquez la raison du rejet..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReject}
                disabled={!rejectComment.trim()}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeter la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <AppFooter />
    </div>
  );
};

export default AdminUnlockRequests;
