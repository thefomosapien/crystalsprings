'use client';

export interface FilterState {
  arrival: Date | null;
  departure: Date | null;
  guests: number | null;
  type: 'any' | 'tent' | 'rv' | 'group';
  hookups: 'any' | 'water' | 'electric' | 'full';
  river_access: boolean;
  pet_friendly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  arrival: null,
  departure: null,
  guests: null,
  type: 'any',
  hookups: 'any',
  river_access: false,
  pet_friendly: false,
};

function dateToStr(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function strToDate(s: string): Date | null {
  if (!s) return null;
  return new Date(s + 'T00:00:00');
}

// ---------------------------------------------------------------------------
// Button group helper
// ---------------------------------------------------------------------------

function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${
            value === opt.value
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle helper
// ---------------------------------------------------------------------------

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
          checked ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition mt-0.5 ${
            checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const set = (patch: Partial<FilterState>) =>
    onChange({ ...filters, ...patch });

  const hasFilters =
    filters.arrival !== null ||
    filters.departure !== null ||
    filters.guests !== null ||
    filters.type !== 'any' ||
    filters.hookups !== 'any' ||
    filters.river_access ||
    filters.pet_friendly;

  return (
    <div className="overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0">
      <div className="flex items-end gap-4 min-w-max md:flex-wrap md:min-w-0">
        {/* Date range */}
        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Arrival
            </label>
            <input
              type="date"
              value={dateToStr(filters.arrival)}
              onChange={(e) => set({ arrival: strToDate(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Departure
            </label>
            <input
              type="date"
              value={dateToStr(filters.departure)}
              min={dateToStr(filters.arrival)}
              onChange={(e) => set({ departure: strToDate(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Guest count */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Guests
          </label>
          <input
            type="number"
            min={1}
            placeholder="Any"
            value={filters.guests ?? ''}
            onChange={(e) =>
              set({ guests: e.target.value ? Number(e.target.value) : null })
            }
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-20"
          />
        </div>

        {/* Site type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Type
          </label>
          <ButtonGroup
            options={[
              { value: 'any' as const, label: 'Any' },
              { value: 'tent' as const, label: 'Tent' },
              { value: 'rv' as const, label: 'RV' },
              { value: 'group' as const, label: 'Group' },
            ]}
            value={filters.type}
            onChange={(v) => set({ type: v })}
          />
        </div>

        {/* Hookups */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Hookups
          </label>
          <ButtonGroup
            options={[
              { value: 'any' as const, label: 'Any' },
              { value: 'water' as const, label: 'Water' },
              { value: 'electric' as const, label: 'Electric' },
              { value: 'full' as const, label: 'Full' },
            ]}
            value={filters.hookups}
            onChange={(v) => set({ hookups: v })}
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-4 items-end pb-0.5">
          <Toggle
            label="River access"
            checked={filters.river_access}
            onChange={(v) => set({ river_access: v })}
          />
          <Toggle
            label="Pet friendly"
            checked={filters.pet_friendly}
            onChange={(v) => set({ pet_friendly: v })}
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-sm text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap pb-0.5"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
