import React, { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Zap,
  Star,
  Tv,
  Check,
  Plus,
  Shuffle
} from "lucide-react";

export default function NetflixMovieRow({
  title,
  icon,
  badgeText,
  movies = [],
  onPlay,
  onTorrent,
  onWatchlist,
  isSaved,
  onShuffle,
  fallbackPoster
}) {
  const rowRef = useRef(null);

  const scrollLeft = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: -window.innerWidth * 0.7, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: window.innerWidth * 0.7, behavior: "smooth" });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="netflix-movie-row-section">
      {/* Row Header with Category Title & Action Controls */}
      <div className="row-header">
        <div className="row-title-wrap">
          {icon && <span className="row-icon">{icon}</span>}
          <h2 className="row-title">{title}</h2>
          {badgeText && <span className="row-badge">{badgeText}</span>}
        </div>

        <div className="row-controls">
          {/* Shuffle Picks in this row */}
          {onShuffle && (
            <button
              className="btn-row-shuffle"
              onClick={onShuffle}
              title="Shuffle picks in this row with fresh verified titles"
            >
              <Shuffle size={13} />
              <span>Shuffle Picks</span>
            </button>
          )}

          {/* Left Arrow Button */}
          <button
            className="row-nav-btn prev"
            onClick={scrollLeft}
            title="Scroll Left"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Right Arrow Button */}
          <button
            className="row-nav-btn next"
            onClick={scrollRight}
            title="Scroll Right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Carousel with Snap */}
      <div className="row-carousel-container" ref={rowRef}>
        {movies.map((movie, idx) => {
          const saved = isSaved ? isSaved(movie) : false;
          const isSeries = movie.Type === "series";

          return (
            <div
              key={movie.imdbID || (movie.Title ? `${movie.Title}-${idx}` : `row-card-${idx}`)}
              className="netflix-carousel-card"
            >
              {/* Poster Wrap with Hover Effects */}
              <div
                className="card-poster-wrap"
                onClick={() => onPlay && onPlay(movie)}
              >
                <img
                  src={
                    movie.Poster && movie.Poster !== "N/A" && movie.Poster.startsWith("http")
                      ? movie.Poster
                      : fallbackPoster ? fallbackPoster(movie.Title, movie.Year, movie.Genre) : ""
                  }
                  alt={movie.Title}
                  className="card-poster-img"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    if (fallbackPoster) {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallbackPoster(movie.Title, movie.Year, movie.Genre);
                    }
                  }}
                />

                {/* Top Poster Badges */}
                <div className="card-top-badges">
                  {/* Rating Badge */}
                  <span className="card-badge rating">
                    <Star size={11} fill="var(--accent-gold)" color="var(--accent-gold)" />
                    {movie.imdbRating || "8.5"}
                  </span>

                  {/* Quality or Series Tag */}
                  {isSeries ? (
                    <span className="card-badge series">
                      <Tv size={10} /> S{movie.TotalSeasons || 1}
                    </span>
                  ) : (
                    <span className="card-badge quality">
                      {movie.Quality ? movie.Quality.split(" ")[0] : "4K"}
                    </span>
                  )}
                </div>

                {/* Hover Quick Action Overlay */}
                <div className="card-hover-overlay">
                  <div className="card-hover-actions">
                    {/* Stream Play Button */}
                    <button
                      className="hover-action-btn play"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay && onPlay(movie);
                      }}
                      title={isSeries ? "Watch Series" : "Play Movie"}
                    >
                      <Play size={18} fill="#000" />
                    </button>

                    {/* Torrent Download Button */}
                    <button
                      className="hover-action-btn torrent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTorrent && onTorrent(movie);
                      }}
                      title="Download Torrent via Built-In Engine"
                    >
                      <Zap size={15} />
                    </button>

                    {/* Watchlist Button */}
                    <button
                      className={`hover-action-btn watchlist ${saved ? "saved" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onWatchlist && onWatchlist(movie);
                      }}
                      title={saved ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      {saved ? <Check size={15} /> : <Plus size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Meta Details */}
              <div className="card-meta-details">
                <h4 className="card-title" title={movie.Title}>
                  {movie.Title}
                </h4>
                <div className="card-sub-row">
                  <span className="card-year">{movie.Year}</span>
                  <span className="card-dot">•</span>
                  <span className="card-genre">
                    {movie.Genre ? movie.Genre.split(",")[0] : "Cinema"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
