export type ReviewStatus = 'approved' | 'changes_requested' | 'rejected';

export interface ReviewResponse {
  review_id: string;
  update_id: string;
  reviewer_id: string;
  reviewer_name: string | null;
  reviewer_code: string | null;
  review_status: ReviewStatus;
  review_comment: string | null;
  reviewed_at: string;
}
