import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Clock, ChevronDown } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { AuditLogResponse } from '../../../types/auditLog';
import type { UserListItem } from '../../../types/user';

export const AdminAuditLogsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [selectedUser, setSelectedUser] = useState('');
  const [actionQuery, setActionQuery] = useState('');
  const [entityTypeQuery, setEntityTypeQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expandable log viewer
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchFiltersData = async () => {
    try {
      const res = await api.getPaginated<UserListItem>('/users', {
        page_size: 150,
      });
      setUsers(res.data?.items || []);
    } catch {
      // Fail silently
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<AuditLogResponse>('/audit-logs', {
        search: searchVal || undefined,
        user_id: selectedUser || undefined,
        action: actionQuery || undefined,
        entity_type: entityTypeQuery || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        page,
        page_size: 15,
      });

      if (res.success && res.data) {
        setLogs(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve audit log records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
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
  }, [page, searchVal, selectedUser, actionQuery, entityTypeQuery, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit Logs"
        subtitle="Inspect immutable ledger trails of system operations, diff states, and security identifiers."
        badgeText="Immutable Ledger"
      />

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Search Query</span>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="IP address, description, action..."
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* User filter */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Operating User</span>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.role_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Action query input */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Action Type</span>
              <input
                type="text"
                placeholder="LOGIN, PROFILE_UPDATED..."
                value={actionQuery}
                onChange={(e) => {
                  setActionQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            {/* Entity type input */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Entity Scope</span>
              <input
                type="text"
                placeholder="user, department, task..."
                value={entityTypeQuery}
                onChange={(e) => {
                  setEntityTypeQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">From Date</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">To Date</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-none"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchVal('');
                setSelectedUser('');
                setActionQuery('');
                setEntityTypeQuery('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listing logs */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading ledger logs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAuditLogs} />
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          No audit records found matching selected filters.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.log_id;
              return (
                <Card key={log.log_id} className="border border-slate-100">
                  <CardContent className="p-4 space-y-3">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <Badge variant="brand" className="text-[9px] uppercase font-mono font-bold py-0.5">
                          {log.action}
                        </Badge>
                        <Badge variant="neutral" className="text-[9px] lowercase font-mono py-0.5">
                          {log.entity_type}
                        </Badge>
                      </div>

                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                        IP: {log.ip_address || 'System'}
                      </span>
                    </div>

                    {/* Operational desc */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500">Triggered By:</span>{' '}
                        <span className="font-bold text-slate-800">{log.user_name || 'System Auto-Event'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Entity ID:</span>{' '}
                        <span className="font-mono text-slate-700 bg-slate-50 px-1 rounded border border-slate-100/50">
                          {log.entity_id || 'N/A'}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="py-1 px-2.5 text-[10px] uppercase font-bold"
                        rightIcon={<ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.log_id)}
                      >
                        Inspect Payload
                      </Button>
                    </div>

                    {/* Expanded Diff payload */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-mono">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 overflow-x-auto max-h-60">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Old State Data</span>
                          <pre className="text-slate-600 leading-snug">{JSON.stringify(log.old_data, null, 2) || 'null'}</pre>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 overflow-x-auto max-h-60">
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide block mb-1">New State Data</span>
                          <pre className="text-indigo-600 leading-snug">{JSON.stringify(log.new_data, null, 2) || 'null'}</pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous Page
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next Page
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
