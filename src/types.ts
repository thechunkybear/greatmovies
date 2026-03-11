export interface ServiceMeta { id: number; name: string; logo: string; }
export interface GenreMeta { id: number; name: string; }
export interface CriticMeta {
  key: string;
  name: string;
  maxRating: number;
  ratingStep: number;
  hasDesignation: boolean;
  designationLabel?: string;
}
export interface SiteMeta {
  genres: GenreMeta[];
  decades: number[];
  services: ServiceMeta[];
  critics: CriticMeta[];
  generatedAt: string;
}
export interface Movie {
  id: number;
  t: string;
  y: number;
  g: number[];
  o: string;
  p: string;
  r: number;
  s: number[];
  imdb?: number;
  cr?: {
    ebert?: { r: number; g: boolean; u?: string };
    [key: string]: { r: number; g: boolean; u?: string } | undefined;
  };
}
