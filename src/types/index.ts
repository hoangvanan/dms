export type UserRole = 'admin' | 'editor' | 'viewer'
export type DocumentStatus = 'processing' | 'verification' | 'released' | 'archived'
export type AuditAction =
  | 'upload' | 'view' | 'download' | 'edit_metadata'
  | 'verify' | 'release' | 'archive' | 'revision_upload'
  | 'status_change' | 'user_created' | 'user_updated'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DocumentCategory {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface DrawingGroup {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Document {
  id: string
  document_number: string
  title: string
  description: string | null
  category_id: string
  drawing_group_id: string | null
  project: string | null
  manufacturer: string | null
  current_revision: string | null
  status: DocumentStatus
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: string
  verified_by: string | null
  verified_at: string | null
  released_by: string | null
  released_at: string | null
  created_at: string
  updated_at: string
  // Joined
  document_categories?: DocumentCategory
  drawing_groups?: DrawingGroup
  profiles?: Profile
  document_part_numbers?: DocumentPartNumber[]
  document_projects?: DocumentProject[]
  verified_by_profile?: Profile
  released_by_profile?: Profile
}

export interface DocumentPartNumber {
  id: string
  document_id: string
  part_number: string
  description: string | null
  mpn: string | null
  created_at: string
}

export interface DocumentProject {
  id: string
  document_id: string
  project: string
  created_at: string
}

export interface DocumentRevision {
  id: string
  document_id: string
  revision: string | null
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  change_description: string | null
  status: DocumentStatus
  uploaded_by: string
  verified_by: string | null
  released_by: string | null
  created_at: string
  profiles?: Profile
}

export interface AuditLog {
  id: string
  user_id: string
  action: AuditAction
  document_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
  created_at: string
  profiles?: Profile
  documents?: Document
}
