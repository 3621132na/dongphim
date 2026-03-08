const API = "https://ophim1.com/v1/api";
const content = document.getElementById("content");

let state = {
    page: 1,
    cdn: "",
    totalPages: 1
};

/* =========================
   KHỞI TẠO
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

function goHome() {
    document.getElementById("typeFilter").value = "";
    document.getElementById("genreFilter").value = "";
    document.getElementById("countryFilter").value = "";
    document.getElementById("yearFilter").value = "";
    document.getElementById("searchInput").value = "";
    state.page = 1;
    loadMovies();
}

/* =========================
   TẢI DANH SÁCH PHIM
========================= */
async function loadMovies() {
    content.innerHTML = `<div class="loading">⌛ Đang tải dữ liệu phim...</div>`;
    
    const keyword = document.getElementById("searchInput").value;
    const typePath = document.getElementById("typeFilter").value;
    const genre = document.getElementById("genreFilter").value;
    const country = document.getElementById("countryFilter").value;
    const year = document.getElementById("yearFilter").value;

    // Chọn URL chính để gọi API từ server
    let url = `${API}/danh-sach/phim-moi-cap-nhat?page=${state.page}`;
    if (keyword) url = `${API}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${state.page}`;
    else if (typePath) url = `${API}/${typePath}?page=${state.page}`;
    else if (genre) url = `${API}/the-loai/${genre}?page=${state.page}`;
    else if (country) url = `${API}/quoc-gia/${country}?page=${state.page}`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        
        state.cdn = json.data.APP_DOMAIN_CDN_IMAGE || "";
        
        // Lấy thông tin phân trang từ API
        const pagin = json.data.params.pagination;
        state.totalPages = pagin.totalPages || Math.ceil(pagin.totalItems / pagin.totalItemsPerPage) || 1;
        
        let movies = json.data.items || [];

        // Lọc chéo phía trình duyệt (Năm)
        if (year) {
            movies = movies.filter(m => m.year == year);
        }

        renderMovies(movies);
    } catch (error) {
        content.innerHTML = `<p style="text-align:center;padding:50px">Lỗi kết nối máy chủ API.</p>`;
    }
}

function renderMovies(movies) {
    if (!movies.length) {
        content.innerHTML = `<p style="text-align:center">Không tìm thấy phim phù hợp.</p>`;
        return;
    }

    let html = `<div class="movie-grid">`;
    movies.forEach(m => {
        const thumb = m.thumb_url.startsWith("http") ? m.thumb_url : `${state.cdn}/uploads/movies/${m.thumb_url}`;
        const typeLabel = m.type === 'series' ? 'Phim bộ' : (m.type === 'single' ? 'Phim lẻ' : (m.type === 'hoathinh' ? 'Hoạt hình' : 'TV Show'));

        html += `
        <div class="movie-card" onclick="loadDetail('${m.slug}')">
            <span class="badge badge-ep">${m.episode_current}</span>
            <span class="badge badge-type">${typeLabel}</span>
            <img src="${thumb}" onerror="this.src='https://via.placeholder.com/170x260?text=No+Image'">
            <div class="info">
                <p><b>${m.name}</b></p>
                <p style="color:#888;font-size:0.8rem">${m.year}</p>
            </div>
        </div>`;
    });
    html += `</div>`;

    // CHÈN PHÂN TRANG VÀO DƯỚI GRID PHIM (Giống code cũ)
    html += renderPagination(state.totalPages);
    
    content.innerHTML = html;
}

/* =========================
   PHÂN TRANG THÔNG MINH (Bê nguyên từ code cũ)
========================= */
function renderPagination(total) {
    if (total <= 1) return "";
    
    let html = `<div class="pagination">`;
    const cur = state.page;
    const delta = 2; // Số trang hiển thị xung quanh trang hiện tại

    html += `<button onclick="changePage(${cur - 1})" ${cur === 1 ? 'disabled' : ''}>&laquo;</button>`;
    
    // Trang đầu
    html += `<button class="${cur === 1 ? 'active' : ''}" onclick="changePage(1)">1</button>`;

    if (cur - delta > 2) html += `<span>...</span>`;

    // Các trang ở giữa
    for (let i = Math.max(2, cur - delta); i <= Math.min(total - 1, cur + delta); i++) {
        html += `<button class="${cur === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (cur + delta < total - 1) html += `<span>...</span>`;

    // Trang cuối
    if (total > 1) {
        html += `<button class="${cur === total ? 'active' : ''}" onclick="changePage(${total})">${total}</button>`;
    }

    html += `<button onclick="changePage(${cur + 1})" ${cur === total ? 'disabled' : ''}>&raquo;</button>`;
    html += `</div>`;
    
    return html;
}

function changePage(p) {
    if (p < 1 || p > state.totalPages) return;
    state.page = p;
    loadMovies();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================
   CHI TIẾT PHIM (Đã lược bỏ thông tin theo yêu cầu)
========================= */
async function loadDetail(slug) {
    content.innerHTML = `<div class="loading">⌛ Đang tải thông tin...</div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
        const res = await fetch(`${API}/phim/${slug}`);
        const json = await res.json();
        const movie = json.data.item;
        
        document.title = movie.name;

        // Chỉ lấy tên diễn viên, không lấy ảnh
        const actorNames = movie.actor?.length > 0 ? movie.actor.join(", ") : "Đang cập nhật";
        const tags = movie.category?.map(c => `<span class="tag-item">${c.name}</span>`).join("");

        let serversHtml = movie.episodes.map(sv => `
            <div class="server-group">
                <span class="server-name">📡 Nguồn: ${sv.server_name}</span>
                <div class="ep-container">
                    ${sv.server_data.map(ep => `<button class="ep-btn" onclick="playVideo('${ep.link_embed}','${movie.name} - ${ep.name}',this)">${ep.name}</button>`).join('')}
                </div>
            </div>
        `).join('');

        content.innerHTML = `
        <div class="detail-view">
            <button onclick="loadMovies()" style="margin-bottom:20px;background:#333">⬅ Trở về</button>
            <div style="display:flex; gap:25px; flex-wrap:wrap">
                <div class="detail-poster">
                    <img src="${state.cdn}/uploads/movies/${movie.thumb_url}" style="width:230px; border-radius:10px; box-shadow: 0 5px 20px rgba(0,0,0,0.5)">
                </div>
                <div style="flex:1; min-width:300px">
                    <h1 style="color:var(--primary); margin:0">${movie.name}</h1>
                    <p style="color:#888;">${movie.origin_name} (${movie.year})</p>
                    <div class="meta-info" style="margin: 15px 0;">
                        <p><b>Thể loại:</b> ${tags}</p>
                        <p><b>Ngôn ngữ:</b> ${movie.lang} | <b>Chất lượng:</b> ${movie.quality}</p>
                        <p><b>Thời lượng:</b> ${movie.time || 'N/A'}</p>
                        <p><b>Diễn viên:</b> ${actorNames}</p>
                    </div>
                    <p><b>Nội dung:</b> ${movie.content.replace(/<[^>]*>?/gm,"")}</p>
                </div>
            </div>

            <div id="player-section" style="margin-top:30px; display:none">
                <h3 id="playing-title" style="color:var(--primary)"></h3>
                <div id="player-area"></div>
            </div>

            <div style="margin-top:30px">
                <h3>Danh sách tập phim:</h3>
                ${serversHtml}
            </div>
        </div>`;
    } catch {
        content.innerHTML = `<p>Lỗi tải thông tin phim.</p>`;
    }
}

function playVideo(link, title, btn) {
    document.querySelectorAll(".ep-btn").forEach(b => b.classList.remove("viewing"));
    btn.classList.add("viewing");
    document.getElementById("player-section").style.display = "block";
    document.getElementById("playing-title").innerText = "🎬 Đang phát: " + title;
    document.getElementById("player-area").innerHTML = `<iframe src="${link}" allowfullscreen></iframe>`;
    document.getElementById("player-section").scrollIntoView({ behavior: "smooth" });
}

async function loadFilters() {
    try {
        const [gRes, cRes] = await Promise.all([
            fetch(`${API}/the-loai`).then(r => r.json()),
            fetch(`${API}/quoc-gia`).then(r => r.json())
        ]);
        const genreFilter = document.getElementById("genreFilter");
        const countryFilter = document.getElementById("countryFilter");
        const yearFilter = document.getElementById("yearFilter");

        gRes.data.items.forEach(i => genreFilter.innerHTML += `<option value="${i.slug}">${i.name}</option>`);
        cRes.data.items.forEach(i => countryFilter.innerHTML += `<option value="${i.slug}">${i.name}</option>`);
        for (let y = 2026; y >= 2010; y--) yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    } catch { console.log("Lỗi tải bộ lọc"); }
}

init();
