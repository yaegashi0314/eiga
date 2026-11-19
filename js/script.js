
/* =========================================
   WORLD CINEMA DATA
   映画データ比較サイト
========================================= */

// 国の設定
const COUNTRIES = {
    JP: "日本",
    US: "アメリカ",
    KR: "韓国",
    IN: "インド",
    FR: "フランス",
    GB: "イギリス"
};

// ジャンルの日本語表記
const GENRE_NAMES = {
    "Drama": "ドラマ",
    "Comedy": "コメディ",
    "Thriller": "スリラー",
    "Romance": "恋愛",
    "Action": "アクション",
    "Horror": "ホラー",
    "Crime": "犯罪",
    "Documentary": "ドキュメンタリー",
    "Adventure": "アドベンチャー",
    "Science Fiction": "SF",
    "Family": "ファミリー",
    "Mystery": "ミステリー",
    "Fantasy": "ファンタジー",
    "Animation": "アニメーション",
    "Music": "音楽",
    "History": "歴史",
    "War": "戦争",
    "Western": "西部劇",
    "TV Movie": "テレビ映画",
    "Foreign": "外国映画"
};

// グラフの色
const COLORS = [
    "#719cff",
    "#ff9b71",
    "#70c6a3",
    "#c18cff",
    "#f2c66d",
    "#ef7c9d"
];

// CSVデータ
let movies = [];

// グラフ
let genreChart = null;
let countryChart = null;

// 選択中のジャンル
let selectedGenre = "";


/* =========================================
   HTML要素
========================================= */

const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

const movieCountElement = document.getElementById("movieCount");
const genreCountElement = document.getElementById("genreCount");

const countrySelect = document.getElementById("countrySelect");

const genreView = document.getElementById("genreView");
const comparisonView = document.getElementById("comparisonView");
const rankingSection = document.getElementById("rankingSection");

const genreCanvas = document.getElementById("genreChart");
const countryCanvas = document.getElementById("countryChart");

const rankingBody = document.getElementById("ranking");

const movieModal = document.getElementById("movieModal");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");

const backButton = document.getElementById("backButton");


/* =========================================
   初期設定
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    // 初期表示
    genreView.hidden = false;
    comparisonView.hidden = true;
    rankingSection.hidden = true;
    movieModal.hidden = true;

    // CSV読み込み
    loadCSV();

});


/* =========================================
   CSV読み込み
========================================= */

function loadCSV() {

    Papa.parse("data/movies_metadata.csv", {

        download: true,
        header: true,
        skipEmptyLines: true,

        complete: function (results) {

            try {

                movies = results.data
                    .map(convertMovie)
                    .filter(movie => movie.title);

                if (movies.length === 0) {
                    throw new Error("映画データがありません。");
                }

                // 読み込み完了
                loadingMessage.hidden = true;

                // データ概要を更新
                updateStatistics();

                // 最初のグラフを表示
                drawGenreChart();

                // コンソール確認用
                console.log("読み込み完了:", movies.length, "作品");

            } catch (error) {

                console.error(error);
                showError("映画データの処理中にエラーが発生しました。");

            }

        },

        error: function (error) {

            console.error(error);
            showError("CSVファイルを読み込めませんでした。");

        }

    });

}


/* =========================================
   CSVデータ変換
========================================= */

function convertMovie(row) {

    const genres = extractNames(row.genres);
    const countries = extractCountryCodes(row.production_countries);

    const releaseDate = row.release_date || "";

    const year = releaseDate.length >= 4
        ? releaseDate.substring(0, 4)
        : "不明";

    return {

        id: row.id || "",

        title: row.title || "",
        originalTitle: row.original_title || "",

        overview: row.overview || "",
        tagline: row.tagline || "",

        genres: genres,
        countries: countries,

        year: year,

        runtime: toNumber(row.runtime),
        popularity: toNumber(row.popularity),

        voteAverage: toNumber(row.vote_average),
        voteCount: toNumber(row.vote_count),

        revenue: toNumber(row.revenue),

        posterPath: row.poster_path || ""

    };

}


/* =========================================
   ジャンル抽出
========================================= */

function extractNames(value) {

    if (!value) return [];

    const matches = [
        ...String(value).matchAll(/'name':\s*'((?:\\'|[^'])*)'/g)
    ];

    return [...new Set(
        matches.map(match => match[1].replace(/\\'/g, "'"))
    )];

}


/* =========================================
   国コード抽出
========================================= */

function extractCountryCodes(value) {

    if (!value) return [];

    const matches = [
        ...String(value).matchAll(/'iso_3166_1':\s*'([A-Z]{2})'/g)
    ];

    return [...new Set(matches.map(match => match[1]))];

}


/* =========================================
   数値変換
========================================= */

function toNumber(value) {

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;

}


/* =========================================
   データ概要の更新
========================================= */

function updateStatistics() {

    // 映画数
    movieCountElement.textContent =
        movies.length.toLocaleString("ja-JP");

    // 全作品に含まれるジャンルを集計
    const allGenres = new Set();

    movies.forEach(movie => {

        movie.genres.forEach(genre => {
            allGenres.add(genre);
        });

    });

    // ジャンル数
    genreCountElement.textContent = allGenres.size;

}


/* =========================================
   エラー表示
========================================= */

function showError(message) {

    loadingMessage.hidden = true;

    errorMessage.textContent = message;
    errorMessage.hidden = false;

}


/* =========================================
   国別ジャンル構成グラフ
========================================= */

function drawGenreChart() {

    const countryCode = countrySelect.value;
    const countryName = COUNTRIES[countryCode];

    // 選択した国の映画
    const countryMovies = movies.filter(movie =>
        movie.countries.includes(countryCode)
    );

    // ジャンル別の作品数
    const genreCounts = {};

    countryMovies.forEach(movie => {

        movie.genres.forEach(genre => {

            genreCounts[genre] =
                (genreCounts[genre] || 0) + 1;

        });

    });

    // 作品数の多い順
    const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    const labels = sortedGenres.map(item =>
        GENRE_NAMES[item[0]] || item[0]
    );

    const values = sortedGenres.map(item => item[1]);

    // 前のグラフを削除
    if (genreChart) {
        genreChart.destroy();
    }

    genreChart = new Chart(genreCanvas, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{

                label: "映画の作品数",

                data: values,

                backgroundColor: COLORS,

                borderRadius: 5

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

            // ジャンルをクリック
            onClick: function (event, elements) {

                if (elements.length === 0) return;

                const index = elements[0].index;

                const genre = sortedGenres[index][0];

                openGenreComparison(genre);

            }

        }

    });

    // タイトル変更
    document.getElementById("genreChartTitle").textContent =
        `${countryName}のジャンル別作品数`;

    // 画面切り替え
    genreView.hidden = false;
    comparisonView.hidden = true;
    rankingSection.hidden = true;

}


/* =========================================
   ジャンル別・6か国人気度比較
========================================= */

function openGenreComparison(genre) {

    selectedGenre = genre;

    const genreName = GENRE_NAMES[genre] || genre;

    // 画面切り替え
    genreView.hidden = true;
    comparisonView.hidden = false;
    rankingSection.hidden = true;

    // タイトル
    document.getElementById("comparisonTitle").textContent =
        `${genreName}映画の国別人気度`;

    // 6か国のデータ
    const countryData = Object.keys(COUNTRIES).map(code => {

        const targetMovies = movies.filter(movie =>

            movie.countries.includes(code) &&
            movie.genres.includes(genre) &&
            movie.popularity > 0 &&
            movie.voteCount >= 50

        );

        // 平均Popularity
        const averagePopularity = targetMovies.length > 0

            ? targetMovies.reduce(
                (sum, movie) => sum + movie.popularity,
                0
            ) / targetMovies.length

            : 0;

        return {

            code: code,

            name: COUNTRIES[code],

            popularity: Number(averagePopularity.toFixed(2)),

            count: targetMovies.length

        };

    });

    // 古いグラフを削除
    if (countryChart) {
        countryChart.destroy();
    }

    countryChart = new Chart(countryCanvas, {

        type: "bar",

        data: {

            labels: countryData.map(item => item.name),

            datasets: [{

                label: "平均人気度",

                data: countryData.map(item => item.popularity),

                backgroundColor: COLORS,

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

                        afterLabel: function (context) {

                            const item = countryData[context.dataIndex];

                            return `対象作品数：${item.count}作品`;

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
                    },

                    title: {
                        display: true,
                        text: "平均Popularity",
                        color: "#aeb4c0"
                    }

                }

            },

            // 国をクリック
            onClick: function (event, elements) {

                if (elements.length === 0) return;

                const index = elements[0].index;

                const countryCode = countryData[index].code;

                showRanking(countryCode, genre);

            }

        }

    });

}


/* =========================================
   映画ランキングTOP5
========================================= */

function showRanking(countryCode, genre) {

    const countryName = COUNTRIES[countryCode];

    const genreName = GENRE_NAMES[genre] || genre;

    // 条件に合う映画を取得
    const targetMovies = movies

        .filter(movie =>

            movie.countries.includes(countryCode) &&
            movie.genres.includes(genre) &&
            movie.popularity > 0 &&
            movie.voteCount >= 50

        )

        .sort((a, b) =>
            b.popularity - a.popularity
        )

        .slice(0, 5);


    // タイトル更新
    document.getElementById("rankingTitle").textContent =
        `${countryName}の${genreName}映画ランキング TOP 5`;

    document.getElementById("rankingDescription").textContent =
        `${countryName}の${genreName}映画をPopularity順に表示しています。`;


    // 表の中身をリセット
    rankingBody.innerHTML = "";


    if (targetMovies.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 7;

        cell.textContent = "該当する映画データがありません。";

        row.appendChild(cell);

        rankingBody.appendChild(row);

    } else {

        targetMovies.forEach((movie, index) => {

            const row = document.createElement("tr");

            row.className = "movie-row";

            const values = [

                index + 1,

                movie.title,

                movie.year,

                movie.voteAverage > 0
                    ? movie.voteAverage.toFixed(1)
                    : "不明",

                movie.voteCount.toLocaleString(),

                movie.popularity.toFixed(2),

                movie.revenue > 0
                    ? formatMoney(movie.revenue)
                    : "不明"

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

            // 映画をクリックすると詳細表示
            row.addEventListener("click", () => {
                openMovieDetail(movie);
            });

            rankingBody.appendChild(row);

        });

    }

    // ランキングを表示
    rankingSection.hidden = false;

    rankingSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* =========================================
   映画詳細モーダル
========================================= */

function openMovieDetail(movie) {

    // 基本情報
    setText("detailTitle", movie.title);

    setText(
        "detailOriginalTitle",
        movie.originalTitle
            ? `原題：${movie.originalTitle}`
            : "原題：不明"
    );

    setText("detailYear", movie.year);

    setText(
        "detailGenres",
        movie.genres
            .map(genre => GENRE_NAMES[genre] || genre)
            .join(" / ")
    );

    setText(
        "detailRuntime",
        movie.runtime > 0
            ? `${movie.runtime}分`
            : "上映時間不明"
    );

    // あらすじ
    setText(
        "detailOverview",
        movie.overview || "作品概要は登録されていません。"
    );

    // 数値情報
    setText(
        "detailRating",
        movie.voteAverage > 0
            ? `${movie.voteAverage.toFixed(1)} / 10`
            : "不明"
    );

    setText(
        "detailVotes",
        movie.voteCount.toLocaleString()
    );

    setText(
        "detailPopularity",
        movie.popularity.toFixed(2)
    );

    setText(
        "detailRevenue",
        movie.revenue > 0
            ? formatMoney(movie.revenue)
            : "不明"
    );

    // キャッチコピー
    setText("detailTagline", movie.tagline);


    // ポスター画像
    const poster = document.getElementById("detailPoster");

    const placeholder =
        document.getElementById("posterPlaceholder");

    if (movie.posterPath) {

        poster.src =
            `https://image.tmdb.org/t/p/w500${movie.posterPath}`;

        poster.hidden = false;
        placeholder.hidden = true;

        poster.onerror = function () {

            poster.hidden = true;
            placeholder.hidden = false;

        };

    } else {

        poster.hidden = true;
        placeholder.hidden = false;

    }


    // モーダル表示
    movieModal.hidden = false;

    document.body.style.overflow = "hidden";

}


/* =========================================
   テキスト更新
========================================= */

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


/* =========================================
   金額表示
========================================= */

function formatMoney(value) {

    return "$" + Math.round(value).toLocaleString("en-US");

}


/* =========================================
   モーダルを閉じる
========================================= */

function hideMovieDetail() {

    movieModal.hidden = true;

    document.body.style.overflow = "";

}

closeModal.addEventListener("click", hideMovieDetail);

modalOverlay.addEventListener("click", hideMovieDetail);


// Escapeキーでも閉じる
document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        hideMovieDetail();
    }

});


/* =========================================
   戻るボタン
========================================= */

backButton.addEventListener("click", () => {

    genreView.hidden = false;
    comparisonView.hidden = true;
    rankingSection.hidden = true;

    genreView.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

});


/* =========================================
   国の選択変更
========================================= */

countrySelect.addEventListener("change", () => {

    drawGenreChart();

});
