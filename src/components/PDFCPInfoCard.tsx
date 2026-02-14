import React from 'react';
import { Calendar, MapPin, User, FileText, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PDFCP } from '@/data/pdfcpTypes';

interface PDFCPInfoCardProps {
  pdfcp: PDFCP;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'en_cours': { label: "En cours d'élaboration", variant: 'secondary' },
  'valide_dranef': { label: 'Validé DRANEF', variant: 'outline' },
  'valide_cc': { label: 'Validé Conseil communal', variant: 'default' },
  'finalise': { label: 'Finalisé', variant: 'default' },
};

const PDFCPInfoCard: React.FC<PDFCPInfoCardProps> = ({ pdfcp }) => {
  const status = statusLabels[pdfcp.statut];

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground leading-tight mb-2">
            {pdfcp.titre}
          </h2>
          <Badge variant={status.variant} className="text-xs">
            <CheckCircle size={12} className="mr-1" />
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <MapPin size={16} className="text-primary shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">Commune</p>
            <p className="font-medium text-foreground">{pdfcp.commune}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={16} className="text-primary shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">Période</p>
            <p className="font-medium text-foreground">{pdfcp.anneeDebut} - {pdfcp.anneeFin}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User size={16} className="text-primary shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">ADP Responsable</p>
            <p className="font-medium text-foreground">{pdfcp.adpResponsable}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FileText size={16} className="text-primary shrink-0" />
          <div>
            <p className="text-muted-foreground text-xs">DRANEF</p>
            <p className="font-medium text-foreground">{pdfcp.dranef}</p>
          </div>
        </div>
      </div>

      {/* Objectifs */}
      {pdfcp.objectifs && (
        <div className="pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Objectifs</p>
          <p className="text-sm text-foreground">{pdfcp.objectifs}</p>
        </div>
      )}
    </div>
  );
};

export default PDFCPInfoCard;
