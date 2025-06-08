export interface ProcessedContent {
  title: string;
  text: string;
  sourceType: 'markdown' | 'html' | 'artifact';
  wordCount?: number;
  estimatedDuration?: number; // in seconds
}

export interface AudioGenerationResult {
  episodeId: string;
  fileName: string;
  filePath: string;
  duration: number;
  fileSize: number;
  title: string;
  createdAt: Date;
}

export interface Episode {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  duration: number;
  fileSize: number;
  sourceType: 'markdown' | 'url' | 'artifact';
  createdAt: Date;
  downloadCount: number;
}

export interface PodcastMetadata {
  title: string;
  description: string;
  author: string;
  email: string;
  language: string;
  baseUrl: string;
  uuid: string;
}

export interface GenerateRequest {
  content?: string;
  url?: string;
  voice?: string;
}

export interface GenerateResponse {
  success: boolean;
  message: string;
  episodeId?: string;
  downloadUrl?: string;
  duration?: number;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

// Episodes metadata file structure
export interface EpisodesMetadata {
  episodes: Episode[];
  totalCount: number;
  lastUpdated: Date;
}

// Audio generation configuration
export interface AudioConfig {
  voice: {
    gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    name: string;
  };
  audioEncoding: string;
  pitch: number; // -20.0 to 20.0
  speakingRate: number; // 0.25 to 4.0
  volumeGainDb?: number; // -96.0 to 16.0
  effectsProfileIds?: string[];
}

export interface AudioGenerationProgress {
  stage: 'preparing' | 'generating' | 'concatenating' | 'finalizing';
  progress: number; // 0-100
  message: string;
  chunksTotal?: number;
  chunksCompleted?: number;
}

export interface AudioGenerationError {
  code: 'AUTH_ERROR' | 'QUOTA_ERROR' | 'NETWORK_ERROR' | 'FFMPEG_ERROR' | 'FILE_ERROR';
  message: string;
  retryable: boolean;
}

// RSS feed configuration
export interface RSSConfig {
  title: string;
  description: string;
  feedUrl: string;
  siteUrl: string;
  author: string;
  language: string;
  email: string;
}

// Content processing types
export interface ContentProcessingError {
  code: 'FETCH_ERROR' | 'PARSE_ERROR' | 'INVALID_URL' | 'CONTENT_TOO_LARGE';
  message: string;
  originalError?: Error;
}

export interface ContentProcessingOptions {
  maxContentLength?: number;
  includeCodeBlocks?: boolean;
  includeImages?: boolean;
  cleanupLevel?: 'minimal' | 'standard' | 'aggressive';
}

// Storage-related types
export interface StorageConfig {
  metadataFile: string;
  audioDir: string;
  maxEpisodes: number;
  backupEnabled: boolean;
  compressionEnabled: boolean;
}

export interface StorageStats {
  totalEpisodes: number;
  totalDuration: number;
  totalSize: number;
  oldestEpisode: Date | null;
  newestEpisode: Date | null;
  averageEpisodeDuration: number;
  averageFileSize: number;
}

export interface BackupInfo {
  timestamp: Date;
  episodeCount: number;
  filePath: string;
  size: number;
}