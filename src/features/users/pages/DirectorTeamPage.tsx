import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { Button } from '../../../components/Button';
import type { UserListItem } from '../../../types/user';

export const DirectorTeamPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [team, setTeam] = useState<UserListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<UserListItem>('/users', {
        search: searchQuery || undefined,
        status_filter: statusFilter || undefined,
        page,
        page_size: 12,
      });

      if (res.success && res.data) {
        // Exclude the director themselves
        const filtered = (res.data.items || []).filter(u => u.user_id !== user?.user_id);
        setTeam(filtered);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reporting team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [user, searchQuery, statusFilter, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team Directory"
        subtitle="Manage and monitor subordinate employees within your reporting hierarchy."
        badgeText="Team Hub"
      />

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, designation..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPage(1);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team grid */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading team directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTeam} />
      ) : team.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No reporting employees match the criteria.
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <Card key={member.user_id} hoverEffect className="flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  {/* Photo & Basic details */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                        {member.employee_code || 'EMP-TEMP'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 truncate leading-snug">
                        {member.full_name}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-semibold truncate block mt-0.5">
                        {member.designation || 'Staff Employee'}
                      </span>
                    </div>
                  </div>

                  {/* Metadata fields */}
                  <div className="pt-2 border-t border-slate-100/80 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Department</span>
                      <span className="font-semibold text-slate-700">{member.department_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[170px]">{member.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status</span>
                      <Badge
                        variant={member.status === 'active' ? 'success' : member.status === 'inactive' ? 'neutral' : 'danger'}
                        className="uppercase text-[9px] py-0 px-2 font-bold"
                      >
                        {member.status}
                      </Badge>
                    </div>
                  </div>

                  {/* View Details Action */}
                  <div className="pt-2">
                    <NavLink to={`/director/employees/${member.user_id}`} className="block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        View Profile & Tasks
                      </Button>
                    </NavLink>
                  </div>
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

export default DirectorTeamPage;
