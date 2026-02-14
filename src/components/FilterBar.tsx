import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useDynamicYears } from '@/hooks/useDynamicYears';

interface FilterBarProps {
  selectedYear: string;
  selectedDranef: string;
  selectedDpanef: string;
  selectedCommune: string;
  onYearChange: (value: string) => void;
  onDranefChange: (value: string) => void;
  onDpanefChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedYear,
  selectedDranef,
  selectedDpanef,
  selectedCommune,
  onYearChange,
  onDranefChange,
  onDpanefChange,
  onCommuneChange,
}) => {
  const { getRegions, getDpanefsByDranef, getCommunesByDpanef } = useDatabase();
  const { years } = useDynamicYears();
  
  // Get all DRANEFs from DatabaseContext
  const regions = getRegions();
  const dranefs = regions.flatMap(r => r.dranef.map(d => ({ id: d.id, name: d.name })));
  
  // Get DPANEFs for selected DRANEF
  const dpanefs = selectedDranef && selectedDranef !== 'all' 
    ? getDpanefsByDranef(selectedDranef).map(d => ({ id: d.id, name: d.name }))
    : [];
  
  // Get Communes for selected DPANEF
  const communes = selectedDpanef && selectedDpanef !== 'all'
    ? getCommunesByDpanef(selectedDpanef).map(c => ({ id: c.id, name: c.name }))
    : [];

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Année</label>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="h-10 bg-background border-border rounded-xl">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les années</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">DRANEF</label>
          <Select value={selectedDranef} onValueChange={(value) => {
            onDranefChange(value);
            onDpanefChange('');
            onCommuneChange('');
          }}>
            <SelectTrigger className="h-10 bg-background border-border rounded-xl">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {dranefs.map((dranef) => (
                <SelectItem key={dranef.id} value={dranef.id}>
                  {dranef.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">DPANEF</label>
          <Select 
            value={selectedDpanef} 
            onValueChange={(value) => {
              onDpanefChange(value);
              onCommuneChange('');
            }}
            disabled={!selectedDranef || selectedDranef === 'all'}
          >
            <SelectTrigger className="h-10 bg-background border-border rounded-xl">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {dpanefs.map((dpanef) => (
                <SelectItem key={dpanef.id} value={dpanef.id}>
                  {dpanef.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Commune</label>
          <Select 
            value={selectedCommune} 
            onValueChange={onCommuneChange}
            disabled={!selectedDpanef || selectedDpanef === 'all'}
          >
            <SelectTrigger className="h-10 bg-background border-border rounded-xl">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {communes.map((commune) => (
                <SelectItem key={commune.id} value={commune.id}>
                  {commune.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
