import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { Button } from '../../../components/Button';
import { formatDate, formatDateTime, getLocalDate } from '../../../utils/date';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';

export const DailyUpdatesListPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [updates, setUpdates] = useState<DailyUpdateListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<DailyUpdateListItem>('/daily-updates', {
        employee_id: user?.user_id,
        status_filter: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        setUpdates(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve daily update logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, page, statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback & Reviews"
        subtitle="Browse your past daily updates, director reviews, and feedback history."
        badgeText="Update History"
      />

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Date From */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">DATE FROM</span>
                <input
                  type="date"
                  max={getLocalDate()}
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Date To */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">DATE TO</span>
                <input
                  type="date"
                  max={getLocalDate()}
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Status Select */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 mb-1">STATUS</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setStatusFilter('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History logs */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading updates log..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchHistory} />
      ) : updates.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-sm">
          No daily updates match your current filter parameters.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {updates.map((update) => (
              <Card key={update.update_id} hoverEffect>
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-800">
                        <span className="text-slate-500 font-semibold text-xs mr-1">Work Date:</span>
                        {formatDate(update.work_date || update.update_date, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </h4>
                      <Badge
                        variant={
                          update.overall_status === 'reviewed'
                            ? 'success'
                            : update.overall_status === 'submitted'
                            ? 'info'
                            : 'neutral'
                        }
                        className="uppercase"
                      >
                        {update.overall_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl truncate mt-1">
                      {update.summary || 'No summary comments recorded.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 mt-2 font-medium">
                      <span><strong className="font-semibold text-slate-700">Total Hours:</strong> {update.total_hours} hrs</span>
                      <span>•</span>
                      <span><strong className="font-semibold text-slate-700">Tasks:</strong> {update.items_count}</span>
                      {update.submitted_at && (
                        <>
                          <span>•</span>
                          <span>
                            <strong className="font-semibold text-slate-700">Submitted:</strong> {formatDateTime(update.submitted_at)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <strong className="font-semibold text-slate-700">Last updated by employee:</strong> {formatDateTime(update.employee_updated_at || update.created_at)}
                      </span>
                    </div>
                  </div>

                  <NavLink to={`/employee/daily-updates/${update.update_id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      View details
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

export default DailyUpdatesListPage;
