'use client'

import { useEffect, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import '@uiw/react-markdown-preview/markdown.css'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'
import { saveMemoSummary } from '@/app/actions/memos'

// SSR 비활성화하여 MDEditor.Markdown 동적 로드
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false }
)

interface MemoViewerProps {
  memo: Memo | null
  isOpen: boolean
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onMemoUpdate?: (memo: Memo) => void
}

export default function MemoViewer({
  memo,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMemoUpdate,
}: MemoViewerProps) {
  const [summary, setSummary] = useState<string>('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState<string | null>(null)

  // 메모가 변경될 때 저장된 요약 로드
  useEffect(() => {
    if (memo) {
      setSummary(memo.summary || '')
      setSummaryUpdatedAt(memo.summaryUpdatedAt || null)
      setSummaryError(null)
    }
  }, [memo?.id, memo?.summary, memo?.summaryUpdatedAt])

  const handleSummarize = async () => {
    if (!memo) return

    setIsSummarizing(true)
    setSummaryError(null)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: memo.title,
          content: memo.content,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '요약을 생성하는데 실패했습니다.')
      }

      // 요약 결과를 DB에 저장
      const updatedMemo = await saveMemoSummary(memo.id, data.summary)

      if (updatedMemo) {
        setSummary(updatedMemo.summary || '')
        setSummaryUpdatedAt(updatedMemo.summaryUpdatedAt || null)
        // 부모 컴포넌트에 업데이트된 메모 전달
        onMemoUpdate?.(updatedMemo)
      } else {
        // DB 저장 실패 시에도 UI에는 표시
        setSummary(data.summary)
        setSummaryUpdatedAt(new Date().toISOString())
      }
    } catch (error) {
      console.error('Summary error:', error)
      setSummaryError(
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      )
    } finally {
      setIsSummarizing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      personal: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800',
      study: 'bg-purple-100 text-purple-800',
      idea: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  // ESC 키 핸들링
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // 모달 열릴 때 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  // 배경 클릭 핸들링
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleEdit = () => {
    if (memo) {
      onEdit(memo)
    }
  }

  const handleDelete = () => {
    if (memo && window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  if (!isOpen || !memo) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      data-testid="memo-viewer-backdrop"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 pr-4">
              <h2
                className="text-2xl font-semibold text-gray-900 mb-3"
                data-testid="memo-viewer-title"
              >
                {memo.title}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(memo.category)}`}
                >
                  {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
                    memo.category}
                </span>
                <span className="text-sm text-gray-500">
                  수정: {formatDate(memo.updatedAt)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="닫기"
              data-testid="memo-viewer-close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* AI 요약 섹션 */}
          <div className="mb-6" data-color-mode="light">
            {summary && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    AI 요약
                  </h3>
                  {summaryUpdatedAt && (
                    <span className="text-xs text-blue-600">
                      {formatDate(summaryUpdatedAt)}
                    </span>
                  )}
                </div>
                <div className="prose prose-sm prose-blue max-w-none">
                  <MDPreview source={summary} />
                </div>
              </div>
            )}
            {summaryError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {summaryError}
              </div>
            )}

            {/* 내용 - 마크다운 렌더링 */}
            <div
              className="prose prose-gray max-w-none"
              data-testid="memo-viewer-content"
            >
              <MDPreview source={memo.content} />
            </div>
          </div>

          {/* 태그 */}
          {memo.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2 flex-wrap">
                {memo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 메타 정보 */}
          <div className="mb-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col gap-1 text-sm text-gray-500">
              <span>생성: {formatDate(memo.createdAt)}</span>
              {memo.createdAt !== memo.updatedAt && (
                <span>마지막 수정: {formatDate(memo.updatedAt)}</span>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="memo-viewer-summarize"
            >
              {isSummarizing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-purple-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  요약 중...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  {summary ? 'AI 요약 다시 생성' : 'AI 요약'}
                </>
              )}
            </button>
            <button
              onClick={handleEdit}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              data-testid="memo-viewer-edit"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              편집
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              data-testid="memo-viewer-delete"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
