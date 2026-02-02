import { useState, useMemo, useEffect } from "react"
import { API_URL_DASHBOARD } from "@/config/constant"
import useFetch from "@/customHook/useFetch"
import useDebounce from "@/customHook/useDebounce"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"

const PAGE_SIZE = 20

type TopicItem = {
  _id: string | number
  name: string
  creationDate?: string | number
}

type TagsApiResponse = {
  totalTags: number
  tagList: TopicItem[]
}

function formatDate(value: string | number | undefined): string {
  if (value == null) return "—"
  const date = typeof value === "number" ? new Date(value) : new Date(value)
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString()
}

function getVisiblePageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = []
  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, "ellipsis", totalPages)
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages)
  }
  return pages
}

const SEARCH_DEBOUNCE_MS = 300

export function Topic() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery.trim(), SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  const tagsUrl = useMemo(() => {
    const params = new URLSearchParams({
      from: String((currentPage - 1) * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      showHidden: "true",
    })
    if (debouncedSearch){
        params.set("qs", debouncedSearch)
        return `${API_URL_DASHBOARD}/tags/type-ahead?showHidden=true&${params.toString()}`
    } else {
        return `${API_URL_DASHBOARD}/tags?showHidden=true&${params.toString()}`
    }
  }, [currentPage, debouncedSearch])

  const { data, loading, error } = useFetch(tagsUrl)

  const { totalTags, tagList, totalPages, startIndex, endIndex } = useMemo(() => {
    const response = data as TagsApiResponse | null
    const total = response?.totalTags ?? 0
    const list = response?.tagList ?? []
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = (currentPage - 1) * PAGE_SIZE
    const startIndex = total === 0 ? 0 : start + 1
    const endIndex = Math.min(start + list.length, total)
    return {
      totalTags: total,
      tagList: list,
      totalPages,
      startIndex,
      endIndex,
    }
  }, [data, currentPage])

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {String(error)}</div>
  }

  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages)



  return (
    <div>
      <h1>Topics</h1>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search topics by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-3"
            aria-label="Search topics"
          />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Creation Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tagList.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No tags found
                </td>
              </tr>
            ) : (
              tagList.map((tag) => (
                <tr key={tag._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{tag._id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tag.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tag.creationDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-1">
        <p className="text-sm text-gray-600">
          Showing {startIndex}–{endIndex} of {totalTags} topics
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage > 1) setCurrentPage((p) => p - 1)
                }}
                className={
                  currentPage <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
                aria-disabled={currentPage <= 1}
              />
            </PaginationItem>
            {pageNumbers.map((page, i) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(page)
                    }}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPages) setCurrentPage((p) => p + 1)
                }}
                className={
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
                aria-disabled={currentPage >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}