import { getStore } from "@netlify/blobs"
import type { Config } from "@netlify/functions"

// 조회수: 방문 1회마다 고유 키의 작은 기록을 하나씩 추가(append-only)하고,
// 개수를 세어 보여준다. 같은 키를 읽고-고쳐-쓰지 않으므로 동시 방문에도 숫자가 꼬이지 않는다.
// 키 형식: v/YYYY-MM-DD/<랜덤ID>  (날짜는 한국 시간 기준)

const store = () => getStore("pageviews")

const kstDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())

async function countKeys(prefix: string): Promise<number> {
  let n = 0
  for await (const page of store().list({ prefix, paginate: true })) n += page.blobs.length
  return n
}

export default async (req: Request) => {
  const today = kstDate()
  try {
    if (req.method === "POST") {
      await store().set(`v/${today}/${crypto.randomUUID()}`, "1")
    }
    const [total, todayCount] = await Promise.all([countKeys("v/"), countKeys(`v/${today}/`)])
    return Response.json(
      { total, today: todayCount, date: today },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.error("views error", err)
    return Response.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}

export const config: Config = {
  path: "/api/views",
  method: ["GET", "POST"],
}
