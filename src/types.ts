export interface ProcessedContent {
  title: string;
  text: string;
  sourceType: 'markdown' | 'url' | 'artifact';
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
  pitch: number;
  speakingRate: number;
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