import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Clock,
  ChevronDown,
  RotateCcw,
  ShieldAlert,
  User as UserIcon,
  Calendar,
  Layers,
  Fingerprint,
} from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { AuditLogResponse, AuditLogUserItem } from '../../../types/auditLog';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PAGE_SIZE = 25;

export const AdminAuditLogsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Available filter options
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [filterUsers, setFilterUsers] = useState<AuditLogUserItem[]>([]);

  // Filter values
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expandable log viewer
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch filter metadata (actions and historical users)
  const fetchFilterMetadata = async () => {
    try {
      const [actionsRes, usersRes] = await Promise.allSettled([
        api.get<string[]>('/audit-logs/actions'),
        api.get<AuditLogUserItem[]>('/audit-logs/users'),
      ]);

      if (actionsRes.status === 'fulfilled' && actionsRes.value.data) {
        setActionTypes(actionsRes.value.data);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data) {
        setFilterUsers(usersRes.value.data);
      }
    } catch {
      // Fallback silently if metadata endpoints fail
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<AuditLogResponse>('/audit-logs', {
        search: searchVal.trim() || undefined,
        action: selectedAction || undefined,
        user_id: selectedUser || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: PAGE_SIZE,
      });

      if (res.success && res.data) {
        setLogs(res.data.items || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve audit log records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterMetadata();
  }, []);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== searchVal) {
      setSearchVal(q);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAuditLogs();
  }, [page, searchVal, selectedAction, selectedUser, dateFrom, dateTo]);

  // Handle date preset selection
  const handleDatePresetChange = (preset: 'all' | 'today' | '7days' | '30days' | 'custom') => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'today') {
      const todayStr = formatLocalDate(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setDateFrom(formatLocalDate(past7));
      setDateTo(formatLocalDate(now));
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setDateFrom(formatLocalDate(past30));
      setDateTo(formatLocalDate(now));
    }
  };

  const handleResetFilters = () => {
    setSearchVal('');
    setSelectedAction('');
    setSelectedUser('');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const isFiltered = Boolean(
    searchVal || selectedAction || selectedUser || datePreset !== 'all' || dateFrom || dateTo
  );

  // Pagination helper window
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: (number | string)[] = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    if (page - delta > 2) {
      range.unshift('...');
    }
    if (page + delta < totalPages - 1) {
      range.push('...');
    }
    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }
    return range;
  }, [page, totalPages]);

  const startRecord = (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit Logs"
        subtitle="Inspect immutable ledger trails of system operations, diff states, and security identifiers."
        badgeText={totalCount > 0 ? `${totalCount.toLocaleString()} Total Audit Events` : 'Immutable Ledger'}
      />

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="flex flex-col md:col-span-2">
              <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-400" />
                Search Logs
              </span>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by action, user, entity, email, code, IP..."
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#991b1f]/20 focus:border-[#991b1f]"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Action Type
              </span>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#991b1f]/20 focus:border-[#991b1f]"
              >
                <option value="">All Actions ({actionTypes.length})</option>
                {actionTypes.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Historical User Filter */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-slate-400" />
                User Filter
              </span>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#991b1f]/20 focus:border-[#991b1f]"
              >
                <option value="">All Users ({filterUsers.length})</option>
                {filterUsers.map((u) => {
                  const statusSuffix = u.status !== 'active' ? ` [${u.status}]` : '';
                  return (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.employee_code}){statusSuffix}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Date Presets & Custom Range */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Date Range:
              </span>
              {(['all', 'today', '7days', '30days', 'custom'] as const).map((preset) => {
                const labels: Record<string, string> = {
                  all: 'All Time',
                  today: 'Today',
                  '7days': 'Last 7 Days',
                  '30days': 'Last 30 Days',
                  custom: 'Custom Range',
                };
                const isActive = datePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleDatePresetChange(preset)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      isActive
                        ? 'bg-[#991b1f] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            {/* Custom Range Inputs (Shown when custom is selected) */}
            {datePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span className="text-[10px] uppercase font-bold text-slate-400">From:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-[#991b1f]"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span className="text-[10px] uppercase font-bold text-slate-400">To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-[#991b1f]"
                  />
                </div>
              </div>
            )}

            {isFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-600 hover:text-slate-900 ml-auto md:ml-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Listing Logs */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading security audit trail..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAuditLogs} />
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-xs space-y-3">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">No audit records match your filters.</p>
          <p className="text-slate-400 text-[11px]">Try adjusting your search criteria, action type, or date range.</p>
          {isFiltered && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Clear All Filters
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.log_id;
              const formattedTime = new Date(log.created_at).toLocaleString();

              return (
                <Card key={log.log_id} className="border border-slate-150 hover:border-slate-300 transition-colors shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formattedTime}
                        </span>
                        <Badge variant="brand" className="text-[10px] uppercase font-mono font-bold py-0.5 bg-[#991b1f]/10 text-[#991b1f] border border-[#991b1f]/20">
                          {log.action}
                        </Badge>
                        <Badge variant="neutral" className="text-[10px] lowercase font-mono py-0.5 bg-slate-100 text-slate-700">
                          {log.entity_type}
                        </Badge>
                        {log.entity_id && (
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            ID: {log.entity_id}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Fingerprint className="w-3 h-3 text-slate-400" />
                        IP: {log.ip_address || 'System'}
                      </span>
                    </div>

                    {/* Operational actor and metadata */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-500">Triggered By:</span>
                        {log.user_name ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{log.user_name}</span>
                            {log.user_employee_code && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {log.user_employee_code}
                              </span>
                            )}
                            {log.user_role && (
                              <span className="text-[10px] uppercase font-semibold text-slate-500">
                                ({log.user_role})
                              </span>
                            )}
                            {log.user_email && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                &lt;{log.user_email}&gt;
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-600 italic">System Auto-Event</span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="py-1 px-2.5 text-[10px] uppercase font-bold text-slate-600 hover:text-slate-900 ml-auto sm:ml-0"
                        rightIcon={
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        }
                        onClick={() => setExpandedLogId(isExpanded ? null : log.log_id)}
                      >
                        Inspect Payload
                      </Button>
                    </div>

                    {/* Expanded Diff Payload Viewer */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-mono">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-x-auto max-h-64">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Old State Data
                          </span>
                          <pre className="text-slate-700 leading-snug">
                            {log.old_data && Object.keys(log.old_data).length > 0
                              ? JSON.stringify(log.old_data, null, 2)
                              : 'null'}
                          </pre>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-x-auto max-h-64">
                          <span className="text-[9px] font-bold text-[#991b1f] uppercase tracking-wider block mb-1">
                            New State Data
                          </span>
                          <pre className="text-[#991b1f] leading-snug">
                            {log.new_data && Object.keys(log.new_data).length > 0
                              ? JSON.stringify(log.new_data, null, 2)
                              : 'null'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Server-Side Pagination Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600 font-medium">
              Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{' '}
              <span className="font-semibold text-slate-900">{endRecord}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalCount.toLocaleString()}</span> events
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((pNum, idx) => {
                  if (pNum === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-1.5 text-xs text-slate-400">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = pNum === page;
                  return (
                    <button
                      key={`page-${pNum}`}
                      type="button"
                      onClick={() => setPage(pNum as number)}
                      className={`min-w-[28px] h-7 text-xs rounded-md font-medium transition-colors ${
                        isCurrent
                          ? 'bg-[#991b1f] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
