import "./style.css"
import { supabase } from "./supabase.js"

// 탭 이름(한글) → Pixabay 검색어(영어가 결과가 더 좋음)
const TABS = [
    { label: "전체", q: "jeju island" },
    { label: "바다", q: "jeju sea" },
    { label: "오름", q: "jeju oreum" },
    { label: "한라산", q: "hallasan" },
    { label: "감귤", q: "jeju tangerine" },
    { label: "돌하르방", q: "dol hareubang" },
    { label: "폭포", q: "jeju waterfall" },
]
const MY_TAB = "내 보관함"

const $ = (id) => document.getElementById(id)
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))

let user = null          // 로그인한 사용자 (없으면 null)
let currentTab = TABS[0].label
let favIds = new Set()   // 내가 담은 이미지 id
let authMode = "login"   // "login" | "signup"

// ---------- 화면: 상단 메뉴 ----------
function renderNav() {
    $("nav").innerHTML = user
        ? `<span class="who">${esc(user.email)}</span><button id="logoutBtn" class="ghost">로그아웃</button>`
        : `<button id="loginBtn" class="ghost">로그인 / 회원가입</button>`
    if (user) $("logoutBtn").onclick = () => supabase.auth.signOut()
    else $("loginBtn").onclick = () => openAuth("login")
}

function renderTabs() {
    const labels = user ? [...TABS.map(t => t.label), MY_TAB] : TABS.map(t => t.label)
    $("tabs").innerHTML = labels.map(l =>
        `<button class="tab ${l === currentTab ? "on" : ""}" data-tab="${esc(l)}">${esc(l)}</button>`).join("")
}

// ---------- 갤러리 ----------
function renderGrid(items) {
    $("grid").innerHTML = items.map(it => `
        <figure class="card">
            <a href="${esc(it.page_url)}" target="_blank" rel="noopener">
                <img src="${esc(it.preview_url)}" alt="${esc(it.tags)}" loading="lazy">
            </a>
            <figcaption>
                <span class="tags">${esc(it.tags)}</span>
                <button class="heart ${favIds.has(it.image_id) ? "on" : ""}" data-id="${it.image_id}"
                    data-preview="${esc(it.preview_url)}" data-page="${esc(it.page_url)}" data-tags="${esc(it.tags)}"
                    title="내 보관함에 담기">♥</button>
            </figcaption>
        </figure>`).join("")
}

async function loadTab() {
    $("status").textContent = "불러오는 중..."
    $("grid").innerHTML = ""
    try {
        if (currentTab === MY_TAB) {
            const { data, error } = await supabase.from("favorites").select("*").order("created_at", { ascending: false })
            if (error) throw error
            $("status").textContent = data.length ? "" : "아직 담은 사진이 없어요. ♥를 눌러 담아 보세요."
            renderGrid(data)
            return
        }
        const q = TABS.find(t => t.label === currentTab).q
        const res = await fetch(`/api/pixabay?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "사진을 불러오지 못했습니다.")
        $("status").textContent = data.hits.length ? "" : "결과가 없습니다."
        renderGrid(data.hits.map(h => ({
            image_id: h.id, preview_url: h.webformatURL, page_url: h.pageURL, tags: h.tags
        })))
    } catch (e) {
        $("status").textContent = "오류: " + (e.message || e)
    }
}

async function loadFavIds() {
    favIds = new Set()
    if (!user) return
    const { data } = await supabase.from("favorites").select("image_id")
    for (const row of data || []) favIds.add(Number(row.image_id))
}

// ♥ 누르기: 담기/빼기 (로그인 필요)
async function toggleFav(btn) {
    if (!user) return openAuth("login")
    const id = Number(btn.dataset.id)
    if (favIds.has(id)) {
        const { error } = await supabase.from("favorites").delete().eq("image_id", id)
        if (error) return alert("오류: " + error.message)
        favIds.delete(id)
        if (currentTab === MY_TAB) return loadTab()
    } else {
        const { error } = await supabase.from("favorites").insert({
            image_id: id, preview_url: btn.dataset.preview, page_url: btn.dataset.page, tags: btn.dataset.tags
        })
        if (error) return alert("오류: " + error.message)
        favIds.add(id)
    }
    btn.classList.toggle("on", favIds.has(id))
}

// ---------- 로그인 / 회원가입 창 ----------
function openAuth(mode) {
    authMode = mode
    const login = mode === "login"
    $("authTitle").textContent = login ? "로그인" : "회원가입"
    $("authSubmit").textContent = login ? "로그인" : "가입하기"
    $("authSwitch").textContent = login ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"
    $("password").autocomplete = login ? "current-password" : "new-password"
    $("authMsg").textContent = ""
    $("authDialog").showModal()
}

$("authSwitch").onclick = () => openAuth(authMode === "login" ? "signup" : "login")
$("authClose").onclick = () => $("authDialog").close()

$("authForm").onsubmit = async (e) => {
    e.preventDefault()
    const email = $("email").value.trim()
    const password = $("password").value
    $("authMsg").textContent = "처리 중..."
    const { data, error } = authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) {
        $("authMsg").textContent = error.message
        return
    }
    // 이메일 확인을 켜 둔 경우 회원가입 직후에는 세션이 없다
    if (authMode === "signup" && !data.session) {
        $("authMsg").textContent = "가입 완료! 메일함의 확인 링크를 누른 뒤 로그인하세요."
        return
    }
    $("authForm").reset()
    $("authDialog").close()
}

// ---------- 시작 ----------
$("tabs").onclick = (e) => {
    const b = e.target.closest(".tab")
    if (!b) return
    currentTab = b.dataset.tab
    renderTabs()
    loadTab()
}
$("grid").onclick = (e) => {
    const b = e.target.closest(".heart")
    if (b) toggleFav(b)
}

async function start() {
    if (!supabase) {
        $("nav").innerHTML = ""
        $("status").textContent = "Supabase 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다."
        renderTabs()
        return
    }
    // 로그인 상태가 바뀔 때마다(로그인·로그아웃·새로고침) 화면을 다시 그린다
    supabase.auth.onAuthStateChange(async (_event, session) => {
        user = session ? session.user : null
        if (!user && currentTab === MY_TAB) currentTab = TABS[0].label
        await loadFavIds()
        renderNav()
        renderTabs()
        loadTab()
    })
}
start()
