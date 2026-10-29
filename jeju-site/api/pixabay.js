// Pixabay 검색을 서버에서 대신 호출한다 (API 키가 브라우저에 노출되지 않도록)
export default async function handler(req, res) {
    const key = process.env.PIXABAY_API_KEY
    if (!key) return res.status(500).json({ error: "서버에 PIXABAY_API_KEY가 설정되지 않았습니다." })

    const q = String(req.query.q || "jeju island").slice(0, 100)
    const url = new URL("https://pixabay.com/api/")
    url.search = new URLSearchParams({
        key, q, image_type: "photo", per_page: "24", safesearch: "true", order: "popular",
    }).toString()

    try {
        const r = await fetch(url)
        if (!r.ok) return res.status(502).json({ error: `Pixabay 오류 ${r.status}` })
        const data = await r.json()
        // 화면에 필요한 값만 돌려준다. Pixabay 약관상 24시간 캐시를 권장한다.
        res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=3600")
        res.status(200).json({
            hits: data.hits.map(h => ({ id: h.id, webformatURL: h.webformatURL, pageURL: h.pageURL, tags: h.tags }))
        })
    } catch (e) {
        res.status(500).json({ error: "사진 서버에 연결하지 못했습니다." })
    }
}
