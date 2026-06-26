import axios from 'axios';
import { Job, SystemSettings } from '../types';

// Axios instance using relative API path (proxied by Vite)
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Uploads a video file to the server.
   */
  uploadVideo: async (file: File, onUploadProgress: (progressEvent: any) => void): Promise<Job> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<Job>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  /**
   * Triggers the analysis pipeline for a uploaded job.
   */
  startAnalysis: async (jobId: string): Promise<Job> => {
    const response = await apiClient.post<Job>(`/analyze/${jobId}`);
    return response.data;
  },

  /**
   * Fetches status and results of a video analysis job.
   */
  getJobStatus: async (jobId: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/status/${jobId}`);
    return response.data;
  },

  /**
   * Retrieves the analysis history, optionally filtered by name.
   */
  getHistory: async (search?: string): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/history', {
      params: search ? { search } : {},
    });
    return response.data;
  },

  /**
   * Deletes a job and its assets from the server.
   */
  deleteJob: async (jobId: string): Promise<{ detail: string }> => {
    const response = await apiClient.delete<{ detail: string }>(`/history/${jobId}`);
    return response.data;
  },

  /**
   * Gets the current configuration settings.
   */
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>('/settings');
    return response.data;
  },

  /**
   * Updates configuration settings.
   */
  updateSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    const response = await apiClient.post<SystemSettings>('/settings', settings);
    return response.data;
  },

  /**
   * Helper to resolve a frame or face crop URL.
   * Path on disk: frames/{job_id}/{filename} -> API: /api/frame/{job_id}_{filename}
   */
  getFrameUrl: (path: string): string => {
    if (!path) return '';
    // Extract job_id and filename from relative path: "frames/job_id/filename.jpg"
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    if (parts.length >= 3) {
      const jobId = parts[parts.length - 2];
      const filename = parts[parts.length - 1];
      return `/api/frame/${jobId}_${filename}`;
    }
    return '';
  },

  /**
   * Helper to resolve a Grad-CAM heatmap or overlay URL.
   * Path on disk: heatmaps/{job_id}/{filename} -> API: /api/heatmap/{job_id}_{filename}
   */
  getHeatmapUrl: (path: string): string => {
    if (!path) return '';
    // Extract job_id and filename from relative path: "heatmaps/job_id/filename.jpg"
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    if (parts.length >= 3) {
      const jobId = parts[parts.length - 2];
      const filename = parts[parts.length - 1];
      return `/api/heatmap/${jobId}_${filename}`;
    }
    return '';
  },

  /**
   * Helper to get direct PDF download URL.
   */
  getReportUrl: (jobId: string): string => {
    return `/api/report/${jobId}`;
  },
  
  /**
   * Helper to get JSON export URL.
   */
  getExportJsonUrl: (): string => {
    return '/api/history/export/json';
  },

  /**
   * Helper to get CSV export URL.
   */
  getExportCsvUrl: (): string => {
    return '/api/history/export/csv';
  }
};
