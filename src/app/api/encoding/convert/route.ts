import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    // Lazy require to avoid bundling in edge
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chardet = require("chardet");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const iconv = require("iconv-lite");
    const detected: string | null = chardet.detect(buf);
    const enc = (detected || "UTF-8").toUpperCase();
    const text = enc === "UTF-8" ? buf.toString("utf8") : iconv.decode(buf, enc);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ error: "invalid_json", encoding: enc }, { status: 400 });
    }
    return NextResponse.json({ encoding: enc, data: json }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

