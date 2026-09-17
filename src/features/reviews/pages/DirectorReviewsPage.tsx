import React, { useEffect, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Calendar, ArrowRight, Clock, Search } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { Button } from '../../../components/Button';
import { formatDate, formatDateTime } from '../../../utils/date';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';
import type { UserListItem } from '../../../types/user';

export const DirectorReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [updates, setUpdates] = useState<DailyUpdateListItem[]>([]);
  const [team, setTeam] = useState<UserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchInputValue, setSearchInputValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 350ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchInputValue);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  useEffect(() => {
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      setPage(1);
    }
  }, [urlStatus]);

  const fetchFiltersData = async () => {
    try {
      const res = await api.getPaginated<UserListItem>('/users', {
        page_size: 100,
        status_filter: 'active',
      });
      const employees = (res.data?.items || []).filter(u => u.user_id !== user?.user_id);
      setTeam(employees);
    } catch {
      // Ignore filter dropdown loading errors
    }
  };

  const fetchReviewsQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<DailyUpdateListItem>('/daily-updates', {
        employee_id: selectedEmployee || undefined,
        status_filter: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: debouncedSearchValue.trim() || undefined,
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        // Exclude own updates from review queue, and exclude unsubmitted drafts unless explicitly filtered
        const subordinateLogs = (res.data.items || []).filter(u => {
          if (u.employee_id === user?.user_id) return false;
          if (!statusFilter && u.overall_status === 'draft') return false;
          return true;
        });
        setUpdates(subordinateLogs);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve daily updates logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, [user]);

  useEffect(() => {
    fetchReviewsQueue();
  }, [user, selectedEmployee, statusFilter, dateFrom, dateTo, debouncedSearchValue, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Updates Review Queue"
        subtitle="Review, approve, request changes, or reject daily work logs submitted by your team."
        badgeText="Review Workstation"
      />

      {/* Filters Bar Card */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employees or updates..."
                value={searchInputValue}
                onChange={(e) => {
                  setSearchInputValue(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Employee filter */}
            <select
              aria-label="Filter by team member"
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Members</option>
              {team.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.full_name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              aria-label="Filter by update status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Updates</option>
              <option value="submitted">Submitted (Pending)</option>
              <option value="reviewed">Reviewed (Actioned)</option>
              <option value="draft">Drafts</option>
            </select>

            {/* From Date */}
            <input
              type="date"
              aria-label="From Date"
              title="From Date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
            />

            {/* To Date */}
            <input
              type="date"
              aria-label="To Date"
              title="To Date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchInputValue('');
              setDebouncedSearchValue('');
              setSelectedEmployee('');
              setStatusFilter('');
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {/* Grid listing queue */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading review queue..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReviewsQueue} />
      ) : updates.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          {debouncedSearchValue || selectedEmployee || statusFilter || dateFrom || dateTo
            ? 'No daily updates match your search or filters.'
            : 'No daily update submissions matching your selection criteria.'}
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {updates.map((up) => (
              <Card
                key={up.update_id}
                hoverEffect
                className={`border-l-4 transition-all ${
                  up.overall_status === 'submitted'
                    ? 'border-l-amber-500 bg-amber-50/5'
                    : 'border-l-slate-200 bg-white'
                }`}
              >
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-800">
                        <span className="text-slate-500 font-semibold text-xs mr-1">Work Date:</span>
                        {formatDate(up.work_date || up.update_date, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </h4>
                      <Badge
                        variant={
                          up.overall_status === 'reviewed'
                            ? 'success'
                            : up.overall_status === 'submitted'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="uppercase text-[9px] py-0 px-2 font-bold"
                      >
                        {up.overall_status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span>Employee: {up.employee_name} ({up.employee_code})</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                      {up.summary || 'No summary comments recorded.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-1 font-medium">
                      <span><strong className="font-semibold text-slate-700">Total Hours:</strong> {up.total_hours} hrs</span>
                      <span>•</span>
                      <span><strong className="font-semibold text-slate-700">Tasks:</strong> {up.items_count}</span>
                      {up.submitted_at && (
                        <>
                          <span>•</span>
                          <span>
                            <strong className="font-semibold text-slate-700">Submitted:</strong> {formatDateTime(up.submitted_at)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <strong className="font-semibold text-slate-700">Last updated by employee:</strong> {formatDateTime(up.employee_updated_at || up.created_at)}
                      </span>
                    </div>
                  </div>

                  <NavLink to={`/director/daily-updates/${up.update_id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Review Workspace
                    </Button>
                  </NavLink>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous Page
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next Page
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DirectorReviewsPage;
