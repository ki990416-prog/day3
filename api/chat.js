const { handlers, gemini_tools } = require("./tools")

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const MAX_TURNS = 5

const SYSTEM = [
    "너는 제주도 여행 추천 도우미다.",
    "사용자의 요청에 맞춰 get_weather로 날씨를 확인하고, find_spots로 관광지를 찾은 뒤 추천한다.",
    "비가 오거나 강수확률이 높으면 실내(indoor: true), 맑으면 야외 관광지를 우선 추천한다.",
    "지역(동쪽·서쪽·서귀포·제주시)을 말하지 않으면 제주시로 보고, 그렇게 가정했다고 밝힌다.",
    "관광지는 find_spots 결과에 있는 곳만 추천하고, 목록 밖 장소는 지어내지 않는다.",
    "제주도 밖 장소를 물으면 제주도 안의 장소만 다룬다고 안내한다.",
    "한국어로 짧고 친근하게 답한다.",
].join("\n")

// Gemini 호출
async function callGemini(contents) {
    const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents,
            tools: gemini_tools,
        }),
    })
    if (!res.ok) throw new Error(`Gemini 오류 ${res.status}`)
    return res.json()
}

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "POST만 지원합니다." })
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." })
    }

    const message = String((req.body && req.body.message) || "").trim().slice(0, 500)
    if (!message) return res.status(400).json({ error: "message가 비어 있습니다." })

    try {
        const contents = [{ role: "user", parts: [{ text: message }] }]
        const steps = []   // 에이전트가 사용한 도구 기록 (화면 표시용)
        const spots = []   // find_spots 결과 (지도 표시용)

        for (let turn = 0; turn < MAX_TURNS; turn++) {
            const data = await callGemini(contents)
            const content = data.candidates && data.candidates[0] && data.candidates[0].content
            if (!content) throw new Error("Gemini 응답이 비어 있습니다.")

            const calls = (content.parts || []).filter(p => p.functionCall)
            if (calls.length === 0) {
                const answer = (content.parts || []).map(p => p.text || "").join("")
                return res.status(200).json({ answer, steps, spots })
            }

            // 모델이 요청한 도구를 실행하고 결과를 돌려준다 (모델 응답은 그대로 기록에 넣는다)
            contents.push(content)
            const results = []
            for (const { functionCall } of calls) {
                const { name, args } = functionCall
                const handler = handlers[name]
                const result = handler ? await handler(args || {}) : { error: "알 수 없는 도구입니다." }
                steps.push({ tool: name, args: args || {} })
                if (name === "find_spots" && Array.isArray(result)) spots.push(...result)
                results.push({ functionResponse: { name, response: { result } } })
            }
            contents.push({ role: "user", parts: results })
        }
        res.status(200).json({ answer: "답변을 만들지 못했습니다. 다시 시도해 주세요.", steps, spots })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
}
