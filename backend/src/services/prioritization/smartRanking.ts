/**
 * Smart Ranking Service
 * 
 * Intelligently prioritizes MusicBrainz search results to surface the most relevant recordings.
 * Key Strategy: Original studio albums > Singles > Compilations > Bootlegs
 * 
 * Example: For "Come Together Beatles":
 * 1. Abbey Road (1969) - Original studio album - HIGH PRIORITY
 * 2. Come Together/Something (1969) - Original single - MEDIUM PRIORITY  
 * 3. 1962-1966 (Red Album) - Compilation - LOW PRIORITY
 * 4. Bootleg recordings - LOWEST PRIORITY
 */

export interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  disambiguation?: string;
  'artist-credit'?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;
  releases?: Array<{
    id: string;
    title: string;
    status: string; // 'Official', 'Bootleg', etc.
    'status-id'?: string;
    'primary-type'?: string; // 'Album', 'Single', 'EP', etc.
    'primary-type-id'?: string;
    'secondary-types'?: string[]; // ['Compilation', 'Live', etc.]
    'first-release-date'?: string;
    date?: string;
    country?: string;
    'artist-credit'?: Array<{
      name: string;
    }>;
  }>;
  relationships?: Array<{
    type: string;
    artist?: {
      name: string;
    };
  }>;
  relations?: Array<{
    type: string;
    artist?: {
      name: string;
      id: string;
    };
    attributes?: string[];
    work?: {
      id: string;
      title: string;
    };
  }>;
}

export interface ScoredResult extends MusicBrainzRecording {
  _priorityScore: number;
  _scoringReason: string;
  _bestRelease?: any;
}

export class SmartRankingService {
  // Known popular artists for enhanced scoring
  private readonly POPULAR_ARTISTS = [
    'the beatles', 'queen', 'led zeppelin', 'pink floyd',
    'david bowie', 'bob dylan', 'prince', 'michael jackson',
    'madonna', 'elvis presley', 'the rolling stones', 'radiohead',
    'nirvana', 'u2', 'the who', 'ac/dc'
  ];

  // Compilation detection keywords
  private readonly COMPILATION_KEYWORDS = [
    'greatest', 'hits', 'collection', 'best', 'compilation',
    'anthology', 'essential', 'ultimate', 'complete',
    'selected', 'classics', 'definitive', 'gold',
    'platinum', 'singles', 'rarities', 'chronicles',
    'retrospective', 'treasury', 'legend', 'very best'
  ];

  // Live/bootleg detection keywords  
  private readonly LIVE_BOOTLEG_KEYWORDS = [
    'live', 'concert', 'bootleg', 'unofficial', 'demo',
    'rehearsal', 'outtake', 'alternate', 'unreleased',
    'session', 'bbc', 'radio', 'broadcast', 'soundcheck'
  ];

  /**
   * Calculate priority score for a MusicBrainz recording
   * Higher scores = higher priority in search results
   */
  calculatePriorityScore(recording: MusicBrainzRecording, searchArtist: string): {
    score: number;
    reason: string;
    bestRelease: any;
  } {
    let score = 0;
    let reasons: string[] = [];
    let bestRelease = null;

    // Step 1: Artist match validation (essential)
    const hasArtistMatch = this.hasArtistMatch(recording, searchArtist);
    if (hasArtistMatch) {
      score += 1000;
      reasons.push('Artist match');
    } else {
      // No artist match = very low priority
      return { 
        score: score + 50, 
        reason: 'No artist match',
        bestRelease: recording.releases?.[0] || null 
      };
    }

    // Step 2: Find the best release for scoring
    bestRelease = this.findBestRelease(recording.releases || []);
    
    if (!bestRelease) {
      return { 
        score: score + 100, 
        reason: reasons.join(', ') + ', No releases',
        bestRelease: null 
      };
    }

    // Step 3: Release status scoring
    if (bestRelease.status === 'Official') {
      score += 500;
      reasons.push('Official release');
    } else if (bestRelease.status === 'Bootleg') {
      score -= 300;
      reasons.push('Bootleg');
    }

    // Step 4: Release type scoring (most important)
    const releaseTypeScore = this.scoreReleaseType(bestRelease);
    score += releaseTypeScore.score;
    reasons.push(releaseTypeScore.reason);

    // Step 5: Compilation detection penalty
    const compilationPenalty = this.detectCompilation(bestRelease.title);
    if (compilationPenalty > 0) {
      score -= compilationPenalty;
      reasons.push(`Compilation penalty (-${compilationPenalty})`);
    }

    // Step 6: Live/bootleg title detection
    const livePenalty = this.detectLiveOrBootleg(bestRelease.title);
    if (livePenalty > 0) {
      score -= livePenalty;
      reasons.push(`Live/bootleg penalty (-${livePenalty})`);
    }

    // Step 7: Popular artist bonus
    if (this.isPopularArtist(searchArtist)) {
      score += 100;
      reasons.push('Popular artist');
    }

    // Step 8: Recent disambiguation penalty (often indicates reissues/remasters)
    if (recording.disambiguation && recording.disambiguation.includes('remaster')) {
      score -= 50;
      reasons.push('Remaster');
    }

    return {
      score: Math.max(0, score), // Ensure non-negative
      reason: reasons.join(', '),
      bestRelease
    };
  }

  /**
   * Sort results by priority score, then chronologically
   */
  sortResults(results: MusicBrainzRecording[], searchArtist: string): ScoredResult[] {
    // Score all results
    const scoredResults: ScoredResult[] = results.map(recording => {
      const scoring = this.calculatePriorityScore(recording, searchArtist);
      return {
        ...recording,
        _priorityScore: scoring.score,
        _scoringReason: scoring.reason,
        _bestRelease: scoring.bestRelease
      };
    });

    // Sort by score (highest first), then by release date (earliest first)
    return scoredResults.sort((a, b) => {
      // Primary sort: priority score (highest first)
      if (a._priorityScore !== b._priorityScore) {
        return b._priorityScore - a._priorityScore;
      }

      // Secondary sort: chronological (earliest first for same score)
      const aYear = this.getEarliestYear(a.releases || []);
      const bYear = this.getEarliestYear(b.releases || []);
      return aYear - bYear;
    });
  }

  /**
   * Check if recording matches the searched artist
   */
  private hasArtistMatch(recording: MusicBrainzRecording, searchArtist: string): boolean {
    if (!searchArtist) return true; // No artist specified = match all

    const normalizedSearch = searchArtist.toLowerCase().trim();
    
    // Check recording-level artist credits
    if (recording['artist-credit']) {
      for (const credit of recording['artist-credit']) {
        if (credit.name.toLowerCase().includes(normalizedSearch) || 
            credit.artist.name.toLowerCase().includes(normalizedSearch)) {
          return true;
        }
      }
    }

    // Check release-level artist credits
    if (recording.releases) {
      for (const release of recording.releases) {
        if (release['artist-credit']) {
          for (const credit of release['artist-credit']) {
            if (credit.name.toLowerCase().includes(normalizedSearch)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Find the best release to use for scoring
   * Priority: Official albums > Official singles > Everything else
   */
  private findBestRelease(releases: any[]): any {
    if (!releases.length) return null;

    // Sort releases by preference
    const sortedReleases = releases.sort((a, b) => {
      // Official releases first
      if (a.status === 'Official' && b.status !== 'Official') return -1;
      if (b.status === 'Official' && a.status !== 'Official') return 1;

      // Albums before singles
      if (a['primary-type'] === 'Album' && b['primary-type'] !== 'Album') return -1;
      if (b['primary-type'] === 'Album' && a['primary-type'] !== 'Album') return 1;

      // Non-compilations before compilations
      const aIsCompilation = a['secondary-types']?.includes('Compilation') || 
                            this.detectCompilation(a.title) > 0;
      const bIsCompilation = b['secondary-types']?.includes('Compilation') || 
                            this.detectCompilation(b.title) > 0;
      
      if (!aIsCompilation && bIsCompilation) return -1;
      if (!bIsCompilation && aIsCompilation) return 1;

      // Earlier releases first
      const aYear = new Date(a['first-release-date'] || a.date || '2099').getFullYear();
      const bYear = new Date(b['first-release-date'] || b.date || '2099').getFullYear();
      return aYear - bYear;
    });

    return sortedReleases[0];
  }

  /**
   * Score release type (Album, Single, EP, etc.)
   */
  private scoreReleaseType(release: any): { score: number; reason: string } {
    const primaryType = release['primary-type'];
    const secondaryTypes = release['secondary-types'] || [];

    // Check for compilation in secondary types
    if (secondaryTypes.includes('Compilation')) {
      return { score: 200, reason: 'Compilation album' };
    }

    // Check for live in secondary types
    if (secondaryTypes.includes('Live')) {
      return { score: 400, reason: 'Live album' };
    }

    // Score by primary type
    switch (primaryType) {
      case 'Album':
        return { score: 800, reason: 'Studio album' };
      case 'Single':
        return { score: 600, reason: 'Single' };
      case 'EP':
        return { score: 400, reason: 'EP' };
      case 'Broadcast':
        return { score: 200, reason: 'Broadcast' };
      default:
        return { score: 300, reason: `Other (${primaryType || 'Unknown'})` };
    }
  }

  /**
   * Detect compilation albums by title keywords
   * Returns penalty points (higher = more likely compilation)
   */
  private detectCompilation(title: string): number {
    if (!title) return 0;

    const normalizedTitle = title.toLowerCase();
    let penalty = 0;

    for (const keyword of this.COMPILATION_KEYWORDS) {
      if (normalizedTitle.includes(keyword)) {
        penalty += 200; // Heavy penalty for compilation keywords
      }
    }

    // Additional checks for common compilation patterns
    if (normalizedTitle.match(/\d{4}-\d{4}/)) { // "1962-1966" pattern
      penalty += 300;
    }

    if (normalizedTitle.includes('vol') || normalizedTitle.includes('volume')) {
      penalty += 100;
    }

    return penalty;
  }

  /**
   * Detect live recordings or bootlegs by title
   */
  private detectLiveOrBootleg(title: string): number {
    if (!title) return 0;

    const normalizedTitle = title.toLowerCase();
    let penalty = 0;

    for (const keyword of this.LIVE_BOOTLEG_KEYWORDS) {
      if (normalizedTitle.includes(keyword)) {
        penalty += 150; // Moderate penalty for live/bootleg
      }
    }

    return penalty;
  }

  /**
   * Check if artist is in popular artists list
   */
  private isPopularArtist(artist: string): boolean {
    if (!artist) return false;
    const normalized = artist.toLowerCase().trim();
    return this.POPULAR_ARTISTS.includes(normalized);
  }

  /**
   * Get the earliest release year from a list of releases
   */
  private getEarliestYear(releases: any[]): number {
    if (!releases.length) return 9999;

    const years = releases
      .map(release => {
        const dateStr = release['first-release-date'] || release.date;
        if (!dateStr) return 9999;
        const year = new Date(dateStr).getFullYear();
        return isNaN(year) ? 9999 : year;
      })
      .filter(year => year > 1900 && year < 2100); // Reasonable year range

    return years.length > 0 ? Math.min(...years) : 9999;
  }

  /**
   * Debug method to explain scoring for a result
   */
  explainScoring(recording: MusicBrainzRecording, searchArtist: string): string {
    const scoring = this.calculatePriorityScore(recording, searchArtist);
    const earliestYear = this.getEarliestYear(recording.releases || []);
    
    return `Score: ${scoring.score} | Reason: ${scoring.reason} | Year: ${earliestYear === 9999 ? 'Unknown' : earliestYear}`;
  }
}

// Export singleton instance
export const smartRankingService = new SmartRankingService();