export interface AttachmentResponse {
  attachment_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string | null;
  uploader_name: string | null;
  update_id: string | null;
  comment_id: string | null;
  created_at: string;
}
