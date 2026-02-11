import { useState, useMemo, useEffect } from "react"
import { API_URL_DASHBOARD } from "@/config/constant"
import useFetch from "@/customHook/useFetch"
import useDebounce from "@/customHook/useDebounce"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { TablePagination } from "@/components/TablePagination"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"

const PAGE_SIZE = 20

type ToneItem = {
  _id: string | number
  name: string
  creationDate?: string | number
}

type TonesApiResponse = {
  totalTones: number
  toneList: ToneItem[]
}

const SEARCH_DEBOUNCE_MS = 300

export function Tone() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery.trim(), SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  const tonesUrl = useMemo(() => {
    const params = new URLSearchParams({
      from: String((currentPage - 1) * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      showHidden: "true",
    })
    if (debouncedSearch) {
      params.set("qs", debouncedSearch)
      return `${API_URL_DASHBOARD}/tones/type-ahead?showHidden=true&${params.toString()}`
    }
    return `${API_URL_DASHBOARD}/tones?showHidden=true&${params.toString()}`
  }, [currentPage, debouncedSearch])

  const { data, loading, error } = useFetch(tonesUrl)

  const { totalTones, toneList, totalPages, startIndex, endIndex } = useMemo(() => {
    const response = data as TonesApiResponse | null
    const total = response?.totalTones ?? 0
    const list = response?.toneList ?? []
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = (currentPage - 1) * PAGE_SIZE
    const startIndex = total === 0 ? 0 : start + 1
    const endIndex = Math.min(start + list.length, total)
    return {
      totalTones: total,
      toneList: list,
      totalPages,
      startIndex,
      endIndex,
    }
  }, [data, currentPage])

  if (loading) {
    return <LoadingState message="Loading tones…" />
  }

  if (error) {
    return <ErrorState message={`Error: ${String(error)}`} />
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="search"
                placeholder="Search tones by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-3"
                aria-label="Search tones"
              />
            </div>
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
              {toneList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No tones found
                  </td>
                </tr>
              ) : (
                toneList.map((tone) => (
                  <tr key={tone._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{tone._id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tone.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tone.creationDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          startIndex={startIndex}
          endIndex={endIndex}
          total={totalTones}
          itemLabel="tones"
        />
      </div>
    </div>
  )
}
