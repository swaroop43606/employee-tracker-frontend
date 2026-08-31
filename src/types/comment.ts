export interface CommentResponse {
  comment_id: string;
  update_id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  parent_comment_id: string | null;
  comment_text: string;
  is_edited: boolean;
  is_deleted: boolean;
  replies_count: number;
  created_at: string;
  updated_at: string;
  replies: CommentResponse[];
}
