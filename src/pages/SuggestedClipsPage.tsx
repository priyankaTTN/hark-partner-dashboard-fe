/**
 * Suggested Clips page per SUGGESTED_CLIP_SPEC: table (Clip Name, Harklist, Creator, Suggester, Podcast),
 * Play modal with clip details + player + Approve/Reject, Show all (admin only).
 */
import * as React from "react"
import { Link } from "react-router-dom"
import { Play, X } from "lucide-react"
import { fetchAllSuggestedClips, approveSuggestedClips, type SuggestedClipListItem } from "@/lib/api"
import { WEB_URL } from "@/config/constant"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/LoadingState"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"

function getAudioUrl(clip: SuggestedClipListItem): string | undefined {
  const pod = clip.customAttributes?.podcast
  return (pod as { s3AudioUrl?: string })?.s3AudioUrl ?? (pod as { s3audioUrl?: string })?.s3audioUrl
}

function getPodcastName(clip: SuggestedClipListItem): string {
  const pod = clip.customAttributes?.podcast
  return (pod as { podcast_name?: string })?.podcast_name ?? (pod as { name?: string })?.name ?? "—"
}

export function SuggestedClipsPage() {
  const me = useSelector((s: RootState) => s.auth.me) as { isAdmin?: boolean } | null
  const isAdmin = Boolean(me?.isAdmin)
  const [clips, setClips] = React.useState<SuggestedClipListItem[]>([])
  const [showAll, setShowAll] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [modalClip, setModalClip] = React.useState<SuggestedClipListItem | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  const loadClips = React.useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAllSuggestedClips(showAll ? { showAll: true } : undefined)
      .then((list) => setClips(Array.isArray(list) ? list : []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [showAll])

  React.useEffect(() => {
    loadClips()
  }, [loadClips])

  const handleApprove = (clip: SuggestedClipListItem) => {
    const questionId = (clip.question as { _id?: string } | undefined)?._id
    if (!questionId) return
    setActionLoading(true)
    approveSuggestedClips(
      { answerId: clip._id, questionId, status: true },
      (err) => {
        setActionLoading(false)
        if (!err) {
          setModalClip(null)
          loadClips()
        }
      }
    )
  }

  const handleReject = (clip: SuggestedClipListItem) => {
    const questionId = (clip.question as { _id?: string } | undefined)?._id
    if (!questionId) return
    setActionLoading(true)
    approveSuggestedClips(
      { answerId: clip._id, questionId, status: false },
      (err) => {
        setActionLoading(false)
        if (!err) {
          setModalClip(null)
          loadClips()
        }
      }
    )
  }

  if (loading && clips.length === 0) {
    return <LoadingState message="Loading suggested clips…" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Suggested Clips</h2>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Show all suggestions
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {clips.length === 0 ? (
        <p className="text-muted-foreground">No Clip Available</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Clip Name</th>
                <th className="px-4 py-2 text-left font-medium">Harklist</th>
                <th className="px-4 py-2 text-left font-medium">Creator</th>
                <th className="px-4 py-2 text-left font-medium">Suggester</th>
                <th className="px-4 py-2 text-left font-medium">Podcast</th>
                <th className="px-4 py-2 w-12" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {clips.map((clip) => (
                <tr key={clip._id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{clip.title ?? "—"}</td>
                  <td className="px-4 py-2">
                    {(clip.question as { _id?: string } | undefined)?._id ? (
                      <Link
                        to={`/dashboard/playlists/${(clip.question as { _id: string })._id}`}
                        className="text-primary hover:underline"
                      >
                        {(clip.question as { title?: string })?.title ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {clip.originalCreator?.uid ? (
                      <Link
                        to={`/dashboard`}
                        className="text-primary hover:underline"
                      >
                        {clip.originalCreator.name ?? clip.originalCreator.uid}
                      </Link>
                    ) : (
                      (clip.originalCreator as { name?: string })?.name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {clip.creator?.name ?? (clip.creator as { name?: string })?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {clip.href ? (
                      <a
                        href={`${WEB_URL}/${clip.href}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {getPodcastName(clip)}
                      </a>
                    ) : (
                      getPodcastName(clip)
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setModalClip(clip)}
                      aria-label="Play and review clip"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!modalClip} onOpenChange={(open) => !open && setModalClip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Clip</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setModalClip(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {modalClip && (
            <>
              <div className="space-y-2">
                <p className="font-medium">{modalClip.title ?? "—"}</p>
                <p className="text-sm text-muted-foreground">
                  Harklist: {(modalClip.question as { title?: string })?.title ?? "—"}
                </p>
                {getAudioUrl(modalClip) && (
                  <audio
                    controls
                    src={getAudioUrl(modalClip)}
                    className="w-full mt-2"
                  />
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleReject(modalClip)}
                  disabled={actionLoading}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => handleApprove(modalClip)}
                  disabled={actionLoading}
                >
                  Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
