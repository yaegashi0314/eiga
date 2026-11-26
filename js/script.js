
// ========================================
// WORLD CINEMA DATA
// TMDB API 接続設定
// ========================================

const API_BASE = "https://world-cinema-api.a250893h.workers.dev";

const countries = {
    JP: "日本",
    US: "アメリカ",
    KR: "韓国",
    IN: "インド",
    FR: "フランス",
    GB: "イギリス"
};

// ========================================
// HTML要素
// ========================================

const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

const movieCount = document.getElementById("movieCount");
const genreCount = document.getElementById("genreCount");

const countrySelect = document.getElementById("countrySelect");

const genreView = document.getElementById("genreView");
const comparisonView = document.getElementById("comparisonView");
const rankingSection = document.getElementById("rankingSection");

const genreChartTitle = document.getElementById("genreChartTitle");
const comparisonTitle = document.getElementById("comparisonTitle");

const rankingTitle = document.getElementById("rankingTitle");
const rankingDescription = document.getElementById("rankingDescription");
const rankingBody = document.getElementById("ranking");

const backButton = document.getElementById("backButton");

const movieModal = document.getElementById("movieModal");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");

// ========================================
// 映画詳細要素
// ========================================

const detailPoster = document.getElementById("detailPoster");
const posterPlaceholder = document.getElementById("posterPlaceholder");

const detailTitle = document.getElementById("detailTitle");
const detailOriginalTitle = document.getElementById("detailOriginalTitle");

const detailYear = document.getElementById("detailYear");
const detailGenres = document.getElementById("detailGenres");
const detailRuntime = document.getElementById("detailRuntime");

const detailOverview = document.getElementById("detailOverview");

const detailRating = document.getElementById("detailRating");
const detailVotes = document.getElementById("detailVotes");
const detailPopularity = document.getElementById("detailPopularity");
const detailRevenue = document.getElementById("detailRevenue");
const detailTagline = document.getElementById("detailTagline");

// ========================================
// 状態管理
// ========================================

let genreChart = null;
let countryChart = null;

let genres = [];

let currentCountry = "JP";
let currentGenre = null;

const cache = new Map();

// ========================================
// 共通処理
// ========================================

async function fetchAPI(path) {
    const response = await fetch(`${API_BASE}${path}`);

    if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
    }

    return await response.json();
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function hideError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

function setLoading(show, message = "映画データを読み込んでいます...") {
    loadingMessage.textContent = message;
    loadingMessage.hidden = !show;
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "---";
    }

    return Number(value).toLocaleString("ja-JP");
}

function formatRating(value) {
    if (value === null || value === undefined) {
        return "---";
    }

    return Number(value).toFixed(1);
}

function getYear(date) {
    if (!date) {
        return "---";
    }

    return date.substring(0, 4);
}

function getMovieCacheKey(country, genre, page = 1) {
    return `${country}_${genre || "all"}_${page}`;
}

// ========================================
// 映画データ取得
// ========================================

async function getMovies(country, genre = null, page = 1) {
    const key = getMovieCacheKey(country, genre, page);

    if (cache.has(key)) {
        return cache.get(key);
    }

    const params = new URLSearchParams();

    params.set("country", country);
    params.set("page", page);

    if (genre) {
        params.set("genre", genre);
    }

    const data = await fetchAPI(`/api/discover?${params.toString()}`);

    cache.set(key, data);

    return data;
}

// ========================================
// 同時通信数を制限する処理
// ========================================

async function runWithLimit(items, limit, callback) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const currentIndex = index++;

            results[currentIndex] = await callback(items[currentIndex]);
        }
    }

    const workers = [];

    for (let i = 0; i < Math.min(limit, items.length); i++) {
        workers.push(worker());
    }

    await Promise.all(workers);

    return results;
}

// ========================================
// 初期化
// ========================================

async function initialize() {
    try {
        hideError();
        setLoading(true);

        // ジャンル一覧を取得
        const genreData = await fetchAPI("/api/genres");

        genres = genreData.genres || [];

        genreCount.textContent = genres.length;

        // 初期国の映画を取得
        const initialData = await getMovies(currentCountry);

        movieCount.textContent = formatNumber(initialData.total_results);

        // 初期ランキングを表示
        renderRanking(
            initialData.results || [],
            currentCountry,
            null
        );

        // ジャンルグラフを表示
        await drawGenreChart(currentCountry);

        setLoading(false);

    } catch (error) {
        console.error(error);

        setLoading(false);

        showError(
            "映画データの読み込みに失敗しました。APIの接続を確認してください。"
        );
    }
}

// ========================================
// 国別ジャンル構成グラフ
// ========================================

async function drawGenreChart(country) {
    try {
        hideError();

        currentCountry = country;

        genreChartTitle.textContent =
            `${countries[country]}のジャンル構成`;

        setLoading(true, "ジャンルデータを取得しています...");

        const results = await runWithLimit(
            genres,
            4,
            async (genre) => {
                const data = await getMovies(country, genre.id);

                return {
                    id: genre.id,
                    name: genre.name,
                    count: data.total_results || 0
                };
            }
        );

        const sortedResults = results.sort(
            (a, b) => b.count - a.count
        );

        if (genreChart) {
            genreChart.destroy();
        }

        const ctx = document.getElementById("genreChart");

        genreChart = new Chart(ctx, {
            type: "bar",

            data: {
                labels: sortedResults.map(item => item.name),

                datasets: [{
                    label: "映画作品数",
                    data: sortedResults.map(item => item.count),
                    backgroundColor: "#719cff",
                    borderRadius: 6,
                    barThickness: 20
                }]
            },

            options: {
                indexAxis: "y",

                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${formatNumber(context.raw)}作品`;
                            }
                        }
                    }
                },

                scales: {
                    x: {
                        beginAtZero: true,

                        ticks: {
                            color: "#aeb7c5"
                        },

                        grid: {
                            color: "#303642"
                        }
                    },

                    y: {
                        ticks: {
                            color: "#e1e5ec"
                        },

                        grid: {
                            display: false
                        }
                    }
                },

                onClick: function(event, elements) {
                    if (!elements.length) return;

                    const index = elements[0].index;

                    const selected = sortedResults[index];

                    const selectedGenre = genres.find(
                        genre => genre.id === selected.id
                    );

                    if (selectedGenre) {
                        openGenreComparison(selectedGenre);
                    }
                }
            }
        });

        setLoading(false);

    } catch (error) {
        console.error(error);

        setLoading(false);

        showError("ジャンルグラフの取得に失敗しました。");
    }
}

// ========================================
// ジャンル別6か国比較
// ========================================

async function openGenreComparison(genre) {
    try {
        hideError();

        currentGenre = genre;

        genreView.hidden = true;
        comparisonView.hidden = false;
        rankingSection.hidden = true;

        comparisonTitle.textContent =
            `${genre.name}映画の6か国人気比較`;

        setLoading(true, "6か国の映画データを比較しています...");

        const countryEntries = Object.entries(countries);

        const results = await runWithLimit(
            countryEntries,
            3,
            async ([code, name]) => {
                const data = await getMovies(code, genre.id);

                const movies = data.results || [];

                const averagePopularity = movies.length
                    ? movies.reduce(
                        (sum, movie) => sum + (movie.popularity || 0),
                        0
                    ) / movies.length
                    : 0;

                return {
                    code,
                    name,
                    count: data.total_results || 0,
                    popularity: Number(averagePopularity.toFixed(2))
                };
            }
        );

        drawCountryChart(results);

        setLoading(false);

    } catch (error) {
        console.error(error);

        setLoading(false);

        showError("6か国の比較データを取得できませんでした。");
    }
}

// ========================================
// 6か国比較グラフ
// ========================================

function drawCountryChart(results) {
    if (countryChart) {
        countryChart.destroy();
    }

    const ctx = document.getElementById("countryChart");

    countryChart = new Chart(ctx, {
        type: "bar",

        data: {
            labels: results.map(item => item.name),

            datasets: [{
                label: "平均Popularity",
                data: results.map(item => item.popularity),
                backgroundColor: [
                    "#719cff",
                    "#8c7cff",
                    "#64b5a6",
                    "#e4aa68",
                    "#d77c91",
                    "#8ba6bd"
                ],
                borderRadius: 7,
                barThickness: 48
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const item = results[context.dataIndex];

                            return `対象作品数: ${formatNumber(item.count)}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#e1e5ec"
                    },

                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        color: "#aeb7c5"
                    },

                    grid: {
                        color: "#303642"
                    }
                }
            },

            onClick: function(event, elements) {
                if (!elements.length) return;

                const index = elements[0].index;

                const selected = results[index];

                showCountryRanking(selected.code);
            }
        }
    });
}

// ========================================
// 国別映画ランキング
// ========================================

async function showCountryRanking(country) {
    try {
        hideError();

        currentCountry = country;

        setLoading(true, "映画ランキングを取得しています...");

        const data = await getMovies(
            country,
            currentGenre ? currentGenre.id : null
        );

        renderRanking(
            data.results || [],
            country,
            currentGenre
        );

        setLoading(false);

        rankingSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        console.error(error);

        setLoading(false);

        showError("映画ランキングを取得できませんでした。");
    }
}

// ========================================
// ランキング表示
// ========================================

function renderRanking(movies, country, genre) {
    rankingSection.hidden = false;

    rankingTitle.textContent =
        `${countries[country]}の映画ランキング TOP 5`;

    if (genre) {
        rankingDescription.textContent =
            `${genre.name}ジャンルの人気度ランキングです。`;
    } else {
        rankingDescription.textContent =
            "Popularityを基準にした映画ランキングです。";
    }

    rankingBody.innerHTML = "";

    const topMovies = movies.slice(0, 5);

    if (topMovies.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.textContent = "映画データがありません。";

        row.appendChild(cell);
        rankingBody.appendChild(row);

        return;
    }

    topMovies.forEach((movie, index) => {
        const row = document.createElement("tr");

        row.className = "movie-row";

        const values = [
            index + 1,
            movie.title || "タイトル不明",
            getYear(movie.release_date),
            formatRating(movie.vote_average),
            formatNumber(movie.vote_count),
            Number(movie.popularity || 0).toFixed(2),
            "---"
        ];

        values.forEach((value, cellIndex) => {
            const cell = document.createElement("td");

            cell.textContent = value;

            if (cellIndex === 0) {
                cell.className = "rank-number";
            }

            if (cellIndex === 1) {
                cell.className = "movie-title";
            }

            row.appendChild(cell);
        });

        row.addEventListener("click", () => {
            openMovieDetail(movie.id);
        });

        rankingBody.appendChild(row);
    });
}

// ========================================
// 映画詳細表示
// ========================================

async function openMovieDetail(movieId) {
    try {
        hideError();

        movieModal.hidden = false;

        detailTitle.textContent = "読み込み中...";
        detailOverview.textContent = "映画情報を取得しています...";

        const movie = await fetchAPI(`/api/movie/${movieId}`);

        // タイトル
        detailTitle.textContent =
            movie.title || "タイトル不明";

        detailOriginalTitle.textContent =
            movie.original_title || "";

        // 公開年
        detailYear.textContent =
            `公開年: ${getYear(movie.release_date)}`;

        // ジャンル
        detailGenres.textContent =
            movie.genres && movie.genres.length
                ? movie.genres.map(genre => genre.name).join(" / ")
                : "ジャンル不明";

        // 上映時間
        detailRuntime.textContent =
            movie.runtime
                ? `上映時間: ${movie.runtime}分`
                : "上映時間不明";

        // あらすじ
        detailOverview.textContent =
            movie.overview || "作品概要は登録されていません。";

        // 数値情報
        detailRating.textContent =
            formatRating(movie.vote_average);

        detailVotes.textContent =
            formatNumber(movie.vote_count);

        detailPopularity.textContent =
            Number(movie.popularity || 0).toFixed(2);

        detailRevenue.textContent =
            movie.revenue
                ? `$${formatNumber(movie.revenue)}`
                : "データなし";

        // キャッチコピー
        detailTagline.textContent =
            movie.tagline || "";

        // ポスター
        if (movie.poster_path) {
            detailPoster.src =
                `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

            detailPoster.alt = `${movie.title}のポスター`;
            detailPoster.hidden = false;
            posterPlaceholder.hidden = true;

            detailPoster.onerror = function() {
                detailPoster.hidden = true;
                posterPlaceholder.hidden = false;
            };
        } else {
            detailPoster.hidden = true;
            posterPlaceholder.hidden = false;
        }

    } catch (error) {
        console.error(error);

        detailTitle.textContent = "情報を取得できませんでした";
        detailOverview.textContent =
            "映画情報の取得に失敗しました。";
    }
}

// ========================================
// モーダル操作
// ========================================

function closeMovieModal() {
    movieModal.hidden = true;
}

closeModal.addEventListener("click", closeMovieModal);

modalOverlay.addEventListener("click", closeMovieModal);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMovieModal();
    }
});

// ========================================
// 国選択
// ========================================

countrySelect.addEventListener("change", async function() {
    currentCountry = this.value;
    currentGenre = null;

    comparisonView.hidden = true;
    genreView.hidden = false;
    rankingSection.hidden = true;

    try {
        const data = await getMovies(currentCountry);

        movieCount.textContent =
            formatNumber(data.total_results);

        renderRanking(
            data.results || [],
            currentCountry,
            null
        );

        await drawGenreChart(currentCountry);

    } catch (error) {
        console.error(error);
        showError("国別データの取得に失敗しました。");
    }
});

// ========================================
// 戻るボタン
// ========================================

backButton.addEventListener("click", function() {
    comparisonView.hidden = true;
    genreView.hidden = false;
    rankingSection.hidden = true;
});

// ========================================
// 起動
// ========================================

initialize();
