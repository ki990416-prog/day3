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

module.exports = { find_spots, find_spots_tool, tools: [find_spots_tool] }
