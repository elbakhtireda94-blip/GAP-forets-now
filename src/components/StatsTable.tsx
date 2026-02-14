import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const StatsTable: React.FC = () => {
  const { regionStats } = useDashboardStats();

  // Filter out regions with no data
  const filteredStats = regionStats.filter(r => r.pdfcp > 0 || r.adp > 0 || r.activites > 0);

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Statistiques par Région</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Région</TableHead>
              <TableHead className="text-center font-semibold">ADP</TableHead>
              <TableHead className="text-center font-semibold">PDFCP</TableHead>
              <TableHead className="text-center font-semibold">ODF</TableHead>
              <TableHead className="text-center font-semibold">Activités</TableHead>
              <TableHead className="text-center font-semibold">Conflits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune donnée disponible
                </TableCell>
              </TableRow>
            ) : (
              filteredStats.map((row) => (
                <TableRow 
                  key={row.regionId}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium text-sm">{row.region}</TableCell>
                  <TableCell className="text-center">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-sm font-medium">
                      {row.adp}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-lg text-sm font-medium">
                      {row.pdfcp}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">{row.odf}</TableCell>
                  <TableCell className="text-center text-sm">{row.activites}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                      (row.conflits + row.oppositions) > 5 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {row.conflits + row.oppositions}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StatsTable;
