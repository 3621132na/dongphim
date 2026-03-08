const API = "https://ophim1.com/v1/api";
const content = document.getElementById("content");

let state = {
    page: 1,
    genre: "",
    country: "",
    year: "",
    keyword: "",
    cdn: ""
};

function goHome() {

    // reset state
    state.page = 1;
    state.genre = "";
    state.country = "";
    state.year = "";
    state.keyword = "";

    // reset UI
    document.getElementById("genreFilter").value = "";
    document.getElementById("countryFilter").value = "";
    document.getElementById("yearFilter").value = "";
    document.getElementById("searchInput").value = "";

    loadMovies();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================
   INIT
========================= */

async function init() {

    await loadFilters();
    await loadMovies();

    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("keyup", e => {

        if (e.key === "Enter") {
            changePage(1);
        }

    });

}

/* =========================
   LOAD MOVIES
========================= */

async function loadMovies() {

    content.innerHTML = `<div class="loading">⌛ Đang tải phim...</div>`;

    state.keyword = searchInput.value;
    state.genre = genreFilter.value;
    state.country = countryFilter.value;
    state.year = yearFilter.value;

    let url = "";

    if (state.keyword) {

        url = `${API}/tim-kiem?keyword=${encodeURIComponent(state.keyword)}&page=${state.page}`;

    }
    else if (state.genre) {

        url = `${API}/the-loai/${state.genre}?page=${state.page}`;

    }
    else {

        url = `${API}/danh-sach/phim-moi-cap-nhat?page=${state.page}`;

    }

    try {

        const res = await fetch(url);
        const json = await res.json();

        state.cdn = json.data.APP_DOMAIN_CDN_IMAGE || "";

        let movies = json.data.items || [];

        /* =========================
           FILTER COUNTRY + YEAR
        ========================= */

        movies = movies.filter(movie => {

            let ok = true;

            if (state.country)
                ok = ok && movie.country?.some(c => c.slug === state.country);

            if (state.year)
                ok = ok && movie.year == state.year;

            return ok;

        });

        renderMovies(movies);

    }
    catch {

        content.innerHTML = `<p style="text-align:center;padding:50px">
        Lỗi tải API
        </p>`;

    }

}

/* =========================
   RENDER MOVIES
========================= */

function renderMovies(movies) {

    if (!movies.length) {

        content.innerHTML = `<p style="text-align:center">Không tìm thấy phim</p>`;
        return;

    }

    let html = `<div class="movie-grid">`;

    movies.forEach(m => {

        const thumb = m.thumb_url.startsWith("http")
            ? m.thumb_url
            : `${state.cdn}/uploads/movies/${m.thumb_url}`;

        html += `
        <div class="movie-card" onclick="loadDetail('${m.slug}')">

            <span class="episode-badge">${m.episode_current}</span>

            <img src="${thumb}" alt="${m.name}"
            onerror="this.src='https://via.placeholder.com/170x260?text=No+Image'">

            <div class="info">
                <p><b>${m.name}</b></p>
                <p style="color:#888;font-size:0.8rem">${m.year}</p>
            </div>

        </div>
        `;
    });

    html += `</div>`;

    content.innerHTML = html;

}

/* =========================
   CHANGE PAGE
========================= */

function changePage(page) {

    state.page = page;

    loadMovies();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

/* =========================
   MOVIE DETAIL
========================= */

async function loadDetail(slug) {

    content.innerHTML = `<div class="loading">⌛ Đang tải phim...</div>`;

    try {

        const res = await fetch(`${API}/phim/${slug}`);
        const json = await res.json();

        const movie = json.data.item;

        let serversHtml = "";

        movie.episodes.forEach(server => {

            let epBtns = "";

            server.server_data.forEach(ep => {

                epBtns += `
                <button class="ep-btn"
                onclick="playVideo('${ep.link_embed}','${movie.name} - ${ep.name}',this)">
                ${ep.name}
                </button>
                `;

            });

            serversHtml += `
            <div class="server-group">

                <span class="server-name">
                📡 ${server.server_name}
                </span>

                <div class="ep-container">
                ${epBtns}
                </div>

            </div>
            `;

        });

        content.innerHTML = `

        <button onclick="loadMovies()" style="margin-bottom:20px;background:#333">
        ⬅ Trở về
        </button>

        <div style="display:flex;gap:25px;flex-wrap:wrap">

            <img src="${state.cdn}/uploads/movies/${movie.thumb_url}"
            style="width:230px;border-radius:10px">

            <div>

                <h1 style="color:#ff4d4d">${movie.name}</h1>

                <p>${movie.origin_name} (${movie.year})</p>

                <p>${movie.content.replace(/<[^>]*>?/gm,"")}</p>

            </div>

        </div>

        <div id="player-section" style="margin-top:30px;display:none">

            <h3 id="playing-title"></h3>

            <div id="player-area"></div>

        </div>

        <div style="margin-top:30px">

            <h3>Danh sách tập</h3>

            ${serversHtml}

        </div>

        `;

    }
    catch {

        content.innerHTML = `<p>Lỗi tải phim</p>`;

    }

}

/* =========================
   PLAY VIDEO
========================= */

function playVideo(link, title, btn) {

    document
        .querySelectorAll(".ep-btn")
        .forEach(b => b.classList.remove("viewing"));

    btn.classList.add("viewing");

    const section = document.getElementById("player-section");

    section.style.display = "block";

    document.getElementById("playing-title").innerText = title;

    document.getElementById("player-area").innerHTML =
        `<iframe src="${link}" frameborder="0" allowfullscreen></iframe>`;

}

/* =========================
   LOAD FILTER
========================= */

async function loadFilters() {

    try {

        const [gRes, cRes] = await Promise.all([
            fetch(`${API}/the-loai`).then(r => r.json()),
            fetch(`${API}/quoc-gia`).then(r => r.json())
        ]);

        gRes.data.items.forEach(i => {

            genreFilter.innerHTML +=
                `<option value="${i.slug}">${i.name}</option>`;

        });

        cRes.data.items.forEach(i => {

            countryFilter.innerHTML +=
                `<option value="${i.slug}">${i.name}</option>`;

        });

        for (let y = 2026; y >= 2010; y--) {

            yearFilter.innerHTML +=
                `<option value="${y}">${y}</option>`;

        }

    }
    catch {

        console.log("Lỗi tải filter");

    }

}

init();
