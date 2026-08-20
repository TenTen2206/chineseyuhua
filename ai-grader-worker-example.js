
/*
  Example secure AI grading endpoint.
  Deploy this file as a serverless function / worker and keep your AI provider key
  in that platform's secret/environment-variable settings.

  Required request JSON:
  {
    "level": "HSK 3",
    "lesson": 1,
    "sourceVietnamese": "...",
    "referenceChinese": "...",
    "studentChinese": "..."
  }

  Expected response JSON:
  {
    "score": 8,
    "verdict": "Khá tốt",
    "strengths": ["..."],
    "errors": [
      {
        "type": "Ngữ pháp",
        "original": "...",
        "suggestion": "...",
        "reason": "..."
      }
    ],
    "correctedChinese": "...",
    "explanation": "..."
  }

  IMPORTANT:
  - Never put a secret API key in index.html/app-v6.js.
  - Add CORS restrictions for your GitHub Pages domain in production.
  - Connect your chosen AI provider here and force JSON output matching the schema above.
*/

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();

    // Replace this demo response with your actual AI provider call.
    const demo = {
      score: 0,
      verdict: "AI endpoint chưa được nối với nhà cung cấp mô hình",
      strengths: [],
      errors: [],
      correctedChinese: body.referenceChinese || "",
      explanation:
        "Frontend đã kết nối đúng. Hãy cấu hình lời gọi mô hình AI trong worker/serverless function này."
    };

    return new Response(JSON.stringify(demo), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
