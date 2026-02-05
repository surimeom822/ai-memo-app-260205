import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not defined' },
        { status: 500 }
      )
    }

    const { title, content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // 사용자가 요청한 모델: gemini-2.5-flash-lite
    // 만약 해당 모델이 아직 SDK나 API에서 정식 지원되지 않는 경우 gemini-1.5-flash 등을 고려해야 할 수도 있으나,
    // 요구사항에 따라 명시된 모델명을 사용함.
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `
다음 메모를 간결하게 요약해줘.
제목: ${title}
내용:
${content}

요약은 3-5줄 내외로 작성하고, 핵심 내용을 포함해야 해.
Markdown 형식으로 출력해줘.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const summary = response.text()

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
