import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  fetchAllCurationGroups,
  addCurationGroup,
  editCurationGroup,
  deleteCurationGroup,
  type CurationGroupItem,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import { Pencil, Trash2, Plus } from "lucide-react"

export function CurationGroup() {
  const navigate = useNavigate()
  const [list, setList] = useState<CurationGroupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllCurationGroups()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAddOk = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setSubmitLoading(true)
    try {
      await addCurationGroup(name)
      setNewCategoryName("")
      setShowAddModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const openEdit = (item: CurationGroupItem) => {
    setEditId(item._id)
    setEditTitle(item.name ?? "")
    setShowEditModal(true)
  }

  const handleEditOk = async () => {
    if (!editId) return
    const name = editTitle.trim()
    if (!name) return
    setSubmitLoading(true)
    try {
      await editCurationGroup(editId, name)
      setShowEditModal(false)
      setEditId(null)
      setEditTitle("")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const openDelete = (item: CurationGroupItem) => {
    setDeleteId(item._id)
    setShowDeleteModal(true)
  }

  const handleDeleteOk = async () => {
    if (!deleteId) return
    setSubmitLoading(true)
    try {
      await deleteCurationGroup(deleteId)
      setShowDeleteModal(false)
      setDeleteId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const goToClipSuggestions = (id: string) => {
    navigate(`/dashboard/suggested-clips?curationGroupId=${encodeURIComponent(id)}`)
  }

  if (loading) return <LoadingState message="Loading curation groups…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="flex flex-col pb-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Curation Groups</h3>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4 overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Id
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No curation groups found
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-100 transition-colors odd:bg-white even:bg-gray-50/70">
                    <td className="px-6 py-4 text-sm text-gray-600">{c._id}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        type="button"
                        className="cursor-pointer linkStyle text-left"
                        onClick={() => goToClipSuggestions(c._id)}
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDelete(c)}
                        className="text-gray-600 hover:text-red-600 p-1"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="add-category-name">Category Name</Label>
            <Input
              id="add-category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddOk} disabled={submitLoading || !newCategoryName.trim()}>
              {submitLoading ? "Saving…" : "Ok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-category-name">Category Name</Label>
            <Input
              id="edit-category-name"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter category name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditOk} disabled={submitLoading || !editTitle.trim()}>
              {submitLoading ? "Saving…" : "Ok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this category?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOk} disabled={submitLoading}>
              {submitLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
