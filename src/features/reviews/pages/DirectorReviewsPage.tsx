import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { Button } from '../../../components/Button';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';
import type { UserListItem } from '../../../types/user';

export const DirectorReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [updates, setUpdates] = useState<DailyUpdateListItem[]>([]);
  const [team, setTeam] = useState<UserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        // Exclude own updates from review queue
        const subordinateLogs = (res.data.items || []).filter(u => u.employee_id !== user?.user_id);
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
  }, [user, selectedEmployee, statusFilter, dateFrom, dateTo, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Updates Review Queue"
        subtitle="Review, approve, request changes, or reject daily work logs submitted by your team."
        badgeText="Review Workstation"
      />

      {/* Filters Bar Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Employee filter */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">TEAM MEMBER</span>
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                >
                  <option value="">All Members</option>
                  {team.map(emp => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">STATUS</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
                >
                  <option value="">All Updates</option>
                  <option value="submitted">Submitted (Pending)</option>
                  <option value="reviewed">Reviewed (Actioned)</option>
                  <option value="draft">Drafts</option>
                </select>
              </div>

              {/* Date From */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">FROM DATE</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                />
              </div>

              {/* Date To */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">TO DATE</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedEmployee('');
                setStatusFilter('');
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

      {/* Grid listing queue */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading review queue..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReviewsQueue} />
      ) : updates.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          No daily update submissions matching your selection criteria.
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
                        {new Date(up.update_date).toLocaleDateString('en-US', {
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
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 font-semibold">
                      <span>Total Hours: {up.total_hours} hrs</span>
                      <span>•</span>
                      <span>Tasks: {up.items_count}</span>
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
