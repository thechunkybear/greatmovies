// ── Raw data types (used during pipeline) ────────────────────────────────────

export interface EbertReview {
  title: string;
  year: number;
  rating: number;       // 0–4, half-star increments
  isGreatMovie: boolean;
  reviewUrl?: string;
  imdbId?: string;      // filled in during matching
}

export interface ImdbEntry {
  imdbId: string;       // "tt1234567"
  title: string;
  year: number;
  genres: string[];
  runtime: number;      // minutes
  rating?: number;      // 0–100 (original × 10)
}

export interface TmdbMovieDetails {
  tmdbId: number;
  imdbId: string;
  title: string;
  year: number;
  overview: string;
  posterPath: string;
  genreIds: number[];
  runtime: number;
  watchProviders: number[];  // flatrate/subscription provider IDs (US)
}

export interface TmdbProvider {
  id: number;
  name: string;
  logoPath: string;
}

// ── Site data types (written to movies.json / meta.json) ─────────────────────

export interface SiteMovie {
  id: number;           // TMDB ID
  t: string;            // title
  y: number;            // year
  g: number[];          // genre IDs
  o: string;            // overview (truncated)
  p: string;            // poster path
  r: number;            // runtime minutes
  s: number[];          // streaming provider IDs
  imdb?: number;        // IMDB rating 0–100
  cr?: {
    ebert?: {
      r: number;        // rating 0–8 (stars × 2)
      g: boolean;       // isGreatMovie
      u?: string;       // review URL
    };
    // extensible: kael?: { r: number }
  };
}

export interface CriticMeta {
  key: string;
  name: string;
  maxRating: number;
  ratingStep: number;
  hasDesignation: boolean;
  designationLabel?: string;
}

export interface SiteMeta {
  genres: Array<{ id: number; name: string }>;
  decades: number[];
  services: Array<{ id: number; name: string; logo: string }>;
  critics: CriticMeta[];
  generatedAt: string;
}

// ── Merged intermediate ───────────────────────────────────────────────────────

export interface MergedMovie {
  imdbId: string;
  tmdbId: number;
  title: string;
  year: number;
  overview: string;
  posterPath: string;
  genreIds: number[];
  runtime: number;
  watchProviders: number[];
  imdbRating?: number;
  ebert: EbertReview;
}
