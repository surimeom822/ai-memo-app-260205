'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Memo, MemoFormData } from '@/types/memo'
import {
  getMemos as fetchMemos,
  createMemo as createMemoAction,
  updateMemo as updateMemoAction,
  deleteMemo as deleteMemoAction,
  clearAllMemos as clearAllMemosAction,
  seedSampleData,
} from '@/app/actions/memos'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드
  useEffect(() => {
    const loadMemos = async () => {
      setLoading(true)
      try {
        // 샘플 데이터 시딩 (기존 데이터가 없을 때만)
        await seedSampleData()
        const loadedMemos = await fetchMemos()
        setMemos(loadedMemos)
      } catch (error) {
        console.error('Failed to load memos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMemos()
  }, [])

  // 메모 생성
  const createMemo = useCallback(async (formData: MemoFormData): Promise<Memo | null> => {
    const newMemo = await createMemoAction(formData)

    if (newMemo) {
      setMemos(prev => [newMemo, ...prev])
    }

    return newMemo
  }, [])

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      const updatedMemo = await updateMemoAction(id, formData)

      if (updatedMemo) {
        setMemos(prev => prev.map(memo => (memo.id === id ? updatedMemo : memo)))
      }
    },
    []
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    const success = await deleteMemoAction(id)

    if (success) {
      setMemos(prev => prev.filter(memo => memo.id !== id))
    }
  }, [])

  // 메모 상태 직접 업데이트 (요약 저장 등에서 사용)
  const updateMemoInState = useCallback((updatedMemo: Memo): void => {
    setMemos(prev => prev.map(memo => (memo.id === updatedMemo.id ? updatedMemo : memo)))
  }, [])

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 모든 메모 삭제
  const clearAllMemos = useCallback(async (): Promise<void> => {
    const success = await clearAllMemosAction()

    if (success) {
      setMemos([])
      setSearchQuery('')
      setSelectedCategory('all')
    }
  }, [])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,
    updateMemoInState,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,

    // 유틸리티
    clearAllMemos,
  }
}
