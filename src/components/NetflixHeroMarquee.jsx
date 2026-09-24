import React from "react";
import {
  Play,
  Zap,
  Star,
  Tv,
  Check,
  Plus,
  Flame,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export default function NetflixHeroMarquee({
  movie,
  currentIndex = 0,
  totalCount = 1,
  onSelectIndex,
  onPlay,
  onTorrent,
  onWatchlist,
  isSaved = false,
  onShuffle,
  onHoverChange
}) {
  if (!movie) return null;

  // Generate a high-resolution backdrop URL if it is a TMDB image
  const backdropUrl = movie.Poster && movie.Poster.includes("image.tmdb.org/t/p/")
    ? movie.Poster.replace(/\/w[0-9]+\//, "/original/")
    : movie.Poster;

  const isSeries = movie.Type === "series";

  return (
    <div
      className="netflix-hero-marquee"
      onMouseEnter={() => onHoverChange && onHoverChange(true)}
      onMouseLeave={() => onHoverChange && onHoverChange(false)}
    >
      {/* Cinematic Dynamic Backdrop with Deep Gradient Overlays */}
      <div
        className="marquee-backdrop-image"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : "none"
        }}
      />
      <div className="marquee-gradient-overlay" />
      <div className="marquee-ambient-glow" />

      {/* Main Content Container */}
      <div className="marquee-inner">
        {/* Left Column: Movie Info & CTAs */}
        <div className="marquee-info-col">
          {/* Top Trending Badge */}
          <div className="marquee-badge-row">
            <span className="marquee-trending-badge">
              <Flame size={14} className="flame-icon" />
              <span>#1 SPOTLIGHT TODAY</span>
            </span>
            <span className="marquee-adfree-badge">
              <ShieldCheck size={13} style={{ color: "var(--accent-green)" }} />
              <span>Zero Popups • 4K Real Stream</span>
            </span>
            <span className="marquee-quality-pill">4K ULTRA HD</span>
          </div>

          {/* Big Cinematic Title */}
          <h1 className="marquee-title" title={movie.Title}>
            {movie.Title}
          </h1>

          {/* Meta Info Row */}
          <div className="marquee-meta-row">
            <div className="meta-pill rating">
              <Star size={14} fill="var(--accent-gold)" color="var(--accent-gold)" />
              <span className="rating-val">{movie.imdbRating || "8.5"}</span>
              <span className="rating-max">/10</span>
            </div>

            <span className="meta-pill year">{movie.Year}</span>

            {isSeries ? (
              <span className="meta-pill series">
                <Tv size={13} /> {movie.TotalSeasons || 1} Season{movie.TotalSeasons > 1 ? "s" : ""} • {movie.TotalEpisodes || 16} Ep
              </span>
            ) : (
              <span className="meta-pill runtime">
                ⏱️ {movie.Runtime || "120 min"}
              </span>
            )}

            <span className="meta-pill genre">{movie.Genre || "Action, Adventure"}</span>

            {movie.Country && (
              <span className="meta-pill country">📍 {movie.Country}</span>
            )}
          </div>

          {/* Plot Synopsis */}
          <p className="marquee-plot">
            {movie.Plot || "Stream this real verified movie in full 4K / 1080p Ultra HD with multi-server playback and instant high-speed torrent downloads."}
          </p>

          {/* Credits Row */}
          <div className="marquee-credits-row">
            {movie.Director && (
              <span><strong>Director:</strong> {movie.Director}</span>
            )}
            {movie.Actors && (
              <span><strong>Starring:</strong> {movie.Actors.split(",").slice(0, 3).join(", ")}</span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="marquee-actions-row">
            {/* 1. Watch Now Button */}
            <button
              className="btn-marquee-play"
              onClick={() => onPlay && onPlay(movie)}
              title={isSeries ? "Watch Full Series & Episodes" : "Stream Real Full Movie in HD/4K"}
            >
              <Play size={18} fill="#000" />
              <span>{isSeries ? "Stream Series" : "Watch Now in 4K"}</span>
            </button>

            {/* 2. 1-Click Torrent Download */}
            <button
              className="btn-marquee-torrent"
              onClick={() => onTorrent && onTorrent(movie)}
              title="Download via Built-In High-Speed Torrent Engine"
            >
              <Zap size={16} />
              <span>1-Click Torrent</span>
            </button>

            {/* 3. Watchlist Toggle */}
            <button
              className={`btn-marquee-watchlist ${isSaved ? "saved" : ""}`}
              onClick={() => onWatchlist && onWatchlist(movie)}
              title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
            >
              {isSaved ? <Check size={16} /> : <Plus size={16} />}
              <span>{isSaved ? "In Watchlist" : "Watchlist"}</span>
            </button>

            {/* 4. Shuffle Spotlight Button */}
            <button
              className="btn-marquee-shuffle"
              onClick={() => onShuffle && onShuffle()}
              title="Rotate to another blockbuster movie"
            >
              <Shuffle size={15} />
              <span>Shuffle Spotlight</span>
            </button>
          </div>
        </div>

        {/* Right Column: 3D High-Def Poster Preview Card */}
        <div className="marquee-poster-col" onClick={() => onPlay && onPlay(movie)}>
          <div className="marquee-poster-card">
            <img
              src={movie.Poster && movie.Poster !== "N/A" ? movie.Poster : backdropUrl}
              alt={movie.Title}
              className="marquee-poster-img"
              referrerPolicy="no-referrer"
              loading="eager"
            />
            <div className="poster-play-badge">
              <Play size={28} fill="#fff" />
            </div>
            <div className="poster-overlay-gradient">
              <span className="poster-quality-tag">{movie.Quality || "4K UHD"}</span>
              <span className="poster-audio-tag">Dolby 5.1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Navigation Controls & Indicators */}
      <div className="marquee-navigation-bar">
        {/* Previous Button */}
        <button
          className="btn-marquee-nav prev"
          onClick={() => onSelectIndex && onSelectIndex((currentIndex - 1 + totalCount) % totalCount)}
          title="Previous Spotlight Movie"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Indicator Dots/Pills */}
        <div className="marquee-dots-row">
          {Array.from({ length: totalCount }).map((_, idx) => (
            <button
              key={`dot-${idx}`}
              className={`marquee-dot-pill ${idx === currentIndex ? "active" : ""}`}
              onClick={() => onSelectIndex && onSelectIndex(idx)}
              title={`Jump to Spotlight Movie #${idx + 1}`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          className="btn-marquee-nav next"
          onClick={() => onSelectIndex && onSelectIndex((currentIndex + 1) % totalCount)}
          title="Next Spotlight Movie"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
