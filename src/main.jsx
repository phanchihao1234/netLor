import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Info,
  Loader2,
  Play,
  Search,
  Star,
  X,
} from 'lucide-react';
import './styles.css';

const API_BASE = 'https://phim.nguonc.com/api';
const IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

const NAV_ITEMS = [
  { label: 'Phim mới', type: 'new', slug: '' },
  { label: 'Phim lẻ', type: 'category', slug: 'phim-le' },
  { label: 'Phim bộ', type: 'category', slug: 'phim-bo' },
  { label: 'Hoạt hình', type: 'genre', slug: 'hoat-hinh' },
  { label: 'Hàn Quốc', type: 'country', slug: 'han-quoc' },
  { label: '2025', type: 'year', slug: '2025' },
];

const ROWS = [
  { title: 'Mới cập nhật', endpoint: '/films/phim-moi-cap-nhat?page=1' },
  { title: 'Phim lẻ nổi bật', endpoint: '/films/danh-sach/phim-le?page=1' },
  { title: 'Phim bộ đáng xem', endpoint: '/films/danh-sach/phim-bo?page=1' },
  { title: 'Hoạt hình', endpoint: '/films/the-loai/hoat-hinh?page=1' },
  { title: 'Điện ảnh Hàn Quốc', endpoint: '/films/quoc-gia/han-quoc?page=1' },
];

function normalizeList(payload) {
  return payload?.items || payload?.data?.items || payload?.data || [];
}

function getPagination(payload) {
  return payload?.paginate || payload?.data?.paginate || payload?.pagination || {};
}

function imageOf(movie) {
  return movie?.poster_url || movie?.thumb_url || movie?.image || movie?.poster || IMAGE_FALLBACK;
}

function nameOf(movie) {
  return movie?.name || movie?.origin_name || movie?.title || 'Chưa rõ tên';
}

function slugOf(movie) {
  return movie?.slug || movie?.id || '';
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return response.json();
}

function useApi(path, initialValue) {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    fetchJson(path)
      .then((payload) => mounted && setData(payload))
      .catch((err) => mounted && setError(err.message || 'Không tải được dữ liệu'))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [path]);

  return { data, loading, error };
}

function App() {
  const [route, setRoute] = useState({ screen: 'home' });
  const [selectedSlug, setSelectedSlug] = useState('');
  const [query, setQuery] = useState('');

  const openMovie = (slug) => {
    if (slug) {
      setSelectedSlug(slug);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const keyword = query.trim();
    if (keyword) {
      setRoute({ screen: 'listing', title: `Tìm kiếm: ${keyword}`, type: 'search', slug: keyword, page: 1 });
    }
  };

  return (
    <div className="app">
      <Header
        route={route}
        setRoute={setRoute}
        query={query}
        setQuery={setQuery}
        onSubmit={submitSearch}
        openMovie={openMovie}
      />
      {route.screen === 'home' ? (
        <Home openMovie={openMovie} />
      ) : (
        <Listing route={route} setRoute={setRoute} openMovie={openMovie} />
      )}
      {selectedSlug ? <MovieModal slug={selectedSlug} onClose={() => setSelectedSlug('')} /> : null}
    </div>
  );
}

function Header({ route, setRoute, query, setQuery, onSubmit, openMovie }) {
  const [solid, setSolid] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return undefined;
    }

    let mounted = true;
    setSuggestLoading(true);
    const timer = window.setTimeout(() => {
      fetchJson(`/films/search?keyword=${encodeURIComponent(keyword)}`)
        .then((payload) => {
          if (mounted) {
            setSuggestions(normalizeList(payload).slice(0, 6));
          }
        })
        .catch(() => {
          if (mounted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (mounted) {
            setSuggestLoading(false);
          }
        });
    }, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const showSuggestions = query.trim().length >= 2;

  const selectSuggestion = (movie) => {
    setFocused(false);
    setQuery('');
    openMovie(slugOf(movie));
  };

  return (
    <header className={`topbar ${solid || route.screen !== 'home' ? 'topbarSolid' : ''}`}>
      <button className="brand" onClick={() => setRoute({ screen: 'home' })} aria-label="Trang chủ">
        <Clapperboard size={30} />
        <span>Netflop</span>
      </button>
      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={`${item.type}-${item.slug}`}
            onClick={() =>
              item.type === 'new'
                ? setRoute({ screen: 'home' })
                : setRoute({ screen: 'listing', title: item.label, type: item.type, slug: item.slug, page: 1 })
            }
          >
            {item.label}
          </button>
        ))}
      </nav>
      <form className="searchBox" onSubmit={onSubmit}>
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm phim..."
          aria-label="Tìm phim"
        />
      </form>
      {showSuggestions ? (
        <div className="searchSuggest">
          {suggestLoading ? <div className="suggestState">Đang tìm...</div> : null}
          {!suggestLoading && suggestions.length === 0 ? <div className="suggestState">Không có gợi ý phù hợp</div> : null}
          {suggestions.map((movie) => (
            <button key={`suggest-${slugOf(movie)}`} className="suggestItem" onMouseDown={() => selectSuggestion(movie)}>
              <img src={imageOf(movie)} alt={nameOf(movie)} />
              <span>
                <strong>{nameOf(movie)}</strong>
                <small>{movie?.origin_name || movie?.episode_current || movie?.year || 'Đang cập nhật'}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function Home({ openMovie }) {
  const { data, loading } = useApi('/films/phim-moi-cap-nhat?page=1', {});
  const latest = normalizeList(data);
  const [heroIndex, setHeroIndex] = useState(0);
  const hero = latest[heroIndex] || latest[0];
  const heroSlides = latest.slice(0, 8);

  useEffect(() => {
    if (heroIndex >= heroSlides.length) {
      setHeroIndex(0);
    }
  }, [heroIndex, heroSlides.length]);

  const moveHero = (direction) => {
    if (!heroSlides.length) return;
    setHeroIndex((current) => {
      const nextIndex = current + direction;
      return Math.min(Math.max(nextIndex, 0), heroSlides.length - 1);
    });
  };

  return (
    <main>
      <section className="hero">
        <div className="heroSlider" style={{ transform: `translate3d(${-heroIndex * 100}%, 0, 0)` }}>
          {(heroSlides.length ? heroSlides : [hero]).map((movie, index) => (
            <div
              className="heroSlide"
              style={{ backgroundImage: `linear-gradient(90deg, #050505 0%, rgba(5,5,5,.78) 38%, rgba(5,5,5,.12) 100%), url(${imageOf(movie)})` }}
              aria-hidden={index !== heroIndex}
              key={`hero-${slugOf(movie)}-${index}`}
            />
          ))}
        </div>
        <button className="heroNav heroPrev" onClick={() => moveHero(-1)} disabled={heroSlides.length < 2} aria-label="Phim nổi bật trước">
          <ChevronLeft size={42} />
        </button>
        <div className="heroContent" key={slugOf(hero) || heroIndex}>
          <div className="kicker">
            <Star size={16} fill="currentColor" />
            Phim mới cập nhật
          </div>
          <h1>{hero ? nameOf(hero) : 'Netflop'}</h1>
          <p>{hero?.origin_name || hero?.episode_current || 'Khám phá phim mới, phim bộ, phim lẻ và các tập vừa lên sóng.'}</p>
          <div className="heroActions">
            <button className="primaryBtn" onClick={() => openMovie(slugOf(hero))} disabled={!hero}>
              <Play size={20} fill="currentColor" />
              Xem ngay
            </button>
            <button className="secondaryBtn" onClick={() => openMovie(slugOf(hero))} disabled={!hero}>
              <Info size={20} />
              Chi tiết
            </button>
          </div>
        </div>
        <button className="heroNav heroNext" onClick={() => moveHero(1)} disabled={heroSlides.length < 2} aria-label="Phim nổi bật tiếp theo">
          <ChevronRight size={42} />
        </button>
      </section>
      <section className="rows">
        {loading ? <LoadingBlock /> : null}
        {ROWS.map((row) => (
          <MovieRow key={row.title} title={row.title} endpoint={row.endpoint} openMovie={openMovie} />
        ))}
      </section>
    </main>
  );
}

function MovieRow({ title, endpoint, openMovie }) {
  const { data, loading, error } = useApi(endpoint, {});
  const movies = normalizeList(data).slice(0, 18);
  const railRef = useRef(null);
  const [canGoPrev, setCanGoPrev] = useState(false);
  const [canGoNext, setCanGoNext] = useState(false);

  const updateRailState = () => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanGoPrev(rail.scrollLeft > 4);
    setCanGoNext(rail.scrollLeft < maxScroll - 4);
  };

  useEffect(() => {
    updateRailState();
    const rail = railRef.current;
    if (!rail) return undefined;

    rail.addEventListener('scroll', updateRailState, { passive: true });
    window.addEventListener('resize', updateRailState);
    return () => {
      rail.removeEventListener('scroll', updateRailState);
      window.removeEventListener('resize', updateRailState);
    };
  }, [movies.length]);

  const moveRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.86, 320),
      behavior: 'smooth',
    });
  };

  return (
    <section className="movieRow">
      <div className="rowTitle">
        <h2>{title}</h2>
      </div>
      {loading ? <LoadingBlock compact /> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="railShell">
        <button
          className="railNav railPrev"
          onClick={() => moveRail(-1)}
          disabled={!canGoPrev}
          aria-label={`Xem phim trước trong ${title}`}
        >
          <ChevronLeft size={34} />
        </button>
        <div className="rail" ref={railRef}>
          {movies.map((movie) => (
            <MovieCard key={`${title}-${slugOf(movie)}`} movie={movie} openMovie={openMovie} />
          ))}
        </div>
        <button
          className="railNav railNext"
          onClick={() => moveRail(1)}
          disabled={!canGoNext}
          aria-label={`Xem phim tiếp theo trong ${title}`}
        >
          <ChevronRight size={34} />
        </button>
      </div>
    </section>
  );
}

function Listing({ route, setRoute, openMovie }) {
  const path = useMemo(() => {
    const page = route.page || 1;
    const encoded = encodeURIComponent(route.slug);
    if (route.type === 'category') return `/films/danh-sach/${encoded}?page=${page}`;
    if (route.type === 'genre') return `/films/the-loai/${encoded}?page=${page}`;
    if (route.type === 'country') return `/films/quoc-gia/${encoded}?page=${page}`;
    if (route.type === 'year') return `/films/nam-phat-hanh/${encoded}?page=${page}`;
    return `/films/search?keyword=${encoded}`;
  }, [route]);

  const { data, loading, error } = useApi(path, {});
  const movies = normalizeList(data);
  const pagination = getPagination(data);
  const page = route.page || pagination.current_page || 1;
  const lastPage = pagination.total_page || pagination.last_page || Math.max(page, 1);

  return (
    <main className="listing">
      <div className="listingHead">
        <div>
          <button className="backBtn" onClick={() => setRoute({ screen: 'home' })}>
            <ChevronLeft size={18} />
            Trang chủ
          </button>
          <h1>{route.title}</h1>
        </div>
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setRoute({ ...route, page: page - 1 })}>
            <ChevronLeft size={18} />
          </button>
          <span>Trang {page}</span>
          <button disabled={page >= lastPage} onClick={() => setRoute({ ...route, page: page + 1 })}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        {movies.map((movie) => (
          <MovieCard key={`listing-${slugOf(movie)}`} movie={movie} openMovie={openMovie} />
        ))}
      </div>
    </main>
  );
}

function MovieCard({ movie, openMovie }) {
  return (
    <button className="movieCard" onClick={() => openMovie(slugOf(movie))}>
      <img src={imageOf(movie)} alt={nameOf(movie)} loading="lazy" />
      <span className="badge">{movie?.episode_current || movie?.quality || 'HD'}</span>
      <div className="cardInfo">
        <strong>{nameOf(movie)}</strong>
        <small>{movie?.origin_name || movie?.time || movie?.year || 'Đang cập nhật'}</small>
      </div>
    </button>
  );
}

function MovieModal({ slug, onClose }) {
  const { data, loading, error } = useApi(`/film/${slug}`, {});
  const film = data?.movie || data?.film || data?.data?.movie || data?.data?.film || data?.data || {};
  const episodes = data?.episodes || data?.data?.episodes || film?.episodes || [];
  const servers = Array.isArray(episodes) ? episodes : [];
  const firstEpisode = servers?.[0]?.items?.[0] || servers?.[0]?.server_data?.[0] || servers?.[0]?.episodes?.[0];
  const [episode, setEpisode] = useState(null);
  const activeEpisode = episode || firstEpisode;
  const embedUrl = activeEpisode?.embed || activeEpisode?.embed_url || activeEpisode?.link_embed || activeEpisode?.m3u8 || activeEpisode?.link_m3u8;

  useEffect(() => {
    setEpisode(null);
  }, [slug]);

  useEffect(() => {
    document.body.classList.add('modalOpen');
    return () => {
      document.body.classList.remove('modalOpen');
    };
  }, []);

  return (
    <div className="modalLayer" role="dialog" aria-modal="true">
      <div className="modal">
        <button className="closeBtn" onClick={onClose} aria-label="Đóng">
          <X size={24} />
        </button>
        {loading ? <LoadingBlock /> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading ? (
          <>
            <div className="player">
              {embedUrl ? (
                <iframe src={embedUrl} title={activeEpisode?.name || nameOf(film)} allowFullScreen />
              ) : (
                <div className="playerEmpty">
                  <Film size={40} />
                  Chưa có nguồn phát
                </div>
              )}
            </div>
            <div className="modalBody">
              <img src={imageOf(film)} alt={nameOf(film)} />
              <div>
                <div className="kicker">{film?.category?.map?.((item) => item.name).join(' / ') || film?.quality || 'Phim'}</div>
                <h2>{nameOf(film)}</h2>
                <p>{stripHtml(film?.description || film?.content || film?.origin_name || 'Thông tin phim đang được cập nhật.')}</p>
                <div className="meta">
                  <span>{film?.year || film?.time || 'N/A'}</span>
                  <span>{film?.episode_current || film?.episode_total || 'Đang cập nhật'}</span>
                  <span>{film?.language || film?.quality || 'HD'}</span>
                </div>
              </div>
            </div>
            <EpisodeList servers={servers} activeEpisode={activeEpisode} setEpisode={setEpisode} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function EpisodeList({ servers, activeEpisode, setEpisode }) {
  if (!servers.length) return null;

  return (
    <div className="episodes">
      {servers.map((server, index) => {
        const items = server.items || server.server_data || server.episodes || [];
        return (
          <section key={`${server.server_name || server.name}-${index}`}>
            <h3>{server.server_name || server.name || `Server ${index + 1}`}</h3>
            <div className="episodeGrid">
              {items.map((item, itemIndex) => (
                <button
                  key={`${item.slug || item.name}-${itemIndex}`}
                  className={activeEpisode === item ? 'active' : ''}
                  onClick={() => setEpisode(item)}
                >
                  {item.name || item.slug || `Tập ${itemIndex + 1}`}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LoadingBlock({ compact = false }) {
  return (
    <div className={`loading ${compact ? 'compact' : ''}`}>
      <Loader2 size={22} />
      Đang tải...
    </div>
  );
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

createRoot(document.getElementById('root')).render(<App />);
