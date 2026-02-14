import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDatabase } from '@/contexts/DatabaseContext';

interface CascadingDropdownsProps {
  regionId: string;
  dranefId: string;
  dpanefId: string;
  communeId: string;
  onRegionChange: (value: string) => void;
  onDranefChange: (value: string) => void;
  onDpanefChange: (value: string) => void;
  onCommuneChange: (value: string) => void;
  disabled?: boolean;
  showLabels?: boolean;
  compact?: boolean;
}

const CascadingDropdowns: React.FC<CascadingDropdownsProps> = ({
  regionId,
  dranefId,
  dpanefId,
  communeId,
  onRegionChange,
  onDranefChange,
  onDpanefChange,
  onCommuneChange,
  disabled = false,
  showLabels = true,
  compact = false,
}) => {
  const { getRegions, getDranefsByRegion, getDpanefsByDranef, getCommunesByDpanef } = useDatabase();

  const regions = getRegions();
  const dranefs = regionId ? getDranefsByRegion(regionId) : [];
  const dpanefs = dranefId ? getDpanefsByDranef(dranefId) : [];
  const communes = dpanefId ? getCommunesByDpanef(dpanefId) : [];

  const handleRegionChange = (value: string) => {
    onRegionChange(value);
    onDranefChange('');
    onDpanefChange('');
    onCommuneChange('');
  };

  const handleDranefChange = (value: string) => {
    onDranefChange(value);
    onDpanefChange('');
    onCommuneChange('');
  };

  const handleDpanefChange = (value: string) => {
    onDpanefChange(value);
    onCommuneChange('');
  };

  const gridClass = compact 
    ? "grid grid-cols-2 gap-3" 
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">Région</Label>}
        <Select value={regionId} onValueChange={handleRegionChange} disabled={disabled}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Sélectionner une région" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {regions.map(region => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">DRANEF</Label>}
        <Select value={dranefId} onValueChange={handleDranefChange} disabled={disabled || !regionId}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Sélectionner DRANEF" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {dranefs.map(dranef => (
              <SelectItem key={dranef.id} value={dranef.id}>
                {dranef.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">DPANEF</Label>}
        <Select value={dpanefId} onValueChange={handleDpanefChange} disabled={disabled || !dranefId}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Sélectionner DPANEF" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {dpanefs.map(dpanef => (
              <SelectItem key={dpanef.id} value={dpanef.id}>
                {dpanef.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">Commune</Label>}
        <Select value={communeId} onValueChange={onCommuneChange} disabled={disabled || !dpanefId}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Sélectionner commune" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {communes.map(commune => (
              <SelectItem key={commune.id} value={commune.id}>
                {commune.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CascadingDropdowns;
