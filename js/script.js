
const API_BASE = "https://world-cinema-api.a250893h.workers.dev";

// 国の情報
const countries = {
  JP: "日本",
  US: "アメリカ",
  KR: "韓国",
  IN: "インド",
  FR: "フランス",
  GB: "イギリス"
};

// ジャンル名の日本語変換
const genreTranslations = {
  "Action": "アクション",
  "Adventure": "アドベンチャー",
  "Animation": "アニメーション",
  "Comedy": "コメディ",
  "Crime": "犯罪",
  "Documentary": "ドキュメンタリー",
  "Drama": "ドラマ",
  "Family": "ファミリー",
  "Fantasy": "ファンタジー",
  "History": "歴史",
  "Horror": "ホラー",
  "Music": "音楽",
  "Mystery": "ミステリー",
  "Romance": "恋愛",
  "Science Fiction": "SF",
  "TV Movie": "テレビ映画",
  "Thriller": "スリラー",
  "War": "戦争",
  "Western": "西部劇"
};

// DOM
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

const movieCount = document.getElementById("movieCount");
const genreCount = document.getElementById("genreCount");

const countrySelect = document.getElementById("countrySelect");

const genreView = document.getElementById("genreView");
const comparisonView = document.getElementById("comparisonView");

const genreChartTitle = document.getElementById("genreChartTitle");
const comparisonTitle = document.getElementById("comparisonTitle");

const rankingTitle = document.getElementById("rankingTitle");
const rankingDescription = document.getElementById("rankingDescription");
const rankingBody = document.getElementById("ranking");

const backButton = document.getElementById("backButton");

const movieModal = document.getElementById("movieModal");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");

// グラフ
let genreChart = null;
let countryChart = null;

// データ
let genres = [];
let currentGenre = null;
let currentCountry = "JP";

// キャッシュ
const genreCountCache = new Map();
const comparisonCache = new Map();

// API通信
async function fetchAPI(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`APIエラー (${response.status}): ${message}`);
  }

  return response.json();
}

// 数字の表示
function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "---";
  }

  return Number(value).toLocaleString("ja-JP");
}

// 評価などの小数表示
function formatDecimal(value) {
  if (value === null || value === undefined || value === "") {
    return "---";
  }

  return Number(value).toFixed(1);
}

// 公開年
function getYear(date) {
  return date ? date.substring(0, 4) : "---";
}

// ジャンル名
function getGenreName(name) {
  return genreTranslations[name] || name;
}

// 読み込み表示
function showLoading(show) {
  loadingMessage.hidden = !show;
}

// エラー表示
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function hideError() {
  errorMessage.hidden = true;
}

// 複数APIを同時に呼び出す際の負荷を抑える
async function runWithLimit(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;

      results[index] = await callback(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );

  await Promise.all(workers);

  return results;
}

// 初期化
async function initialize() {
  try {
    showLoading(true);
    hideError();

    // ジャンル一覧を取得
    const genreData = await fetchAPI("/api/genres?language=ja-JP");

    genres = genreData.genres || [];

    genreCount.textContent = genres.length;

    // 初期国の映画総数
    const initialMovies = await fetchAPI(
      `/api/discover?country=${currentCountry}&page=1`
    );

    movieCount.textContent = formatNumber(initialMovies.total_results);

    // 初期ランキング
    renderRanking(initialMovies.results || [], currentCountry, null);

    // ジャンル構成
    await drawGenreChart(currentCountry);

    showLoading(false);

  } catch (error) {
    console.error(error);
    showLoading(false);
    showError(
      "映画データの取得に失敗しました。Workerの設定やAPI接続を確認してください。"
    );
  }
}

// 国別ジャンル構成
async function drawGenreChart(country) {
  try {
    showLoading(true);
    hideError();

    currentCountry = country;

    genreChartTitle.textContent =
      `${countries[country]}のジャンル別作品数`;

    // すでに取得済みならキャッシュを利用
    if (!genreCountCache.has(country)) {
      const results = await runWithLimit(genres, 4, async (genre) => {
        const data = await fetchAPI(
          `/api/discover?country=${country}&genre=${genre.id}&page=1`
        );

        return {
          id: genre.id,
          name: getGenreName(genre.name),
          count: data.total_results || 0
        };
      });

      genreCountCache.set(country, results);
    }

    const chartData = genreCountCache.get(country);

    if (genreChart) {
      genreChart.destroy();
    }

    const ctx = document.getElementById("genreChart");

    genreChart = new Chart(ctx, {
      type: "bar",

      data: {
        labels: chartData.map(item => item.name),

        datasets: [{
          label: "映画の作品数",
          data: chartData.map(item => item.count),
          backgroundColor: "#719cff",
          borderRadius: 5,
          barThickness: 13
        }]
      },

      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            labels: {
              color: "#f1f3f5"
            }
          },

          tooltip: {
            callbacks: {
              label: context =>
                `作品数: ${formatNumber(context.raw)}`
            }
          }
        },

        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: "#aeb4c0"
            },
            grid: {
              color: "#303642"
            },
            title: {
              display: true,
              text: "作品数",
              color: "#aeb4c0"
            }
          },

          y: {
            ticks: {
              color: "#f1f3f5"
            },
            grid: {
              display: false
            }
          }
        },

        onClick: (event, elements) => {
          if (!elements.length) return;

          const index = elements[0].index;
          const selectedGenre = chartData[index];

          openGenreComparison(selectedGenre);
        }
      }
    });

    showLoading(false);

  } catch (error) {
    console.error(error);
    showLoading(false);
    showError("ジャンルデータの取得に失敗しました。");
  }
}

// ジャンルを選択して6か国を比較
async function openGenreComparison(genre) {
  try {
    showLoading(true);
    hideError();

    currentGenre = genre;

    genreView.hidden = true;
    comparisonView.hidden = false;

    comparisonTitle.textContent =
      `${genre.name}の6か国人気比較`;

    const results = await runWithLimit(
      Object.keys(countries),
      3,
      async country => {
        const cacheKey = `${country}-${genre.id}`;

        if (comparisonCache.has(cacheKey)) {
          return comparisonCache.get(cacheKey);
        }

        const data = await fetchAPI(
          `/api/discover?country=${country}&genre=${genre.id}&page=1`
        );

        const movies = data.results || [];

        const average = movies.length
          ? movies.reduce(
              (sum, movie) => sum + Number(movie.popularity || 0),
              0
            ) / movies.length
          : 0;

        const result = {
          country,
          name: countries[country],
          popularity: average,
          count: data.total_results || 0,
          sampleCount: movies.length
        };

        comparisonCache.set(cacheKey, result);

        return result;
      }
    );

    drawCountryChart(results);

    showLoading(false);

  } catch (error) {
    console.error(error);
    showLoading(false);
    showError("国別の人気比較データを取得できませんでした。");
  }
}

// 6か国比較グラフ
function drawCountryChart(data) {
  if (countryChart) {
    countryChart.destroy();
  }

  const ctx = document.getElementById("countryChart");

  countryChart = new Chart(ctx, {
    type: "bar",

    data: {
      labels: data.map(item => item.name),

      datasets: [{
        label: "Popularity平均",
        data: data.map(item => item.popularity),
        backgroundColor: [
          "#719cff",
          "#f59e72",
          "#6cc5a1",
          "#d5ad65",
          "#bd91e8",
          "#e58da8"
        ],
        borderRadius: 6
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#f1f3f5"
          }
        },

        tooltip: {
          callbacks: {
            afterLabel: context => {
              const item = data[context.dataIndex];

              return `対象作品数: ${formatNumber(item.count)}件\n平均計算対象: ${item.sampleCount}作品`;
            }
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#f1f3f5"
          },
          grid: {
            display: false
          }
        },

        y: {
          beginAtZero: true,
          ticks: {
            color: "#aeb4c0"
          },
          grid: {
            color: "#303642"
          }
        }
      },

      onClick: (event, elements) => {
        if (!elements.length) return;

        const index = elements[0].index;
        const selected = data[index];

        showCountryRanking(selected.country);
      }
    }
  });
}

// 国別ランキング
async function showCountryRanking(country) {
  try {
    showLoading(true);
    hideError();

    const genreParameter = currentGenre
      ? `&genre=${currentGenre.id}`
      : "";

    const data = await fetchAPI(
      `/api/discover?country=${country}${genreParameter}&page=1`
    );

    renderRanking(data.results || [], country, currentGenre);

    showLoading(false);

    document.querySelector(".ranking-section").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error(error);
    showLoading(false);
    showError("ランキングを取得できませんでした。");
  }
}

// ランキング表示
function renderRanking(movies, country, genre) {
  const title = genre
    ? `${countries[country]}の${genre.name}映画ランキング TOP 5`
    : `${countries[country]}の映画ランキング TOP 5`;

  rankingTitle.textContent = title;

  rankingDescription.textContent = genre
    ? `${genre.name}ジャンルの人気度が高い映画を表示しています。`
    : "人気度の高い映画を表示しています。";

  rankingBody.innerHTML = "";

  const topMovies = movies.slice(0, 5);

  if (!topMovies.length) {
    rankingBody.innerHTML = `
      <tr>
        <td colspan="7">映画データがありません。</td>
      </tr>
    `;
    return;
  }

  topMovies.forEach((movie, index) => {
    const tr = document.createElement("tr");

    tr.className = "movie-row";

    const revenue = movie.revenue
      ? `$${formatNumber(movie.revenue)}`
      : "---";

    tr.innerHTML = `
      <td class="rank-number">${index + 1}</td>
      <td class="movie-title"></td>
      <td>${getYear(movie.release_date)}</td>
      <td>${formatDecimal(movie.vote_average)}</td>
      <td>${formatNumber(movie.vote_count)}</td>
      <td>${formatDecimal(movie.popularity)}</td>
      <td>${revenue}</td>
    `;

    tr.querySelector(".movie-title").textContent =
      movie.title || "タイトル不明";

    tr.addEventListener("click", () => {
      openMovieDetail(movie.id);
    });

    rankingBody.appendChild(tr);
  });
}

// 映画詳細
async function openMovieDetail(movieId) {
  try {
    showLoading(true);

    const movie = await fetchAPI(`/api/movie/${movieId}`);

    // ポスター
    const poster = document.getElementById("detailPoster");
    const placeholder = document.getElementById("posterPlaceholder");

    if (movie.poster_path) {
      poster.src =
        `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

      poster.hidden = false;
      placeholder.hidden = true;

      poster.onerror = () => {
        poster.hidden = true;
        placeholder.hidden = false;
      };
    } else {
      poster.hidden = true;
      placeholder.hidden = false;
    }

    // タイトル
    document.getElementById("detailTitle").textContent =
      movie.title || "タイトル不明";

    document.getElementById("detailOriginalTitle").textContent =
      movie.original_title || "";

    // 基本情報
    document.getElementById("detailYear").textContent =
      getYear(movie.release_date);

    document.getElementById("detailGenres").textContent =
      (movie.genres || [])
        .map(genre => getGenreName(genre.name))
        .join(" / ") || "ジャンル不明";

    document.getElementById("detailRuntime").textContent =
      movie.runtime ? `${movie.runtime}分` : "上映時間不明";

    // 概要
    document.getElementById("detailOverview").textContent =
      movie.overview || "作品概要は登録されていません。";

    // 数値情報
    document.getElementById("detailRating").textContent =
      formatDecimal(movie.vote_average);

    document.getElementById("detailVotes").textContent =
      formatNumber(movie.vote_count);

    document.getElementById("detailPopularity").textContent =
      formatDecimal(movie.popularity);

    document.getElementById("detailRevenue").textContent =
      movie.revenue
        ? `$${formatNumber(movie.revenue)}`
        : "---";

    // キャッチコピー
    document.getElementById("detailTagline").textContent =
      movie.tagline || "";

    movieModal.hidden = false;
    document.body.style.overflow = "hidden";

    showLoading(false);

  } catch (error) {
    console.error(error);
    showLoading(false);
    showError("映画の詳細情報を取得できませんでした。");
  }
}

// モーダルを閉じる
function hideMovieModal() {
  movieModal.hidden = true;
  document.body.style.overflow = "";
}

closeModal.addEventListener("click", hideMovieModal);
modalOverlay.addEventListener("click", hideMovieModal);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !movieModal.hidden) {
    hideMovieModal();
  }
});

// 国選択
countrySelect.addEventListener("change", async event => {
  const country = event.target.value;

  currentGenre = null;

  genreView.hidden = false;
  comparisonView.hidden = true;

  await drawGenreChart(country);

  try {
    const data = await fetchAPI(
      `/api/discover?country=${country}&page=1`
    );

    movieCount.textContent = formatNumber(data.total_results);

    renderRanking(data.results || [], country, null);

  } catch (error) {
    console.error(error);
    showError("映画データを取得できませんでした。");
  }
});

// 戻るボタン
backButton.addEventListener("click", () => {
  comparisonView.hidden = true;
  genreView.hidden = false;
});

// 起動
initialize();
