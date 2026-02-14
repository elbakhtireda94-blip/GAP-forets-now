import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';

export interface HierarchicalFilters {
  year?: string;
  dranef?: string;
  dpanef?: string;
  commune?: string;
  adp?: string;
  status?: string;
}

interface FilterBarHierarchicalProps {
  filters: HierarchicalFilters;
  onFiltersChange: (filters: HierarchicalFilters) => void;
  showYear?: boolean;
  showStatus?: boolean;
  showAdp?: boolean;
  statusOptions?: { value: string; label: string }[];
  yearOptions?: number[];
  className?: string;
}

const NONE_VALUE = '__none__';

const FilterBarHierarchical: React.FC<FilterBarHierarchicalProps> = ({
  filters,
  onFiltersChange,
  showYear = true,
  showStatus = false,
  showAdp = false,
  statusOptions = [],
  yearOptions,
  className = '',
}) => {
  const { user } = useAuth();
  const database = useDatabase();

  // Get hierarchical data
  const regions = useMemo(() => database.getRegions(), [database]);

  // Build DRANEF list based on user scope
  const dranefList = useMemo(() => {
    const allDranef: { id: string; name: string }[] = [];
    regions.forEach((region) => {
      region.dranef.forEach((dr) => {
        // Filter by user scope if REGIONAL
        if (user?.scope_level === 'REGIONAL' && user.dranef_id !== dr.id) return;
        allDranef.push({ id: dr.id, name: dr.name });
      });
    });
    return allDranef;
  }, [regions, user]);

  // Build DPANEF list based on selected DRANEF
  const dpanefList = useMemo(() => {
    if (!filters.dranef) return [];
    const allDpanef: { id: string; name: string }[] = [];
    regions.forEach((region) => {
      region.dranef.forEach((dr) => {
        if (dr.id !== filters.dranef) return;
        dr.dpanef.forEach((dp) => {
          // Filter by user scope if PROVINCIAL
          if (user?.scope_level === 'PROVINCIAL' && user.dpanef_id !== dp.id) return;
          allDpanef.push({ id: dp.id, name: dp.name });
        });
      });
    });
    return allDpanef;
  }, [regions, filters.dranef, user]);

  // Build commune list based on selected DPANEF
  const communeList = useMemo(() => {
    if (!filters.dpanef) return [];
    const allCommunes: { id: string; name: string }[] = [];
    regions.forEach((region) => {
      region.dranef.forEach((dr) => {
        dr.dpanef.forEach((dp) => {
          if (dp.id !== filters.dpanef) return;
          dp.communes.forEach((c) => {
            // Filter by user scope if LOCAL
            if (user?.scope_level === 'LOCAL' && !user.commune_ids?.includes(c.id)) return;
            allCommunes.push({ id: c.id, name: c.name });
          });
        });
      });
    });
    return allCommunes;
  }, [regions, filters.dpanef, user]);

  // Year options
  const years = useMemo(() => {
    if (yearOptions) return yearOptions;
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, [yearOptions]);

  // Check if user can see higher-level filters
  const canFilterDranef = ['ADMIN', 'NATIONAL'].includes(user?.scope_level || '');
  const canFilterDpanef = ['ADMIN', 'NATIONAL', 'REGIONAL'].includes(user?.scope_level || '');
  const canFilterCommune = ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL'].includes(user?.scope_level || '');

  const handleChange = (key: keyof HierarchicalFilters, value: string) => {
    const newValue = value === NONE_VALUE ? '' : value;
    const newFilters = { ...filters, [key]: newValue };

    // Reset cascading filters
    if (key === 'dranef') {
      newFilters.dpanef = '';
      newFilters.commune = '';
      newFilters.adp = '';
    } else if (key === 'dpanef') {
      newFilters.commune = '';
      newFilters.adp = '';
    } else if (key === 'commune') {
      newFilters.adp = '';
    }

    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      year: '',
      dranef: user?.scope_level === 'REGIONAL' ? user.dranef_id || '' : '',
      dpanef: user?.scope_level === 'PROVINCIAL' ? user.dpanef_id || '' : '',
      commune: '',
      adp: '',
      status: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v && v !== '');

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Filter className="h-4 w-4 text-muted-foreground" />

      {showYear && (
        <Select value={filters.year || NONE_VALUE} onValueChange={(v) => handleChange('year', v)}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Toutes</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {canFilterDranef && dranefList.length > 0 && (
        <Select value={filters.dranef || NONE_VALUE} onValueChange={(v) => handleChange('dranef', v)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="DRANEF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Toutes DRANEF</SelectItem>
            {dranefList.map((dr) => (
              <SelectItem key={dr.id} value={dr.id}>
                {dr.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {canFilterDpanef && dpanefList.length > 0 && (
        <Select value={filters.dpanef || NONE_VALUE} onValueChange={(v) => handleChange('dpanef', v)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="DPANEF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Toutes DPANEF</SelectItem>
            {dpanefList.map((dp) => (
              <SelectItem key={dp.id} value={dp.id}>
                {dp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {canFilterCommune && communeList.length > 0 && (
        <Select value={filters.commune || NONE_VALUE} onValueChange={(v) => handleChange('commune', v)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Commune" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Toutes communes</SelectItem>
            {communeList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showStatus && statusOptions.length > 0 && (
        <Select value={filters.status || NONE_VALUE} onValueChange={(v) => handleChange('status', v)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Tous</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  );
};

export default FilterBarHierarchical;
