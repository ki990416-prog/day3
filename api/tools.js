const fs = require("fs")
const path = require("path")

const { spots } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "jeju_spots.json"), "utf8")
)

const AREAS = ["동쪽", "서쪽", "서귀포", "제주시"]
const MAX = 8

// 동쪽·서쪽은 데이터의 "동쪽(성산)", "서쪽(한림)"처럼 괄호가 붙은 지역을 모두 포함한다
const inArea = (spot, area) => spot.area === area || spot.area.startsWith(area + "(")

// indoor는 생략 가능 (생략하면 실내·야외 모두)
function find_spots({ area, indoor } = {}) {
    if (!AREAS.includes(area)) {
        return { error: `area는 ${AREAS.join(" · ")} 중 하나여야 합니다.` }
    }
    return spots
        .filter(s => inArea(s, area))
        .filter(s => indoor === undefined || s.indoor === indoor)
        .slice(0, MAX)
        .map(s => ({ name: s.name, area: s.area, indoor: s.indoor, description: s.type }))
}

// Claude 도구 설명
const find_spots_tool = {
    name: "find_spots",
    description:
        "제주특별자치도의 관광지 목록에서 지역(동쪽·서쪽·서귀포·제주시)과 실내/야외 조건으로 관광지를 찾아 " +
        "이름·지역·실내 여부·설명을 최대 8곳 돌려준다. " +
        "목록 밖 장소는 없다. 이 도구가 돌려준 장소만 추천하고, 결과에 없는 곳은 지어내지 말 것. " +
        "제주도 밖의 장소는 다루지 않는다.",
    input_schema: {
        type: "object",
        properties: {
            area: {
                type: "string",
                enum: AREAS,
                description: "찾을 지역"
            },
            indoor: {
                type: "boolean",
                description: "true면 실내, false면 야외만. 생략하면 모두."
            }
        },
        required: ["area"]
    }
}

// ---- get_weather (Open-Meteo, API 키 필요 없음) ----
// 지역별 대표 좌표
const COORDS = {
    "제주시": [33.50, 126.53],
    "서귀포": [33.25, 126.56],
    "동쪽": [33.46, 126.90],
    "서쪽": [33.38, 126.25],
}

// WMO 날씨 코드 → 한글
const weatherText = (code) =>
    code === 0 ? "맑음" :
    code <= 3 ? "구름 조금~흐림" :
    code <= 48 ? "안개" :
    code <= 57 ? "이슬비" :
    code <= 67 ? "비" :
    code <= 77 ? "눈" :
    code <= 82 ? "소나기" :
    code <= 86 ? "눈 소나기" : "뇌우"

async function get_weather({ area } = {}) {
    if (!COORDS[area]) {
        return { error: `area는 ${AREAS.join(" · ")} 중 하나여야 합니다.` }
    }
    const [lat, lng] = COORDS[area]
    const url = "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${lat}&longitude=${lng}` +
        "&current=temperature_2m,precipitation,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
        "&timezone=Asia%2FSeoul&forecast_days=3"
    const res = await fetch(url)
    if (!res.ok) return { error: "날씨 정보를 가져오지 못했습니다." }
    const d = await res.json()
    return {
        area,
        now: {
            weather: weatherText(d.current.weather_code),
            temperature_c: d.current.temperature_2m,
            precipitation_mm: d.current.precipitation,
            wind_speed_kmh: d.current.wind_speed_10m,
        },
        forecast: d.daily.time.map((date, i) => ({
            date,
            weather: weatherText(d.daily.weather_code[i]),
            max_c: d.daily.temperature_2m_max[i],
            min_c: d.daily.temperature_2m_min[i],
            rain_probability_percent: d.daily.precipitation_probability_max[i],
        })),
    }
}

const get_weather_tool = {
    name: "get_weather",
    description:
        "제주 지역(동쪽·서쪽·서귀포·제주시)의 현재 날씨와 3일 예보(날씨·기온·강수확률)를 알려준다. " +
        "비가 오거나 강수확률이 높으면 실내 관광지를, 맑으면 야외 관광지를 추천하는 근거로 쓴다.",
    input_schema: {
        type: "object",
        properties: {
            area: { type: "string", enum: AREAS, description: "날씨를 볼 지역" }
        },
        required: ["area"]
    }
}

const tools = [find_spots_tool, get_weather_tool]

// 도구 이름 → 실행 함수
const handlers = { find_spots, get_weather }

// Gemini 함수 선언 형식 (type을 대문자로: object → OBJECT)
const upper = (schema) => JSON.parse(
    JSON.stringify(schema, (k, v) => (k === "type" && typeof v === "string" ? v.toUpperCase() : v))
)
const gemini_tools = [{
    functionDeclarations: tools.map(t => ({
        name: t.name, description: t.description, parameters: upper(t.input_schema)
    }))
}]

module.exports = {
    find_spots, find_spots_tool, get_weather, get_weather_tool,
    tools, handlers, gemini_tools
}
