import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const API_BASE = "https://tbf-api-karen-djin.waw0.amvera.tech";
const BAR_STORAGE_KEY = "tbf_my_bar_v1";
const FAV_STORAGE_KEY = "tbf_favorites_v1";
const SAVED_MIXES_STORAGE_KEY = "tbf_saved_mixes_v1";

const PROFILE_OPTIONS = [
  { value: "fruit", label: "Фруктовый" },
  { value: "berry", label: "Ягодный" },
  { value: "dessert", label: "Десертный" },
  { value: "citrus", label: "Цитрусовый" },
  { value: "fresh", label: "Свежий" },
  { value: "beverage", label: "Напиточный" },
  { value: "tropical", label: "Тропический" },
  { value: "creamy", label: "Сливочный" },
  { value: "candy", label: "Конфетный" },
  { value: "spicy", label: "Пряный" },
];

const STRENGTH_OPTIONS = [
  { value: "light", label: "Лёгкая" },
  { value: "medium", label: "Средняя" },
  { value: "strong", label: "Крепкая" },
];

const PROFILE_LABELS = Object.fromEntries(
  PROFILE_OPTIONS.map((x) => [x.value, x.label])
);

function translateProfile(value) {
  return PROFILE_LABELS[value] || value || "—";
}

function translateProfiles(values) {
  if (!values || !values.length) return "без профиля";
  return values.map(translateProfile).join(" • ");
}

function makeKey(item) {
  return `${item.brand}::${item.flavor}`.toLowerCase();
}

function mixSignature(mix) {
  const recipe = mix?.recipe || [];
  return recipe
    .map((x) => `${x.brand}::${x.flavor}::${x.percent}`)
    .sort()
    .join("|");
}

function loadJsonFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJsonToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("localStorage save failed", e);
  }
}

function Header({ title, subtitle, onHome, right }) {
  return (
    <div className="header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="header-actions">
        {right}
        {onHome ? (
          <button className="ghost-btn" onClick={onHome}>
            На главную
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="section-title">{children}</h2>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

function MiniAction({ active, onClick, children, danger = false }) {
  return (
    <button
      className={`mini-action ${active ? "mini-action-active" : ""} ${
        danger ? "mini-action-danger" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="card empty-state">
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-text">{text}</div>
      {actionLabel && onAction ? (
        <button className="primary-btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function FlavorCard({
  item,
  onOpen,
  inBar,
  isFavorite,
  onToggleBar,
  onToggleFavorite,
}) {
  const intel = item.review_intelligence || {};
  const summary = intel.summary || {};
  const usage = intel.usage_model || {};
  const editorial = intel.editorial || {};

  return (
    <div className="card flavor-shell">
      <button className="flavor-card" onClick={() => onOpen(item)}>
        <div className="card-top">
          <div>
            <div className="brand">{item.brand}</div>
            <div className="flavor">{item.flavor}</div>
          </div>
          <div className="rating">
            <span>★</span>
            {Number(item.rating || 0).toFixed(2)}
          </div>
        </div>

        <div className="meta-row">
          <span>{translateProfiles(summary.profiles || [])}</span>
        </div>

        <div className="metrics-grid">
          <Metric label="Сладость" value={summary.sweetness} />
          <Metric label="Кислинка" value={summary.sourness} />
          <Metric label="Холодок" value={summary.cooling} />
          <Metric label="Миксуемость" value={summary.mixability} />
          <Metric label="Соло" value={usage.solo_score} />
          <Metric label="Инструмент" value={usage.tool_score} />
        </div>

        <div className="one-liner">
          {editorial.one_liner || item.description || "Без описания"}
        </div>
      </button>

      <div className="card-actions">
        <MiniAction active={inBar} onClick={() => onToggleBar(item)}>
          {inBar ? "Убрать из бара" : "Добавить в бар"}
        </MiniAction>

        <MiniAction active={isFavorite} onClick={() => onToggleFavorite(item)}>
          {isFavorite ? "В избранном" : "В избранное"}
        </MiniAction>
      </div>
    </div>
  );
}

function MixCard({
  item,
  barKeys,
  mode,
  canSave = false,
  isSaved = false,
  onSave,
  onRemove,
}) {
  const recipe = item.recipe || [];
  const availableCount = recipe.filter((part) =>
    barKeys.has(`${part.brand}::${part.flavor}`.toLowerCase())
  ).length;

  const fullyAvailable = recipe.length > 0 && availableCount === recipe.length;
  const showBarState = mode === "bar" || mode === "anchor";

  return (
    <div className="card mix-card">
      <div className="mix-top">
        <div className="mix-title">{item.name}</div>
        <div className={`mix-badge ${fullyAvailable ? "mix-badge-ok" : ""}`}>
          {showBarState
            ? fullyAvailable
              ? "Есть всё"
              : `${availableCount}/${recipe.length} в баре`
            : "Без привязки к бару"}
        </div>
      </div>

      <div className="mix-note">{item.note}</div>

      <div className="mix-recipe">
        {recipe.map((part, idx) => {
          const inBar = barKeys.has(`${part.brand}::${part.flavor}`.toLowerCase());
          return (
            <div
              key={idx}
              className={`mix-part ${showBarState && inBar ? "mix-part-ok" : ""}`}
            >
              <div className="mix-part-left">
                <div className="mix-brand">{part.brand}</div>
                <div className="mix-flavor">{part.flavor}</div>
              </div>
              <div className="mix-right">
                {showBarState && inBar ? <span className="mix-check">●</span> : null}
                <div className="mix-percent">{part.percent}%</div>
              </div>
            </div>
          );
        })}
      </div>

      {(canSave || onRemove) && (
        <div className="card-actions">
          {canSave ? (
            <MiniAction active={isSaved} onClick={onSave}>
              {isSaved ? "Сохранено" : "Сохранить микс"}
            </MiniAction>
          ) : null}

          {onRemove ? (
            <MiniAction danger onClick={onRemove}>
              Удалить микс
            </MiniAction>
          ) : null}
        </div>
      )}
    </div>
  );
}

function BottomNav({ page, setPage }) {
  const items = [
    { key: "home", label: "Главная", icon: "⌂" },
    { key: "search", label: "Поиск", icon: "⌕" },
    { key: "my-bar", label: "Бар", icon: "◫" },
    { key: "mix-builder", label: "Миксы", icon: "✦" },
    { key: "profile", label: "Профиль", icon: "◎" },
  ];

  return (
    <div className="bottom-nav-wrap">
      <div className="bottom-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`bottom-nav-item ${page === item.key ? "bottom-nav-item-active" : ""}`}
            onClick={() => setPage(item.key)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HomePage({ onNavigate, barCount, favoritesCount, savedMixesCount }) {
  return (
    <div className="page">
      <Header
        title="ТБФ Миксолог"
        subtitle="Премиальная база вкусов, аналитика и сборка миксов"
      />

      <div className="top-stats top-stats-3">
        <div className="top-stat card">
          <div className="top-stat-label">Мой бар</div>
          <div className="top-stat-value">{barCount}</div>
        </div>
        <div className="top-stat card">
          <div className="top-stat-label">Избранное</div>
          <div className="top-stat-value">{favoritesCount}</div>
        </div>
        <div className="top-stat card">
          <div className="top-stat-label">Мои миксы</div>
          <div className="top-stat-value">{savedMixesCount}</div>
        </div>
      </div>

      <div className="hero">
        <div className="hero-card">
          <div className="hero-title">Поиск вкусов</div>
          <div className="hero-text">Найти вкус, бренд, профиль или сочетание</div>
          <button className="primary-btn" onClick={() => onNavigate("search")}>
            Открыть поиск
          </button>
        </div>

        <div className="hero-card">
          <div className="hero-title">Мой бар</div>
          <div className="hero-text">
            Добавляй вкусы из поиска, топов и карточек, чтобы они появились здесь
          </div>
          <button className="primary-btn" onClick={() => onNavigate("my-bar")}>
            Открыть бар
          </button>
        </div>

        <div className="hero-card">
          <div className="hero-title">Избранное</div>
          <div className="hero-text">Сохрани лучшие вкусы, чтобы вернуться к ним позже</div>
          <button className="primary-btn" onClick={() => onNavigate("favorites")}>
            Смотреть
          </button>
        </div>

        <div className="hero-card">
          <div className="hero-title">Мои миксы</div>
          <div className="hero-text">Сохранённые готовые миксы, к которым можно вернуться</div>
          <button className="primary-btn" onClick={() => onNavigate("saved-mixes")}>
            Открыть
          </button>
        </div>

        <div className="hero-card">
          <div className="hero-title">Топ по рейтингу</div>
          <div className="hero-text">Лучшие вкусы по базе и отзывам</div>
          <button className="primary-btn" onClick={() => onNavigate("top-rating")}>
            Смотреть
          </button>
        </div>

        <div className="hero-card hero-card-accent">
          <div className="hero-title">Собрать микс</div>
          <div className="hero-text">Подбор миксов из бара, от базового вкуса или без привязки к бару</div>
          <button className="primary-btn" onClick={() => onNavigate("mix-builder")}>
            Генерировать
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchPage({
  onHome,
  onOpenFlavor,
  barKeys,
  favoriteKeys,
  onToggleBar,
  onToggleFavorite,
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barMode, setBarMode] = useState("all");

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=30`
      );
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems =
    barMode === "bar"
      ? items.filter((item) => barKeys.has(makeKey(item)))
      : items;

  return (
    <div className="page">
      <Header
        title="Поиск вкусов"
        subtitle="Здесь удобнее всего начинать добавление вкусов в бар"
        onHome={onHome}
      />

      <div className="search-box">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: чизкейк, мята, персик, sebero"
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="primary-btn" onClick={search}>
          Искать
        </button>
      </div>

      <div className="filter-row">
        <MiniAction active={barMode === "bar"} onClick={() => setBarMode("bar")}>
          Мой бар
        </MiniAction>
        <MiniAction active={barMode === "all"} onClick={() => setBarMode("all")}>
          Без привязки к бару
        </MiniAction>
cd ~/Desktop/tbf-miniapp
grep -n "function App" src/App.jsx      </div>

      {loading ? <div className="status">Загрузка...</div> : null}
      {!loading && filteredItems.length === 0 ? (
        <div className="status">Пока пусто. Введи запрос.</div>
      ) : null}

      <div className="cards-grid">
        {filteredItems.map((item) => (
          <FlavorCard
            key={item.slug}
            item={item}
            onOpen={onOpenFlavor}
            inBar={barKeys.has(makeKey(item))}
            isFavorite={favoriteKeys.has(makeKey(item))}
            onToggleBar={onToggleBar}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

function TopPage({
  endpoint,
  title,
  subtitle,
  onHome,
  onOpenFlavor,
  barKeys,
  favoriteKeys,
  onToggleBar,
  onToggleFavorite,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barMode, setBarMode] = useState("all");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        const data = await res.json();
        if (active) setItems(data.items || []);
      } catch (e) {
        console.error(e);
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [endpoint]);

  const filteredItems =
    barMode === "bar"
      ? items.filter((item) => barKeys.has(makeKey(item)))
      : items;

  return (
    <div className="page">
      <Header title={title} subtitle={subtitle} onHome={onHome} />

      <div className="filter-row">
        <MiniAction active={barMode === "bar"} onClick={() => setBarMode("bar")}>
          Мой бар
        </MiniAction>
        <MiniAction active={barMode === "all"} onClick={() => setBarMode("all")}>
          Без привязки к бару
        </MiniAction>
      </div>

      {loading ? <div className="status">Загрузка...</div> : null}

      <div className="cards-grid">
        {filteredItems.map((item) => (
          <FlavorCard
            key={item.slug}
            item={item}
            onOpen={onOpenFlavor}
            inBar={barKeys.has(makeKey(item))}
            isFavorite={favoriteKeys.has(makeKey(item))}
            onToggleBar={onToggleBar}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

function CollectionPage({
  title,
  subtitle,
  onHome,
  items,
  onOpenFlavor,
  barKeys,
  favoriteKeys,
  onToggleBar,
  onToggleFavorite,
  emptyTitle,
  emptyText,
  emptyActionLabel,
  onEmptyAction,
}) {
  return (
    <div className="page">
      <Header title={title} subtitle={subtitle} onHome={onHome} />

      {items.length === 0 ? (
        <EmptyState
          title={emptyTitle || "Пока пусто"}
          text={emptyText || "Здесь пока ничего нет."}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <div className="cards-grid">
          {items.map((item) => (
            <FlavorCard
              key={item.slug}
              item={item}
              onOpen={onOpenFlavor}
              inBar={barKeys.has(makeKey(item))}
              isFavorite={favoriteKeys.has(makeKey(item))}
              onToggleBar={onToggleBar}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedMixesPage({ onHome, mixes, barKeys, onRemoveMix, onGoToBuilder }) {
  return (
    <div className="page">
      <Header
        title="Мои миксы"
        subtitle="Сохранённые готовые миксы"
        onHome={onHome}
      />

      {mixes.length === 0 ? (
        <EmptyState
          title="Сохранённых миксов пока нет"
          text="Сначала собери несколько миксов и сохрани лучшие варианты."
          actionLabel="Перейти к миксам"
          onAction={onGoToBuilder}
        />
      ) : (
        <div className="mix-grid">
          {mixes.map((mix) => (
            <MixCard
              key={mix.id}
              item={mix}
              barKeys={barKeys}
              mode={mix.mode || "bar"}
              onRemove={() => onRemoveMix(mix.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePage({
  onHome,
  onNavigate,
  barCount,
  favoritesCount,
  savedMixesCount,
  onClearBar,
  onClearFavorites,
  onClearSavedMixes,
}) {
  return (
    <div className="page">
      <Header
        title="Профиль"
        subtitle="Управление данными и быстрый доступ к коллекциям"
        onHome={onHome}
      />

      <div className="profile-grid">
        <div className="card profile-card">
          <div className="profile-title">Коллекции</div>
          <div className="profile-stats">
            <div className="profile-stat">
              <span>Мой бар</span>
              <strong>{barCount}</strong>
            </div>
            <div className="profile-stat">
              <span>Избранное</span>
              <strong>{favoritesCount}</strong>
            </div>
            <div className="profile-stat">
              <span>Мои миксы</span>
              <strong>{savedMixesCount}</strong>
            </div>
          </div>

          <div className="profile-actions">
            <button className="primary-btn" onClick={() => onNavigate("favorites")}>
              Открыть избранное
            </button>
            <button className="ghost-btn" onClick={() => onNavigate("saved-mixes")}>
              Открыть мои миксы
            </button>
          </div>
        </div>

        <div className="card profile-card">
          <div className="profile-title">Управление</div>
          <div className="profile-note">
            Здесь можно быстро очистить локальные данные mini app.
          </div>

          <div className="profile-actions-col">
            <MiniAction danger onClick={onClearBar}>
              Очистить мой бар
            </MiniAction>
            <MiniAction danger onClick={onClearFavorites}>
              Очистить избранное
            </MiniAction>
            <MiniAction danger onClick={onClearSavedMixes}>
              Очистить мои миксы
            </MiniAction>
          </div>
        </div>

        <div className="card profile-card">
          <div className="profile-title">Статус mini app</div>
          <div className="profile-note">
            У тебя уже есть: база вкусов, мой бар, избранное, миксы, мои миксы и мобильная навигация.
          </div>

          <div className="profile-badges">
            <span className="tag">MVP</span>
            <span className="tag">Mixology</span>
            <span className="tag">Mini App UI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MixBuilderPage({ onHome, barItems, barKeys, savedMixes, onSaveMix }) {
  const [profile, setProfile] = useState("fruit");
  const [strength, setStrength] = useState("medium");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mixMode, setMixMode] = useState("bar");
  const [anchorKey, setAnchorKey] = useState("");

  const anchorOptions = barItems;

  async function buildMixGlobal() {
    const url = `${API_BASE}/mix/recommend?profile=${encodeURIComponent(profile)}&strength=${encodeURIComponent(strength)}&limit=6`;
    const res = await fetch(url);
    return await res.json();
  }

  async function buildMixFromBar() {
    const res = await fetch(`${API_BASE}/mix/from-bar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: barItems,
        profile,
        strength,
        limit: 6
      }),
    });

    return await res.json();
  }

  async function buildMixFromAnchor() {
    const anchor = barItems.find((x) => makeKey(x) === anchorKey);
    if (!anchor) return { items: [] };

    const res = await fetch(`${API_BASE}/mix/from-anchor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        anchor,
        items: barItems,
        profile,
        strength,
        limit: 6
      }),
    });

    return await res.json();
  }

  async function generate() {
    setLoading(true);
    try {
      let data = { items: [] };

      if (mixMode === "bar") {
        data = await buildMixFromBar();
      } else if (mixMode === "anchor") {
        data = await buildMixFromAnchor();
      } else {
        data = await buildMixGlobal();
      }

      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!anchorKey && barItems.length > 0) {
      setAnchorKey(makeKey(barItems[0]));
    }
  }, [barItems, anchorKey]);

  const savedSignatures = useMemo(
    () => new Set(savedMixes.map((mix) => mixSignature(mix))),
    [savedMixes]
  );

  return (
    <div className="page">
      <Header
        title="Собрать микс"
        subtitle="Подбор миксов по профилю, крепости и твоему бару"
        onHome={onHome}
      />

      <div className="card builder-card">
        <div className="builder-grid">
          <div className="builder-field">
            <label>Профиль</label>
            <select value={profile} onChange={(e) => setProfile(e.target.value)}>
              {PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="builder-field">
            <label>Крепость</label>
            <select value={strength} onChange={(e) => setStrength(e.target.value)}>
              {STRENGTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="builder-action builder-action-stack">
            <button className="primary-btn builder-btn" onClick={generate}>
              Сгенерировать
            </button>
          </div>
        </div>

        <div className="filter-row filter-row-top">
          <MiniAction active={mixMode === "bar"} onClick={() => setMixMode("bar")}>
            Миксы из бара
          </MiniAction>
          <MiniAction active={mixMode === "anchor"} onClick={() => setMixMode("anchor")}>
            От выбранного вкуса
          </MiniAction>
          <MiniAction active={mixMode === "global"} onClick={() => setMixMode("global")}>
            Без привязки к бару
          </MiniAction>
        </div>

        {mixMode === "anchor" ? (
          <div className="anchor-box">
            <div className="builder-field">
              <label>Базовый вкус из моего бара</label>
              <select value={anchorKey} onChange={(e) => setAnchorKey(e.target.value)}>
                {anchorOptions.map((item) => (
                  <option key={makeKey(item)} value={makeKey(item)}>
                    {item.brand} — {item.flavor}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? <div className="status">Собираю варианты...</div> : null}
      {!loading && items.length === 0 ? (
        <div className="status">Выбери параметры и нажми «Сгенерировать».</div>
      ) : null}

      <div className="mix-grid">
        {items.map((item, idx) => {
          const signature = mixSignature(item);
          const isSaved = savedSignatures.has(signature);

          return (
            <MixCard
              key={idx}
              item={item}
              barKeys={barKeys}
              mode={mixMode}
              canSave={true}
              isSaved={isSaved}
              onSave={() => onSaveMix(item, mixMode)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FlavorPage({ item, onHome, onBack, inBar, isFavorite, onToggleBar, onToggleFavorite }) {
  const intel = item.review_intelligence || {};
  const summary = intel.summary || {};
  const usage = intel.usage_model || {};
  const behavior = intel.behavior_model || {};
  const guidance = intel.mix_guidance || {};
  const editorial = intel.editorial || {};
  const confidence = intel.confidence || {};

  return (
    <div className="page">
      <Header
        title={item.flavor}
        subtitle={item.brand}
        onHome={onHome}
        right={
          <>
            <button className="ghost-btn" onClick={onBack}>
              Назад
            </button>
            <MiniAction active={inBar} onClick={() => onToggleBar(item)}>
              {inBar ? "Убрать из бара" : "Добавить в бар"}
            </MiniAction>
            <MiniAction active={isFavorite} onClick={() => onToggleFavorite(item)}>
              {isFavorite ? "В избранном" : "В избранное"}
            </MiniAction>
          </>
        }
      />

      <div className="detail-hero card">
        <div className="detail-title-row">
          <div>
            <div className="brand">{item.brand}</div>
            <div className="flavor big">{item.flavor}</div>
          </div>
          <div className="rating big-rating">★ {Number(item.rating || 0).toFixed(2)}</div>
        </div>

        <p className="detail-description">
          {editorial.one_liner || item.description || "Без описания"}
        </p>

        <div className="tags-row">
          {(summary.profiles || []).map((tag) => (
            <span key={tag} className="tag">
              {translateProfile(tag)}
            </span>
          ))}
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <SectionTitle>Профиль</SectionTitle>
          <div className="metrics-grid">
            <Metric label="Сладость" value={summary.sweetness} />
            <Metric label="Кислинка" value={summary.sourness} />
            <Metric label="Холодок" value={summary.cooling} />
            <Metric label="Ощущение крепости" value={summary.strength_feel} />
            <Metric label="Жаростойкость" value={summary.heat_resistance} />
            <Metric label="Миксуемость" value={summary.mixability} />
            <Metric label="Долгота вкуса" value={summary.longevity} />
            <Metric label="Сложность" value={summary.complexity} />
          </div>
        </div>

        <div className="card">
          <SectionTitle>Использование</SectionTitle>
          <div className="metrics-grid">
            <Metric label="Соло" value={usage.solo_score} />
            <Metric label="Микс" value={usage.mix_score} />
            <Metric label="Инструмент" value={usage.tool_score} />
            <Metric label="Доминантность" value={usage.dominance} />
            <Metric label="Универсальность" value={usage.versatility} />
          </div>
        </div>

        <div className="card">
          <SectionTitle>Поведение</SectionTitle>
          <div className="metrics-grid">
            <Metric label="Риск перегрева" value={behavior.overheat_risk} />
            <Metric label="Стабильность" value={behavior.flavor_stability} />
            <Metric label="Риск химозности" value={behavior.chemical_risk} />
            <Metric label="Сухость" value={behavior.dryness} />
            <Metric label="Жёсткость" value={behavior.harshness} />
          </div>
        </div>

        <div className="card">
          <SectionTitle>Миксология</SectionTitle>
          <div className="list-block">
            <div><strong>Лучшее применение:</strong> {(guidance.best_usage || []).join(", ") || "-"}</div>
            <div><strong>Рекомендуемая доля:</strong> {guidance.recommended_share_min ?? 0}% – {guidance.recommended_share_max ?? 0}%</div>
            <div><strong>Лучшие сочетания:</strong> {(guidance.best_pairings || []).join(", ") || "-"}</div>
            <div><strong>Не стоит сочетать:</strong> {(guidance.avoid_pairings || []).join(", ") || "-"}</div>
          </div>
        </div>

        <div className="card">
          <SectionTitle>Редактура</SectionTitle>
          <div className="list-block">
            <div><strong>Плюсы:</strong> {(editorial.pros || []).join(", ") || "-"}</div>
            <div><strong>Минусы:</strong> {(editorial.cons || []).join(", ") || "-"}</div>
            <div><strong>Заметки по забивке:</strong> {(editorial.setup_notes || []).join(", ") || "-"}</div>
          </div>
        </div>

        <div className="card">
          <SectionTitle>Надёжность</SectionTitle>
          <div className="list-block">
            <div><strong>Количество отзывов:</strong> {item.reviews_count ?? 0}</div>
            <div><strong>Корзина отзывов:</strong> {confidence.review_count_bucket || "-"}</div>
            <div><strong>Уверенность в сигналах:</strong> {confidence.signal_confidence ?? 0}</div>
            <div><strong>Уверенность в summary:</strong> {confidence.summary_confidence ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [history, setHistory] = useState([]);

  const [barItems, setBarItems] = useState(() => loadJsonFromStorage(BAR_STORAGE_KEY, []));
  const [favoriteItems, setFavoriteItems] = useState(() => loadJsonFromStorage(FAV_STORAGE_KEY, []));
  const [savedMixes, setSavedMixes] = useState(() => loadJsonFromStorage(SAVED_MIXES_STORAGE_KEY, []));

  useEffect(() => {
    saveJsonToStorage(BAR_STORAGE_KEY, barItems);
  }, [barItems]);

  useEffect(() => {
    saveJsonToStorage(FAV_STORAGE_KEY, favoriteItems);
  }, [favoriteItems]);

  useEffect(() => {
    saveJsonToStorage(SAVED_MIXES_STORAGE_KEY, savedMixes);
  }, [savedMixes]);

  const barKeys = useMemo(
    () => new Set(barItems.map((item) => makeKey(item))),
    [barItems]
  );

  const favoriteKeys = useMemo(
    () => new Set(favoriteItems.map((item) => makeKey(item))),
    [favoriteItems]
  );

  function toggleBar(item) {
    const key = makeKey(item);
    setBarItems((prev) =>
      prev.some((x) => makeKey(x) === key)
        ? prev.filter((x) => makeKey(x) !== key)
        : [...prev, item]
    );
  }

  function toggleFavorite(item) {
    const key = makeKey(item);
    setFavoriteItems((prev) =>
      prev.some((x) => makeKey(x) === key)
        ? prev.filter((x) => makeKey(x) !== key)
        : [...prev, item]
    );
  }

  function saveMix(mix, mode) {
    const signature = mixSignature(mix);

    setSavedMixes((prev) => {
      if (prev.some((x) => mixSignature(x) === signature)) {
        return prev;
      }

      return [
        {
          ...mix,
          id: `mix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          mode,
          saved_at: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  }

  function removeMix(id) {
    setSavedMixes((prev) => prev.filter((x) => x.id !== id));
  }

  function clearBar() {
    setBarItems([]);
  }

  function clearFavorites() {
    setFavoriteItems([]);
  }

  function clearSavedMixes() {
    setSavedMixes([]);
  }

  function openFlavor(item) {
    setHistory((prev) => [...prev, page]);
    setSelectedFlavor(item);
    setPage("flavor");
  }

  function goHome() {
    setPage("home");
    setSelectedFlavor(null);
  }

  function goBack() {
    const prev = history[history.length - 1] || "home";
    setHistory((prevHistory) => prevHistory.slice(0, -1));
    setPage(prev);
  }

  const current = useMemo(() => {
    if (page === "home") {
      return (
        <HomePage
          onNavigate={setPage}
          barCount={barItems.length}
          favoritesCount={favoriteItems.length}
          savedMixesCount={savedMixes.length}
        />
      );
    }

    if (page === "search") {
      return (
        <SearchPage
          onHome={goHome}
          onOpenFlavor={openFlavor}
          barKeys={barKeys}
          favoriteKeys={favoriteKeys}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    if (page === "top-rating") {
      return (
        <TopPage
          endpoint="/flavors/top/rating"
          title="Топ по рейтингу"
          subtitle="Лучшие вкусы по базе"
          onHome={goHome}
          onOpenFlavor={openFlavor}
          barKeys={barKeys}
          favoriteKeys={favoriteKeys}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    if (page === "top-solo") {
      return (
        <TopPage
          endpoint="/flavors/top/solo"
          title="Топ для соло"
          subtitle="Сильные соло-вкусы"
          onHome={goHome}
          onOpenFlavor={openFlavor}
          barKeys={barKeys}
          favoriteKeys={favoriteKeys}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    if (page === "top-tool") {
      return (
        <TopPage
          endpoint="/flavors/top/tool"
          title="Топ для миксов"
          subtitle="Инструменты и mix-вкусы"
          onHome={goHome}
          onOpenFlavor={openFlavor}
          barKeys={barKeys}
          favoriteKeys={favoriteKeys}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    if (page === "my-bar") {
      return (
        <CollectionPage
          title="Мой бар"
          subtitle="Твои вкусы в наличии"
          onHome={goHome}
          items={barItems}
          onOpenFlavor={openFlavor}
          barKeys={barKeys}
          favoriteKeys={favoriteKeys}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
          emptyTitle="Бар пока пуст"
          emptyText="Добавляй вкусы из поиска, топов и карточек вкусов. После этого они появятся здесь."
          emptyActionLabel="Перейти в поиск"
          onEmptyAction={() => setPage("search")}
        />
      );
    }

    if (page === "favorites") {
      return (
        <CollectionPage
          title="Избранное"
          subtitle="Сохранённые вкусы"
          onHome={goHome}
          items={favoriteItems}
          onOpenFlavor={openFlavor}
          barKeys={barKeys}
          favoriteKeys={favoriteKeys}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
          emptyTitle="Избранное пока пусто"
          emptyText="Открывай вкусы и добавляй лучшие позиции в избранное."
          emptyActionLabel="Перейти в поиск"
          onEmptyAction={() => setPage("search")}
        />
      );
    }

    if (page === "saved-mixes") {
      return (
        <SavedMixesPage
          onHome={goHome}
          mixes={savedMixes}
          barKeys={barKeys}
          onRemoveMix={removeMix}
          onGoToBuilder={() => setPage("mix-builder")}
        />
      );
    }

    if (page === "mix-builder") {
      return (
        <MixBuilderPage
          onHome={goHome}
          barItems={barItems}
          barKeys={barKeys}
          savedMixes={savedMixes}
          onSaveMix={saveMix}
        />
      );
    }

    if (page === "profile") {
      return (
        <ProfilePage
          onHome={goHome}
          onNavigate={setPage}
          barCount={barItems.length}
          favoritesCount={favoriteItems.length}
          savedMixesCount={savedMixes.length}
          onClearBar={clearBar}
          onClearFavorites={clearFavorites}
          onClearSavedMixes={clearSavedMixes}
        />
      );
    }

    if (page === "flavor" && selectedFlavor) {
      return (
        <FlavorPage
          item={selectedFlavor}
          onHome={goHome}
          onBack={goBack}
          inBar={barKeys.has(makeKey(selectedFlavor))}
          isFavorite={favoriteKeys.has(makeKey(selectedFlavor))}
          onToggleBar={toggleBar}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    return (
      <HomePage
        onNavigate={setPage}
        barCount={barItems.length}
        favoritesCount={favoriteItems.length}
        savedMixesCount={savedMixes.length}
      />
    );
  }, [
    page,
    selectedFlavor,
    history,
    barItems,
    favoriteItems,
    savedMixes,
    barKeys,
    favoriteKeys,
  ]);

  return (
    <div className="app-shell">
      <div className="app-content">{current}</div>
      {page !== "flavor" && <BottomNav page={page} setPage={setPage} />}
    </div>
  );
}
