import { supabase } from './supabase';
import { ClientDocument } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'client-documents';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function uploadDocument(
  clientId: string,
  file: File
): Promise<ClientDocument> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of 20MB`);
  }

  const docId = uuidv4();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${clientId}/${docId}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  return {
    id: docId,
    name: file.name,
    type: file.type,
    size: file.size,
    storagePath,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteDocument(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export async function getDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function deleteAllClientDocuments(clientId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(clientId);

  if (listError) {
    throw new Error(`Failed to list documents: ${listError.message}`);
  }

  if (files && files.length > 0) {
    const paths = files.map(f => `${clientId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);

    if (deleteError) {
      throw new Error(`Failed to delete documents: ${deleteError.message}`);
    }
  }
}
