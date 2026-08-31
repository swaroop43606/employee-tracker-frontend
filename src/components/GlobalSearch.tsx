import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  CheckSquare,
  Calendar,
  Users,
  Building2,
  Layers,
  ShieldAlert,
  Bell,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { GlobalSearchResponse, SearchResultItem, SearchEntityType } from '../types/search';

const entityIcons: Record<SearchEntityType, React.ElementType> = {
  user: Users,
  task: CheckSquare,
  daily_update: Calendar,
  notification: Bell,
  department: Building2,
  role: Layers,
  audit_log: ShieldAlert,
};

const categoryLabels: Record<string, string> = {
  users: 'Team & Users',
  tasks: 'Tasks',
  daily_updates: 'Daily Updates',
  notifications: 'Notifications',
  departments: 'Departments',
  roles: 'Roles & RBAC',
  audit_logs: 'Audit Logs',
};

const getBadgeStyle = (color?: string | null) => {
  switch (color?.toLowerCase()) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'amber':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'rose':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'violet':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'slate':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'indigo':
    default:
      return 'bg-[#fff3ea] text-[#991b1f] border-[#ffe1c5]';
  }
};

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results with debounce (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      api
        .get<GlobalSearchResponse>('/search', { q: trimmed, limit: 20 })
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
            setError(null);
          } else {
            console.error('Global search error:', res.message);
            setError(res.message || 'Unable to search right now');
            setData(null);
          }
        })
        .catch((err) => {
          console.error('Global search network failure:', err);
          setError('Unable to search right now');
          setData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Flattened results for keyboard navigation
  const flatResults = data?.results || [];

  const handleSelectResult = useCallback(
    (item: SearchResultItem) => {
      setIsOpen(false);
      setIsFocused(false);
      setQuery('');
      if (item.url) {
        navigate(item.url);
      }
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flatResults.length) {
        handleSelectResult(flatResults[selectedIndex]);
      } else if (flatResults.length > 0) {
        handleSelectResult(flatResults[0]);
      }
    }
  };

  const handleClear = () => {
    setQuery('');
    setData(null);
    setError(null);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const trimmedQuery = query.trim();
  const showDropdown = isOpen && trimmedQuery.length >= 2;

  return (
    <div className="relative max-w-md w-full" ref={containerRef}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search
          className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors ${
            isFocused ? 'text-stone-400' : 'text-white/70'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            if (!query.trim()) {
              setIsFocused(false);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, updates, team members..."
          className={`w-full pl-9 pr-9 py-1.5 text-sm rounded-xl transition-all ${
            isFocused || query
              ? 'bg-white text-stone-900 placeholder:text-stone-400 border border-white shadow-sm ring-2 ring-[#ffe1c5]/50'
              : 'bg-white/15 text-white placeholder:text-white/75 border border-white/20 hover:bg-white/20'
          } focus:outline-none`}
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3 flex items-center">
          {loading ? (
            <Loader2
              className={`w-4 h-4 animate-spin ${isFocused ? 'text-[#991b1f]' : 'text-white'}`}
            />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className={`p-0.5 rounded-full transition-colors ${
                isFocused
                  ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                  : 'text-white/70 hover:text-white hover:bg-white/20'
              }`}
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#efe7e1] max-h-96 overflow-y-auto z-50 py-2 divide-y divide-[#f5ede7] text-stone-900 animate-in fade-in zoom-in-95 duration-100">
          {/* Loading State */}
          {loading && !data && !error && (
            <div className="p-6 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-[#991b1f] animate-spin" />
              <p className="text-xs font-medium">Searching records...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-5 text-center text-rose-600 flex flex-col items-center justify-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <p className="text-xs font-semibold">{error}</p>
              <p className="text-[11px] text-stone-400">Please try again or refine your search term.</p>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && !error && data && data.total_results === 0 && (
            <div className="p-8 text-center text-stone-500">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[#fff8f3] border border-[#efe7e1] flex items-center justify-center text-[#991b1f]">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-stone-800">No results found</p>
              <p className="text-xs text-stone-400 mt-0.5">
                No matches for &ldquo;{trimmedQuery}&rdquo; within your authorized scope.
              </p>
            </div>
          )}

          {/* Results Grouped by Category */}
          {!loading &&
            !error &&
            data &&
            data.total_results > 0 &&
            Object.entries(data.categories).map(([catKey, items]) => {
              if (!items || items.length === 0) return null;
              return (
                <div key={catKey} className="py-2">
                  <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider uppercase text-stone-400">
                    {categoryLabels[catKey] || catKey}
                  </div>
                  <div className="space-y-0.5 px-1.5">
                    {items.map((item) => {
                      const overallIndex = flatResults.findIndex((r) => r.id === item.id);
                      const isSelected = overallIndex === selectedIndex;
                      const IconComponent = entityIcons[item.entity_type] || CheckSquare;

                      return (
                        <button
                          key={`${item.entity_type}-${item.id}`}
                          type="button"
                          onClick={() => handleSelectResult(item)}
                          onMouseEnter={() => setSelectedIndex(overallIndex)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left rounded-xl text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#fff3ea] text-[#991b1f] font-medium'
                              : 'hover:bg-[#fff8f3] text-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`p-1.5 rounded-lg flex-shrink-0 ${
                                isSelected
                                  ? 'bg-[#991b1f] text-white'
                                  : 'bg-[#fff8f3] border border-[#efe7e1] text-stone-600'
                              }`}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-stone-800 text-xs">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="truncate text-[11px] text-stone-400 mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.badge && (
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getBadgeStyle(
                                  item.badge_color
                                )}`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
